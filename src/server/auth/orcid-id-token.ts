import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import type { JWTPayload } from "jose";
import { env } from "~/env";
import { orcidOidcIssuer, orcidOidcJwksUrl } from "~/server/auth/orcid-oidc-config";

export interface OrcidIdTokenClaims {
  orcid: string;
  authTime: number | null;
  upstreamAmr: string | string[] | null;
  rawPayload: JWTPayload;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getOrcidJwks(): ReturnType<typeof createRemoteJWKSet> {
  jwks ??= createRemoteJWKSet(new URL(orcidOidcJwksUrl()));
  return jwks;
}

function parseClaimsFromPayload(payload: JWTPayload): OrcidIdTokenClaims | null {
  const sub = payload.sub;
  if (typeof sub !== "string" || sub.length === 0) {
    return null;
  }

  const authTimeRaw = payload.auth_time;
  const authTime =
    typeof authTimeRaw === "number" && Number.isFinite(authTimeRaw)
      ? authTimeRaw
      : null;

  const amrRaw = payload.amr;
  let upstreamAmr: string | string[] | null = null;
  if (typeof amrRaw === "string") {
    upstreamAmr = amrRaw;
  } else if (
    Array.isArray(amrRaw) &&
    amrRaw.every((entry): entry is string => typeof entry === "string")
  ) {
    upstreamAmr = amrRaw;
  }

  return {
    orcid: sub,
    authTime,
    upstreamAmr,
    rawPayload: payload,
  };
}

/**
 * Verifies an ORCID RS256 id token against published JWKS and returns normalized claims.
 *
 * @param idToken - Raw JWT from the ORCID token response or `account.id_token`.
 * @param clientId - OAuth client id; must match the token `aud` claim.
 * @throws When signature, issuer, audience, or expiry validation fails.
 */
export async function verifyOrcidIdToken(
  idToken: string,
  clientId: string,
): Promise<OrcidIdTokenClaims> {
  const { payload } = await jwtVerify(idToken, getOrcidJwks(), {
    issuer: orcidOidcIssuer(),
    audience: clientId,
  });
  const claims = parseClaimsFromPayload(payload);
  if (!claims) {
    throw new Error("ORCID_ID_TOKEN_MISSING_SUB");
  }
  return claims;
}

/**
 * Decodes ORCID id token claims without signature verification.
 *
 * Use only immediately after Auth.js has validated the token during sign-in, or when
 * verification is intentionally skipped with `failSilent`.
 *
 * @param idToken - Raw JWT string.
 * @returns Normalized claims, or `null` when `sub` is absent or decoding fails.
 */
export function decodeOrcidIdTokenClaims(
  idToken: string,
): OrcidIdTokenClaims | null {
  try {
    const payload = decodeJwt(idToken);
    return parseClaimsFromPayload(payload);
  } catch {
    return null;
  }
}

/**
 * Resolves ORCID id token claims, preferring explicit JWKS verification when `clientId` is set.
 *
 * @param idToken - Raw JWT string.
 * @param options - `verify: true` requires `clientId` (defaults to `env.ORCID_CLIENT_ID`).
 * @returns Claims on success; `null` when verification is skipped and decode fails.
 */
export async function resolveOrcidIdTokenClaims(
  idToken: string,
  options?: { verify?: boolean; clientId?: string },
): Promise<OrcidIdTokenClaims | null> {
  const shouldVerify = options?.verify === true;
  const clientId = options?.clientId ?? env.ORCID_CLIENT_ID;
  if (shouldVerify) {
    if (!clientId) {
      return null;
    }
    try {
      return await verifyOrcidIdToken(idToken, clientId);
    } catch {
      return null;
    }
  }
  return decodeOrcidIdTokenClaims(idToken);
}
