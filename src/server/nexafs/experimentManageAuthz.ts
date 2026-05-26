import type { PrismaClient } from "~/prisma/client";
import { hasPrivilegedRole } from "~/server/auth/privileged-role";

type ExperimentManageRow = {
  createdby: string | null;
  collectedbyuserids: string[];
};

/**
 * Loads experiment ownership fields used for delete and transfer authorization.
 */
async function loadExperimentManageRow(
  db: PrismaClient,
  experimentId: string,
): Promise<ExperimentManageRow | null> {
  return db.experiments.findUnique({
    where: { id: experimentId },
    select: {
      createdby: true,
      collectedbyuserids: true,
    },
  });
}

/**
 * Returns whether `userId` may permanently remove an experiment (upload author, listed
 * collector, or privileged administrator/maintainer-equivalent role).
 */
export async function userMayDeleteExperiment(
  db: PrismaClient,
  userId: string | null,
  experimentId: string,
): Promise<boolean> {
  if (!userId) {
    return false;
  }
  if (await hasPrivilegedRole(db, userId)) {
    return true;
  }
  const experiment = await loadExperimentManageRow(db, experimentId);
  if (!experiment) {
    return false;
  }
  if (experiment.createdby === userId) {
    return true;
  }
  return experiment.collectedbyuserids.includes(userId);
}

/**
 * Returns whether `userId` may reassign experiment upload ownership (`createdby`).
 */
export async function userMayTransferExperimentOwnership(
  db: PrismaClient,
  userId: string | null,
  experimentId: string,
): Promise<boolean> {
  if (!userId) {
    return false;
  }
  const experiment = await loadExperimentManageRow(db, experimentId);
  return experiment?.createdby === userId;
}
