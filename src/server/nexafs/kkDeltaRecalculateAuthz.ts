import type { PrismaClient } from "~/prisma/client";
import { userMayEditExperiment } from "~/server/nexafs/experimentEditAuthz";

/**
 * Determines whether `userId` may trigger client-side Kramers-Kronig recomputation for an
 * experiment's spectrum rows. Delegates to {@link userMayEditExperiment}, so the answer is
 * identical to the general dataset edit gate (accepted contributors, privileged roles, legacy
 * `createdby` fallback); molecule contributors carry no dataset edit rights.
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
  return userMayEditExperiment(db, userId, experimentId);
}
