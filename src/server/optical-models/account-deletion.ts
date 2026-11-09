/**
 * Optical model handling for account deletion.
 *
 * Owns the rule for what happens to a deleted user's models: public models with at least one
 * published version are kept and detached from the account; their drafts, and all other models
 * the user owns, are deleted. Returns the tensor blob paths of deleted rows so the caller can
 * remove unreferenced blobs after its transaction commits. Does not delete the user or datasets.
 */

import type { Prisma } from "~/prisma/client";

/**
 * Detaches or deletes the models owned by `userId`.
 *
 * Kept models get `ownerUserId = null` (the `ownerOrcid` stays) and
 * `defaultForExperimentId = null` so deleting their dataset does not cascade to them. Run it in
 * the same transaction that deletes the user, before the user's datasets are deleted.
 *
 * @param tx - Interactive transaction client.
 * @param userId - Bare ORCID iD of the account being deleted.
 * @returns The storage paths of tensors that belonged to deleted rows.
 */
export async function detachOrDeleteModelsForUser(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<{ tensorPaths: string[] }> {
  const owned = await tx.opticalModel.findMany({
    where: { ownerOrcid: userId },
    select: {
      id: true,
      visibility: true,
      _count: { select: { versions: { where: { status: "published" } } } },
    },
  });
  const keepIds = owned
    .filter(
      (model) => model.visibility === "public" && model._count.versions > 0,
    )
    .map((model) => model.id);
  const keep = new Set(keepIds);
  const dropIds = owned
    .filter((model) => !keep.has(model.id))
    .map((model) => model.id);

  const tensorPaths: string[] = [];
  if (keepIds.length > 0) {
    const draftTensors = await tx.opticalModelTensor.findMany({
      where: { version: { modelId: { in: keepIds }, status: "draft" } },
      select: { storagePath: true },
    });
    tensorPaths.push(...draftTensors.map((tensor) => tensor.storagePath));
    await tx.opticalModelVersion.deleteMany({
      where: { modelId: { in: keepIds }, status: "draft" },
    });
    await tx.opticalModel.updateMany({
      where: { id: { in: keepIds } },
      data: { ownerUserId: null, defaultForExperimentId: null },
    });
  }
  if (dropIds.length > 0) {
    const tensors = await tx.opticalModelTensor.findMany({
      where: { version: { modelId: { in: dropIds } } },
      select: { storagePath: true },
    });
    tensorPaths.push(...tensors.map((tensor) => tensor.storagePath));
    await tx.opticalModel.deleteMany({ where: { id: { in: dropIds } } });
  }
  return { tensorPaths };
}
