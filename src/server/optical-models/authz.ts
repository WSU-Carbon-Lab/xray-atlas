/**
 * Edit and review rights for optical models.
 *
 * In this phase only the owner edits a model, and the people who may edit a dataset review models
 * made on it. Co-author edit rights and merge acceptance arrive with the co-signing work. Does not
 * decide visibility; see `visibility.ts`.
 */

import { TRPCError } from "@trpc/server";
import type { OpticalModel, PrismaClient } from "~/prisma/client";
import { userMayEditExperiment } from "~/server/nexafs/experimentEditAuthz";
import {
  loadVisibleModelByTag,
  type ModelViewer,
} from "~/server/optical-models/visibility";

/**
 * Whether `userId` owns the model `modelId`.
 *
 * @param db - Shared Prisma client.
 * @param userId - Authenticated user id (bare ORCID iD), or `null` when anonymous.
 * @param modelId - Model primary key.
 * @returns True only for the owner; false for anonymous callers and unknown models.
 */
export async function userMayEditModel(
  db: PrismaClient,
  userId: string | null,
  modelId: string,
): Promise<boolean> {
  if (!userId) return false;
  const row = await db.opticalModel.findUnique({
    where: { id: modelId },
    select: { ownerOrcid: true },
  });
  return row?.ownerOrcid === userId;
}

/**
 * Whether `userId` may approve or reject models made on the dataset `experimentId`.
 *
 * Delegates to the dataset edit gate: claimed owner or collector, administrator, or maintainer.
 *
 * @param db - Shared Prisma client.
 * @param userId - Authenticated user id (bare ORCID iD), or `null` when anonymous.
 * @param experimentId - Dataset (experiment) primary key.
 * @returns True when the user may review models on that dataset.
 */
export async function userMayReviewModelOnDataset(
  db: PrismaClient,
  userId: string | null,
  experimentId: string,
): Promise<boolean> {
  return userMayEditExperiment(db, userId, experimentId);
}

/**
 * Loads a model by tag for an edit, failing unless `userId` owns it.
 *
 * @param db - Shared Prisma client.
 * @param userId - Authenticated user id (bare ORCID iD).
 * @param tag - Tag from a path or query, any case.
 * @returns The model row.
 * @throws TRPCError `NOT_FOUND` when the model is not visible to the caller, `FORBIDDEN` when it
 * is visible but not owned by the caller.
 */
export async function loadOwnedModelByTag(
  db: PrismaClient,
  userId: string,
  tag: string,
): Promise<OpticalModel> {
  const viewer: ModelViewer = { userId };
  const model = await loadVisibleModelByTag(db, viewer, tag);
  if (model.ownerOrcid !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the model owner can change this model.",
    });
  }
  return model;
}
