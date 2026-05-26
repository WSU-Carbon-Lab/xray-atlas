import type { PrismaClient } from "~/prisma/client";

type PasskeyDb = Pick<PrismaClient, "authenticator" | "user">;

/**
 * Counts non-revoked WebAuthn credentials for the user.
 */
export async function countActivePasskeys(
  db: PasskeyDb,
  userId: string,
): Promise<number> {
  return db.authenticator.count({
    where: { userId, revokedAt: null },
  });
}

/**
 * Returns whether the user has at least one active (non-revoked) passkey enrolled.
 */
export async function userHasActivePasskey(
  db: PasskeyDb,
  userId: string,
): Promise<boolean> {
  const count = await countActivePasskeys(db, userId);
  return count > 0;
}

/**
 * Sets `user.mfaEnforcedAt` when the user completes passkey enrollment (idempotent).
 */
export async function markPasskeyEnrollmentComplete(
  db: PasskeyDb,
  userId: string,
): Promise<void> {
  await db.user.updateMany({
    where: { id: userId, mfaEnforcedAt: null },
    data: { mfaEnforcedAt: new Date() },
  });
}
