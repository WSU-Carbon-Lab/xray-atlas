import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "~/prisma/client";
import {
  AAL2,
  AAL3,
  isPasskeyEstablishedAal,
  meetsAalRequirement,
  type AssertedAal,
} from "~/server/auth/aal";
import {
  getPasskeyEnrollmentStatus,
  requiresAal3ForUser,
  type PasskeyEnrollmentStatus,
} from "~/server/auth/passkey-policy";
import {
  getSessionAssuranceForRequest,
  WEBAUTHN_AUTHENTICATOR,
  type SessionAssuranceSnapshot,
} from "~/server/auth/session-assurance";

export type SessionWriteAssuranceAppCode =
  | "SESSION_AAL_REQUIRED"
  | "SESSION_AAL3_REQUIRED";

export class SessionAalRequiredError extends Error {
  readonly appCode: SessionWriteAssuranceAppCode;

  constructor(message: string, appCode: SessionWriteAssuranceAppCode) {
    super(message);
    this.name = "SessionAalRequiredError";
    this.appCode = appCode;
  }
}

export interface SessionWriteAssuranceEvaluation {
  requiredAal: AssertedAal;
  assertedAal: string | null;
  enrolled: boolean;
  satisfied: boolean;
}

type MfaAccessDb = Pick<PrismaClient, "authenticator" | "user" | "userAppRole"> &
  Pick<PrismaClient, "session" | "sessionAssurance">;

/**
 * Returns the minimum session AAL required for privileged writes for this user.
 */
export async function requiredAalForUser(
  db: Pick<PrismaClient, "userAppRole">,
  userId: string,
): Promise<AssertedAal> {
  const requiresAal3 = await requiresAal3ForUser(db, userId);
  return requiresAal3 ? AAL3 : AAL2;
}

function isPasskeyEstablishedSession(
  assurance: SessionAssuranceSnapshot | null,
): boolean {
  if (!assurance) {
    return false;
  }
  if (isPasskeyEstablishedAal(assurance.assertedAal)) {
    return true;
  }
  return assurance.authenticator === WEBAUTHN_AUTHENTICATOR;
}

/**
 * Returns whether the active session assurance meets `requiredAal` for privileged writes.
 */
export function sessionMeetsRequiredAal(
  requiredAal: AssertedAal,
  assurance: SessionAssuranceSnapshot | null,
): boolean {
  if (!assurance) {
    return false;
  }
  if (!meetsAalRequirement(assurance.assertedAal, requiredAal)) {
    return false;
  }
  if (requiredAal === AAL2) {
    return isPasskeyEstablishedSession(assurance);
  }
  return true;
}

function privilegedWriteSatisfied(
  status: PasskeyEnrollmentStatus,
  requiredAal: AssertedAal,
  assurance: SessionAssuranceSnapshot | null,
): boolean {
  if (!status.enrolled) {
    return false;
  }
  if (requiredAal === AAL3 && !status.hasAal3EligiblePasskey) {
    return false;
  }
  return sessionMeetsRequiredAal(requiredAal, assurance);
}

/**
 * Evaluates passkey enrollment and current-session AAL against privileged-write policy.
 */
export async function evaluateSessionWriteAssurance(
  db: MfaAccessDb,
  userId: string,
  req: Request | undefined,
): Promise<SessionWriteAssuranceEvaluation> {
  const [status, requiredAal, assurance] = await Promise.all([
    getPasskeyEnrollmentStatus(db, userId),
    requiredAalForUser(db, userId),
    getSessionAssuranceForRequest(db, req),
  ]);

  return {
    requiredAal,
    assertedAal: assurance?.assertedAal ?? null,
    enrolled: status.enrolled,
    satisfied: privilegedWriteSatisfied(status, requiredAal, assurance),
  };
}

/**
 * Returns whether the user may open privileged admin write surfaces on this session.
 */
export async function userMayAccessAdminWrites(
  db: MfaAccessDb,
  userId: string,
  req: Request | undefined,
): Promise<boolean> {
  const evaluation = await evaluateSessionWriteAssurance(db, userId, req);
  return evaluation.satisfied;
}

function forbiddenMessageForPrivilegedWrite(
  status: PasskeyEnrollmentStatus,
  requiredAal: AssertedAal,
): { message: string; appCode: SessionWriteAssuranceAppCode } {
  if (!status.enrolled) {
    return {
      message:
        "Register a passkey from your profile before using administration tools or performing destructive actions.",
      appCode: "SESSION_AAL_REQUIRED",
    };
  }
  if (requiredAal === AAL3 && !status.hasAal3EligiblePasskey) {
    return {
      message:
        "Administrator access requires a hardware security key passkey. Enroll one from your profile, then sign in with that passkey.",
      appCode: "SESSION_AAL3_REQUIRED",
    };
  }
  if (requiredAal === AAL3) {
    return {
      message:
        "Sign in with your hardware security key passkey to confirm this administrator action.",
      appCode: "SESSION_AAL3_REQUIRED",
    };
  }
  return {
    message:
      "Sign in with a passkey to confirm this action. ORCID-only sessions cannot delete or transfer data.",
    appCode: "SESSION_AAL_REQUIRED",
  };
}

/**
 * Throws FORBIDDEN when the active session does not meet privileged-write AAL policy.
 */
export async function assertSessionAalForPrivilegedWrites(
  db: MfaAccessDb,
  userId: string,
  req: Request | undefined,
): Promise<void> {
  const [status, requiredAal, assurance] = await Promise.all([
    getPasskeyEnrollmentStatus(db, userId),
    requiredAalForUser(db, userId),
    getSessionAssuranceForRequest(db, req),
  ]);

  if (privilegedWriteSatisfied(status, requiredAal, assurance)) {
    return;
  }

  const { message, appCode } = forbiddenMessageForPrivilegedWrite(
    status,
    requiredAal,
  );

  throw new TRPCError({
    code: "FORBIDDEN",
    message,
    cause: new SessionAalRequiredError(message, appCode),
  });
}

/**
 * Returns whether the user has completed passkey enrollment (at least one active credential).
 *
 * Contribute creates and updates require enrollment only; session AAL is not re-checked on every
 * contribute mutation.
 */
export async function userMayAccessContributeWrites(
  db: MfaAccessDb,
  userId: string,
): Promise<boolean> {
  const status = await getPasskeyEnrollmentStatus(db, userId);
  return status.enrolled;
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
 * Throws FORBIDDEN when admin or other privileged writes lack enrollment or session AAL.
 */
export async function assertPasskeyEnrolledForAdmin(
  db: MfaAccessDb,
  userId: string,
  req: Request | undefined,
): Promise<void> {
  await assertSessionAalForPrivilegedWrites(db, userId, req);
}
