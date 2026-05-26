import { Prisma, type PrismaClient } from "~/prisma/client";
import { resolveOrcidIdTokenClaims } from "~/server/auth/orcid-id-token";
import {
  assertedAalForAuthenticator,
  type AssertedAal,
} from "~/server/auth/aal";
import { getSessionTokenFromRequest } from "~/server/auth/session-token";

const ORCID_AUTHENTICATOR = "orcid_oidc";
export const WEBAUTHN_AUTHENTICATOR = "webauthn";
export const PLACEHOLDER_ASSERTED_AAL: AssertedAal = "aal1";

export interface SessionAssuranceSnapshot {
  sessionId: string;
  authenticator: string | null;
  assertedAal: string | null;
  passkeyCredentialId: string | null;
  lastVerifiedAt: Date;
}

type SessionAssuranceDb = Pick<PrismaClient, "account" | "sessionAssurance">;

function amrJsonFromClaim(
  upstreamAmr: string | string[] | null,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (upstreamAmr === null) {
    return Prisma.DbNull;
  }
  return upstreamAmr;
}

function establishedAtFromAuthTime(authTime: number | null): Date {
  if (authTime !== null) {
    return new Date(authTime * 1000);
  }
  return new Date();
}

/**
 * Creates or updates `session_assurance` for a database session established via ORCID OIDC.
 *
 * Reads `account.id_token` when present; does not throw when the token is missing or unparsable.
 *
 * @param db - Prisma client.
 * @param params - Session row id and ORCID user id.
 */
export async function upsertOrcidSessionAssurance(
  db: SessionAssuranceDb,
  params: { sessionId: string; userId: string },
): Promise<void> {
  const account = await db.account.findFirst({
    where: { userId: params.userId, provider: "orcid" },
    select: { id_token: true },
    orderBy: { id: "desc" },
  });

  const idToken = account?.id_token;
  const claims =
    idToken !== null && idToken !== undefined
      ? await resolveOrcidIdTokenClaims(idToken)
      : null;

  const establishedAt = establishedAtFromAuthTime(claims?.authTime ?? null);
  const amrFromUpstream =
    claims?.upstreamAmr !== undefined && claims?.upstreamAmr !== null
      ? amrJsonFromClaim(claims.upstreamAmr)
      : Prisma.DbNull;

  await db.sessionAssurance.upsert({
    where: { sessionId: params.sessionId },
    create: {
      sessionId: params.sessionId,
      authenticator: ORCID_AUTHENTICATOR,
      assertedAal: PLACEHOLDER_ASSERTED_AAL,
      amrFromUpstream,
      passkeyCredentialId: null,
      establishedAt,
      lastVerifiedAt: establishedAt,
    },
    update: {
      authenticator: ORCID_AUTHENTICATOR,
      assertedAal: PLACEHOLDER_ASSERTED_AAL,
      amrFromUpstream,
      lastVerifiedAt: establishedAt,
    },
  });
}

/**
 * Creates or updates `session_assurance` after a WebAuthn passkey sign-in or registration session.
 *
 * ORCID-only sessions remain `aal1` until this path runs.
 */
export async function upsertWebAuthnSessionAssurance(
  db: SessionAssuranceDb,
  params: {
    sessionId: string;
    credentialId: string;
    assertedAal: AssertedAal;
  },
): Promise<void> {
  const now = new Date();
  await db.sessionAssurance.upsert({
    where: { sessionId: params.sessionId },
    create: {
      sessionId: params.sessionId,
      authenticator: WEBAUTHN_AUTHENTICATOR,
      assertedAal: params.assertedAal,
      amrFromUpstream: Prisma.DbNull,
      passkeyCredentialId: params.credentialId,
      establishedAt: now,
      lastVerifiedAt: now,
    },
    update: {
      authenticator: WEBAUTHN_AUTHENTICATOR,
      assertedAal: params.assertedAal,
      passkeyCredentialId: params.credentialId,
      lastVerifiedAt: now,
    },
  });
}

type SessionLookupDb = Pick<
  PrismaClient,
  "session" | "sessionAssurance" | "authenticator"
>;

/**
 * Resolves assurance metadata for the active database session tied to the request cookie.
 */
export async function getSessionAssuranceForRequest(
  db: SessionLookupDb,
  req: Request | undefined,
): Promise<SessionAssuranceSnapshot | null> {
  const sessionToken = getSessionTokenFromRequest(req);
  if (!sessionToken) {
    return null;
  }
  const session = await db.session.findUnique({
    where: { sessionToken },
    select: {
      id: true,
      expires: true,
      sessionAssurance: {
        select: {
          authenticator: true,
          assertedAal: true,
          passkeyCredentialId: true,
          lastVerifiedAt: true,
        },
      },
    },
  });
  if (!session || session.expires <= new Date()) {
    return null;
  }
  const assurance = session.sessionAssurance;
  if (!assurance) {
    return {
      sessionId: session.id,
      authenticator: null,
      assertedAal: null,
      passkeyCredentialId: null,
      lastVerifiedAt: new Date(0),
    };
  }
  return {
    sessionId: session.id,
    authenticator: assurance.authenticator,
    assertedAal: assurance.assertedAal,
    passkeyCredentialId: assurance.passkeyCredentialId,
    lastVerifiedAt: assurance.lastVerifiedAt,
  };
}

/**
 * Loads an active authenticator row and returns the AAL level to assert for that credential.
 */
export async function resolveAssertedAalForCredential(
  db: Pick<PrismaClient, "authenticator">,
  credentialId: string,
): Promise<AssertedAal> {
  const row = await db.authenticator.findFirst({
    where: { credentialID: credentialId, revokedAt: null },
    select: {
      aaguid: true,
      attestationFormat: true,
      credentialDeviceType: true,
    },
  });
  if (!row) {
    return "aal2";
  }
  return assertedAalForAuthenticator(row);
}
