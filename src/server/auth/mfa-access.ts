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

/**
 * Session assurance relative to destructive self-service writes and admin writes.
 *
 * Destructive contribution actions (delete/transfer) always require AAL2. Admin console
 * writes require AAL3 when the user holds Labs or user-administration capabilities.
 */
export interface SessionWriteAssuranceEvaluation {
  requiredAal: AssertedAal;
  assertedAal: string | null;
  enrolled: boolean;
  satisfied: boolean;
  adminRequiredAal: AssertedAal;
  adminSatisfied: boolean;
}

type MfaAccessDb = Pick<PrismaClient, "authenticator" | "user" | "userAppRole"> &
  Pick<PrismaClient, "session" | "sessionAssurance">;

/**
 * Returns the minimum session AAL for destructive self-service writes (delete, transfer,
 * revoke passkey). Always AAL2: any enrolled passkey session, never role-escalated to AAL3.
 */
export function requiredAalForDestructiveWrites(): AssertedAal {
  return AAL2;
}

/**
 * Returns the minimum session AAL for administrator / Labs write surfaces for this user.
 */
export async function requiredAalForAdminWrites(
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
 * Returns whether the active session assurance meets `requiredAal` for write gates.
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

function writeAssuranceSatisfied(
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
 * Evaluates passkey enrollment and current-session AAL for destructive and admin write policies.
 */
export async function evaluateSessionWriteAssurance(
  db: MfaAccessDb,
  userId: string,
  req: Request | undefined,
): Promise<SessionWriteAssuranceEvaluation> {
  const [status, adminRequiredAal, assurance] = await Promise.all([
    getPasskeyEnrollmentStatus(db, userId),
    requiredAalForAdminWrites(db, userId),
    getSessionAssuranceForRequest(db, req),
  ]);
  const requiredAal = requiredAalForDestructiveWrites();

  return {
    requiredAal,
    assertedAal: assurance?.assertedAal ?? null,
    enrolled: status.enrolled,
    satisfied: writeAssuranceSatisfied(status, requiredAal, assurance),
    adminRequiredAal,
    adminSatisfied: writeAssuranceSatisfied(status, adminRequiredAal, assurance),
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
  return evaluation.adminSatisfied;
}

/**
 * Builds the FORBIDDEN message and app code for a failed write-assurance gate.
 */
export function sessionWriteAssuranceFailure(
  status: PasskeyEnrollmentStatus,
  requiredAal: AssertedAal,
  kind: "destructive" | "admin",
): { message: string; appCode: SessionWriteAssuranceAppCode } {
  if (!status.enrolled) {
    return {
      message:
        kind === "admin"
          ? "Register a passkey from your profile before using administration tools."
          : "Register a passkey from your profile before deleting or transferring data.",
      appCode: "SESSION_AAL_REQUIRED",
    };
  }
  if (requiredAal === AAL3 && !status.hasAal3EligiblePasskey) {
    return {
      message:
        "Administrator and Labs access requires a hardware security key passkey. Enroll one from your profile, then sign in with that passkey.",
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
  if (kind === "admin") {
    return {
      message:
        "Sign in with a passkey to confirm this administrator action. ORCID-only sessions cannot use administration tools.",
      appCode: "SESSION_AAL_REQUIRED",
    };
  }
  return {
    message:
      "Sign in with a passkey to confirm this action. ORCID-only sessions cannot delete or transfer data.",
    appCode: "SESSION_AAL_REQUIRED",
  };
}

async function assertSessionAalForWrites(
  db: MfaAccessDb,
  userId: string,
  req: Request | undefined,
  kind: "destructive" | "admin",
): Promise<void> {
  const statusPromise = getPasskeyEnrollmentStatus(db, userId);
  const assurancePromise = getSessionAssuranceForRequest(db, req);
  const requiredAalPromise =
    kind === "admin"
      ? requiredAalForAdminWrites(db, userId)
      : Promise.resolve(requiredAalForDestructiveWrites());

  const [status, assurance, requiredAal] = await Promise.all([
    statusPromise,
    assurancePromise,
    requiredAalPromise,
  ]);

  if (writeAssuranceSatisfied(status, requiredAal, assurance)) {
    return;
  }

  const { message, appCode } = sessionWriteAssuranceFailure(
    status,
    requiredAal,
    kind,
  );

  throw new TRPCError({
    code: "FORBIDDEN",
    message,
    cause: new SessionAalRequiredError(message, appCode),
  });
}

/**
 * Throws FORBIDDEN when the active session does not meet AAL2 for destructive self-service writes.
 */
export async function assertSessionAalForDestructiveWrites(
  db: MfaAccessDb,
  userId: string,
  req: Request | undefined,
): Promise<void> {
  await assertSessionAalForWrites(db, userId, req, "destructive");
}

/**
 * Throws FORBIDDEN when the active session does not meet admin write AAL policy (AAL3 when required).
 */
export async function assertSessionAalForAdminWrites(
  db: MfaAccessDb,
  userId: string,
  req: Request | undefined,
): Promise<void> {
  await assertSessionAalForWrites(db, userId, req, "admin");
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
 * Throws FORBIDDEN when admin writes lack enrollment or session AAL.
 */
export async function assertPasskeyEnrolledForAdmin(
  db: MfaAccessDb,
  userId: string,
  req: Request | undefined,
): Promise<void> {
  await assertSessionAalForAdminWrites(db, userId, req);
}
