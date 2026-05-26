import type { PrismaClient } from "~/prisma/client";
import { hasPrivilegedRole } from "~/server/auth/privileged-role";
import { findMoleculeContributor } from "~/server/db/engagement-queries";

/**
 * Determines whether `userId` may trigger client-side Kramers–Kronig recomputation for an
 * experiment’s spectrum rows (upload author, collected-by attribution, molecule contributor,
 * or privileged administrator/maintainer-equivalent roles).
 *
 * @param db Shared Prisma client.
 * @param userId Authenticated user id, or null when unauthenticated.
 * @param experimentId Target experiment primary key.
 * @returns True when the user is allowed to run the browser pipeline and persist `delta`.
 */
export async function userMayRecalculateKkDelta(
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

  const experiment = await db.experiments.findUnique({
    where: { id: experimentId },
    select: {
      createdby: true,
      collectedbyuserids: true,
      sampleid: true,
    },
  });

  if (!experiment) {
    return false;
  }

  if (experiment.createdby === userId) {
    return true;
  }

  if (experiment.collectedbyuserids.includes(userId)) {
    return true;
  }

  const sample = await db.samples.findUnique({
    where: { id: experiment.sampleid },
    select: { moleculeid: true },
  });

  if (!sample) {
    return false;
  }

  const contributor = await findMoleculeContributor(
    db,
    sample.moleculeid,
    userId,
  );

  return contributor != null;
}
