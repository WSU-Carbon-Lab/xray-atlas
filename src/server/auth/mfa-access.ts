import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "~/prisma/client";
import { AAL3, meetsAalRequirement } from "~/server/auth/aal";
import {
  getPasskeyEnrollmentStatus,
  requiresAal3ForUser,
} from "~/server/auth/passkey-policy";
import { getSessionAssuranceForRequest } from "~/server/auth/session-assurance";

type MfaAccessDb = Pick<PrismaClient, "authenticator" | "user" | "userAppRole"> &
  Pick<PrismaClient, "session" | "sessionAssurance">;

/**
 * Returns whether the user has completed passkey enrollment (at least one active credential).
 *
 * v1 allows ORCID-established sessions for write paths after enrollment; session AAL is not
 * re-checked on every contribute mutation. Privileged admin surfaces additionally require
 * AAL3 session assurance or an enrolled hardware passkey.
 */
export async function userMayAccessContributeWrites(
  db: MfaAccessDb,
  userId: string,
): Promise<boolean> {
  const status = await getPasskeyEnrollmentStatus(db, userId);
  return status.enrolled;
}

/**
 * Returns whether the user may open privileged admin write surfaces.
 */
export async function userMayAccessAdminWrites(
  db: MfaAccessDb,
  userId: string,
  req: Request | undefined,
): Promise<boolean> {
  const status = await getPasskeyEnrollmentStatus(db, userId);
  if (!status.enrolled) {
    return false;
  }
  const requiresAal3 = await requiresAal3ForUser(db, userId);
  if (!requiresAal3) {
    return true;
  }
  if (status.hasAal3EligiblePasskey) {
    const assurance = await getSessionAssuranceForRequest(db, req);
    if (assurance && meetsAalRequirement(assurance.assertedAal, AAL3)) {
      return true;
    }
    return status.hasAal3EligiblePasskey;
  }
  return false;
}

/**
 * Throws FORBIDDEN when contribute write access requires passkey enrollment.
 */
export async function assertPasskeyEnrolledForContribute(
  db: MfaAccessDb,
  userId: string,
): Promise<void> {
  const allowed = await userMayAccessContributeWrites(db, userId);
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Register a passkey from your profile before contributing data. Browse and read-only access remain available with ORCID sign-in.",
    });
  }
}

/**
 * Throws FORBIDDEN when admin write access requires passkey enrollment or AAL3 assurance.
 */
export async function assertPasskeyEnrolledForAdmin(
  db: MfaAccessDb,
  userId: string,
  req: Request | undefined,
): Promise<void> {
  const allowed = await userMayAccessAdminWrites(db, userId, req);
  if (!allowed) {
    const requiresAal3 = await requiresAal3ForUser(db, userId);
    throw new TRPCError({
      code: "FORBIDDEN",
      message: requiresAal3
        ? "Administrator access requires a hardware security key passkey. Enroll one from your profile, then sign in with that passkey."
        : "Register a passkey from your profile before using administration tools.",
    });
  }
}
