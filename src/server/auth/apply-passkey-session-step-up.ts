import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "~/prisma/client";
import {
  evaluateSessionWriteAssurance,
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
 * `createSession` does not run (session step-up for privileged writes).
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
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: pendingPasskey
        ? "Passkey verified but this session still lacks the required assurance level. Try a hardware security key if your role requires one."
        : "Complete passkey sign-in, then confirm again while this page is open.",
    });
  }

  return {
    appliedPendingAssurance: pendingPasskey !== null,
    evaluation,
  };
}
