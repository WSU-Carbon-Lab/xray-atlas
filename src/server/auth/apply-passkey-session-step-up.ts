import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "~/prisma/client";
import {
  evaluateSessionWriteAssurance,
  SessionAalRequiredError,
  type SessionWriteAssuranceEvaluation,
} from "~/server/auth/mfa-access";
import { consumePendingPasskeyAssurance } from "~/server/auth/passkey-ceremony-bridge";
import { getSessionTokenFromRequest } from "~/server/auth/session-token";
import { upsertWebAuthnSessionAssurance } from "~/server/auth/session-assurance";

export interface ApplyPasskeySessionStepUpResult {
  appliedPendingAssurance: boolean;
  evaluation: SessionWriteAssuranceEvaluation;
}

/**
 * Consumes pending WebAuthn assurance from the ceremony cookie and attaches it to the
 * active database session for the incoming request.
 *
 * Use after Auth.js passkey authentication when the user is already signed in and
 * `createSession` does not run (session step-up for destructive self-service writes
 * and administrator / Labs write gates).
 */
export async function applyPasskeySessionStepUpForRequest(
  db: PrismaClient,
  userId: string,
  req: Request | undefined,
): Promise<ApplyPasskeySessionStepUpResult> {
  const sessionToken = getSessionTokenFromRequest(req);
  if (!sessionToken) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sign in before confirming passkey step-up.",
    });
  }

  const session = await db.session.findUnique({
    where: { sessionToken },
    select: { id: true, userId: true, expires: true },
  });

  if (!session || session.expires <= new Date()) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Your session expired. Sign in again, then retry passkey confirmation.",
    });
  }

  if (session.userId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Passkey step-up does not match the active session user.",
    });
  }

  const pendingPasskey = await consumePendingPasskeyAssurance();
  if (pendingPasskey) {
    await upsertWebAuthnSessionAssurance(db, {
      sessionId: session.id,
      credentialId: pendingPasskey.credentialId,
      assertedAal: pendingPasskey.assertedAal,
    });
  }

  const evaluation = await evaluateSessionWriteAssurance(db, userId, req);
  if (!evaluation.satisfied) {
    const detail = !pendingPasskey
      ? "Complete passkey sign-in, then confirm again while this page is open."
      : !evaluation.enrolled
        ? "Register a passkey from your profile before deleting or transferring data."
        : "Passkey verified but this session still lacks passkey assurance for destructive actions. Try again with an enrolled passkey.";
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: detail,
      cause: new SessionAalRequiredError(detail, "SESSION_AAL_REQUIRED"),
    });
  }

  return {
    appliedPendingAssurance: pendingPasskey !== null,
    evaluation,
  };
}
