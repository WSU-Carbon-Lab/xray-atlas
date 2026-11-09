/**
 * Publishing, public-ancestor enforcement, and deletion of unpublished optical models.
 *
 * Owns turning a draft into an immutable numbered version with a content checksum and an author
 * snapshot, the rule that a model may be public only when every ancestor model is public, and
 * deleting models that never published. Does not edit draft content (see `lifecycle.ts`) and does
 * not delete storage blobs; callers remove the blobs for the paths returned by deletion.
 */

import { TRPCError } from "@trpc/server";
import { Prisma } from "~/prisma/client";
import type { PrismaClient } from "~/prisma/client";
import { formatDatasetVersion } from "~/server/nexafs/dataset-versioning";
import { loadOwnedModelByTag } from "~/server/optical-models/authz";
import {
  lockModelRow,
  type ModelDb,
} from "~/server/optical-models/persist-helpers";
import {
  computeVersionChecksum,
  peakRowToJson,
} from "~/server/optical-models/version-checksum";

/** Input of {@link publishDraft} and {@link deleteModelIfUnpublished}. */
export interface OwnedModelActionInput {
  /** Authenticated user id (bare ORCID iD); must own the model. */
  actorUserId: string;
  /** Tag of the model. */
  tag: string;
}

/**
 * Publishes the model's draft as the next immutable version.
 *
 * The version number is one more than the highest published number. The checksum covers
 * normalization, peaks in order, dataset links with pins, and the tensor digest. The author list
 * is copied into `authorsSnapshot` with each author's signature state. No new draft is opened.
 * The status change is conditional on the version still being a draft, so two simultaneous
 * publishes yield one success and one `CONFLICT`.
 *
 * @param db - Shared Prisma client.
 * @param input - The owner and the model tag.
 * @returns The new version number and its checksum.
 * @throws TRPCError `NOT_FOUND` or `FORBIDDEN` from the owner gate, `CONFLICT` when there is no
 * draft or a concurrent publish won, `BAD_REQUEST` when the draft links no dataset or has no
 * normalization, peaks, or tensor.
 */
export async function publishDraft(
  db: PrismaClient,
  input: OwnedModelActionInput,
): Promise<{ versionNumber: number; checksum: string }> {
  const model = await loadOwnedModelByTag(db, input.actorUserId, input.tag);
  try {
    return await db.$transaction(async (tx) => {
      await lockModelRow(tx, model.id);
      const draft = await tx.opticalModelVersion.findFirst({
        where: { modelId: model.id, status: "draft" },
        include: {
          datasets: true,
          peaks: { orderBy: { ordinal: "asc" } },
          tensor: true,
        },
      });
      if (!draft) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "There is no draft to publish.",
        });
      }
      if (draft.datasets.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A model must link at least one dataset.",
        });
      }
      if (
        draft.normalization === null &&
        draft.peaks.length === 0 &&
        draft.tensor === null
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A model needs a normalization, peaks, or a tensor.",
        });
      }

      const latest = await tx.opticalModelVersion.aggregate({
        where: { modelId: model.id, status: "published" },
        _max: { versionNumber: true },
      });
      const versionNumber = (latest._max.versionNumber ?? 0) + 1;

      const authors = await tx.opticalModelAuthor.findMany({
        where: { modelId: model.id },
        include: { user: { select: { name: true } } },
        orderBy: [{ role: "asc" }, { orcid: "asc" }],
      });
      const authorsSnapshot = authors.map((author) => ({
        orcid: author.orcid,
        name: author.user?.name ?? null,
        role: author.role,
        signed: author.signature === "signed",
      }));

      const checksum = computeVersionChecksum({
        normalization: draft.normalization as Prisma.InputJsonValue | null,
        peaks: draft.peaks.map(peakRowToJson),
        datasets: draft.datasets.map((dataset) => ({
          experimentId: dataset.experimentId,
          pinned: formatDatasetVersion({
            major: dataset.pinnedMajor,
            minor: dataset.pinnedMinor,
            patch: dataset.pinnedPatch,
          }),
          role: dataset.role,
        })),
        tensorSha256: draft.tensor?.sha256 ?? null,
      });

      const updated = await tx.opticalModelVersion.updateMany({
        where: { id: draft.id, status: "draft" },
        data: {
          status: "published",
          versionNumber,
          checksum,
          publishedAt: new Date(),
          authorsSnapshot,
        },
      });
      if (updated.count !== 1) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "The draft was published at the same time.",
        });
      }
      return { versionNumber, checksum };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "The model was published at the same time; retry.",
      });
    }
    throw error;
  }
}

/**
 * Rejects making a model public while any ancestor model is not public.
 *
 * Walks every fork and merge link upward from all versions of `modelId`, ignoring the model's own
 * versions, and fails when any ancestor model has visibility other than `public`. Call it inside
 * the same transaction that holds the model lock and sets the visibility.
 *
 * @param db - Prisma client or transaction client.
 * @param modelId - Model that is about to become public.
 * @throws TRPCError `BAD_REQUEST` with message `ANCESTOR_NOT_PUBLIC` when an ancestor is not public.
 */
export async function assertModelMayBePublic(
  db: ModelDb,
  modelId: string,
): Promise<void> {
  const own = await db.opticalModelVersion.findMany({
    where: { modelId },
    select: { id: true },
  });
  const ownIds = new Set(own.map((version) => version.id));
  const seen = new Set<string>(ownIds);
  const ancestorIds: string[] = [];
  let frontier = [...ownIds];
  while (frontier.length > 0) {
    const links = await db.opticalModelVersionParent.findMany({
      where: { versionId: { in: frontier } },
      select: { parentVersionId: true },
    });
    const next: string[] = [];
    for (const link of links) {
      if (seen.has(link.parentVersionId)) continue;
      seen.add(link.parentVersionId);
      ancestorIds.push(link.parentVersionId);
      next.push(link.parentVersionId);
    }
    frontier = next;
  }
  if (ancestorIds.length === 0) return;
  const blocking = await db.opticalModel.count({
    where: {
      visibility: { not: "public" },
      versions: { some: { id: { in: ancestorIds } } },
    },
  });
  if (blocking > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "ANCESTOR_NOT_PUBLIC",
    });
  }
}

/**
 * Deletes a model that has no published version.
 *
 * Child rows cascade. The tensor storage paths of the deleted model are returned so the caller can
 * remove blobs that no other tensor row references.
 *
 * @param db - Shared Prisma client.
 * @param input - The owner and the model tag.
 * @returns The storage paths of the tensors that belonged to the deleted model.
 * @throws TRPCError `NOT_FOUND` or `FORBIDDEN` from the owner gate, `CONFLICT` when any version
 * has been published.
 */
export async function deleteModelIfUnpublished(
  db: PrismaClient,
  input: OwnedModelActionInput,
): Promise<{ tensorPaths: string[] }> {
  const model = await loadOwnedModelByTag(db, input.actorUserId, input.tag);
  return db.$transaction(async (tx) => {
    await lockModelRow(tx, model.id);
    const published = await tx.opticalModelVersion.count({
      where: { modelId: model.id, status: "published" },
    });
    if (published > 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A model with a published version cannot be deleted.",
      });
    }
    const tensors = await tx.opticalModelTensor.findMany({
      where: { version: { modelId: model.id } },
      select: { storagePath: true },
    });
    await tx.opticalModel.delete({ where: { id: model.id } });
    return { tensorPaths: tensors.map((tensor) => tensor.storagePath) };
  });
}
