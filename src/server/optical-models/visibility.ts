/**
 * Per-viewer visibility of optical models.
 *
 * Owns the Prisma filter that decides which models a viewer may see and the tag loader that hides
 * invisible models behind `NOT_FOUND`. A model is visible when it is `public`, when the viewer owns
 * it, or when it is `shared` and the viewer holds a share row. A `private` model is visible only
 * to its owner, even if stale share rows remain. Does not decide edit rights; see `authz.ts`.
 */

import { TRPCError } from "@trpc/server";
import type { OpticalModel, Prisma, PrismaClient } from "~/prisma/client";
import { normalizeOpticalModelTag } from "~/lib/optical-models/tag";

/** Identity of the caller reading models; `userId` is a bare ORCID iD or `null` when anonymous. */
export interface ModelViewer {
  userId: string | null;
}

/**
 * Prisma filter matching exactly the models `viewer` may see.
 *
 * Anonymous viewers match `public` models only. Signed-in viewers also match models they own and
 * `shared` models with a share row for their ORCID.
 *
 * @param viewer - The caller reading models.
 * @returns A filter to combine with other conditions using `AND`.
 */
export function visibleModelWhere(
  viewer: ModelViewer,
): Prisma.OpticalModelWhereInput {
  if (!viewer.userId) {
    return { visibility: "public" };
  }
  return {
    OR: [
      { visibility: "public" },
      { ownerOrcid: viewer.userId },
      {
        visibility: "shared",
        shares: { some: { granteeOrcid: viewer.userId } },
      },
    ],
  };
}

/**
 * Loads one model by tag when `viewer` may see it.
 *
 * Unknown tags, malformed tags, and invisible models all fail identically so that existence does
 * not leak.
 *
 * @param db - Shared Prisma client.
 * @param viewer - The caller reading the model.
 * @param tag - Tag from a path or query, any case.
 * @returns The model row.
 * @throws TRPCError `NOT_FOUND` when the tag is invalid, unknown, or not visible to `viewer`.
 */
export async function loadVisibleModelByTag(
  db: PrismaClient,
  viewer: ModelViewer,
  tag: string,
): Promise<OpticalModel> {
  const normalized = normalizeOpticalModelTag(tag);
  if (!normalized) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Model not found." });
  }
  const model = await db.opticalModel.findFirst({
    where: { AND: [{ tag: normalized }, visibleModelWhere(viewer)] },
  });
  if (!model) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Model not found." });
  }
  return model;
}
