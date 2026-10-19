/**
 * Scope vocabulary and bearer resolution for `xra_` CLI access tokens.
 *
 * Owns the `CliScope` type, scope parsing, and the single lookup that turns an
 * `Authorization` header into an active token context. Access decisions read
 * only `cli_access_token.scopes`, never the legacy `scope` column. Does not
 * mint tokens or enforce scopes on procedures (see `access-token.ts` and
 * `~/server/api/trpc.ts`).
 */

import { createHash } from "node:crypto";
import { db } from "~/server/db";

/** Prefix on every CLI bearer token. */
export const CLI_TOKEN_PREFIX = "xra_";

/** Every scope a CLI token can carry. `write` does not imply `read`. */
export const CLI_SCOPES = ["read", "write"] as const;

/** One approved capability on a CLI token. */
export type CliScope = (typeof CLI_SCOPES)[number];

/** Minimum interval between `last_used_at` writes for one token. */
export const CLI_LAST_USED_TOUCH_MS = 5 * 60 * 1000;

/** Default token lifetime in milliseconds (30 days). */
export const CLI_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Token context resolved from a valid, unexpired, unrevoked bearer. */
export interface BearerContext {
  /** ORCID iD of the token owner. */
  userId: string;
  /** Approved scopes, de-duplicated, never empty, ordered `read` then `write`. */
  scopes: readonly CliScope[];
  /** `cli_access_token.id`. */
  tokenId: string;
  /** First characters of the token, safe to log and display. */
  tokenPrefix: string;
  /** Display name of the owner, or `null` when unset. */
  userName: string | null;
}

/**
 * Returns whether `value` is a known CLI scope string.
 *
 * @param value - Candidate scope string.
 */
export function isCliScope(value: string): value is CliScope {
  return (CLI_SCOPES as readonly string[]).includes(value);
}

/**
 * Normalizes scope strings into a de-duplicated list ordered `read`, `write`.
 *
 * Unknown entries are dropped. Callers that must reject unknown entries
 * compare the result length against the input.
 *
 * @param values - Raw scope strings, for example `cli_access_token.scopes`.
 * @returns The recognized scopes; empty when none are recognized.
 */
export function parseCliScopes(values: readonly string[]): CliScope[] {
  return CLI_SCOPES.filter((scope) => values.includes(scope));
}

/**
 * Splits a space- or comma-separated scope string and normalizes it.
 *
 * @param value - Query value such as `read write` or `read,write`.
 * @returns Recognized scopes; empty when the value has none.
 */
export function parseCliScopeString(value: string): CliScope[] {
  return parseCliScopes(value.split(/[\s,]+/).filter((s) => s.length > 0));
}

/**
 * Returns the single legacy `scope` column value for a scope set.
 *
 * The column is NOT NULL and kept only for database compatibility.
 *
 * @param scopes - Approved scopes.
 * @returns `"write"` when write was approved, otherwise `"read"`.
 */
export function legacyScopeColumn(scopes: readonly CliScope[]): CliScope {
  return scopes.includes("write") ? "write" : "read";
}

/**
 * SHA-256 hex digest used for token and code storage.
 *
 * @param value - Plaintext secret.
 */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Extracts the `xra_` token from a raw `Authorization` header.
 *
 * @param authorization - Header value.
 * @returns The token, or `null` when the header is not a well-formed CLI bearer.
 */
export function parseCliBearerToken(authorization: string): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
  const token = match?.[1];
  if (!token || !token.startsWith(CLI_TOKEN_PREFIX) || token.length < 20) {
    return null;
  }
  return token;
}

/**
 * Resolves an `Authorization` header to an active CLI token context.
 *
 * Rejects malformed headers, unknown tokens, revoked tokens, expired tokens,
 * and tokens with no recognized scope. Updates `last_used_at` at most once per
 * {@link CLI_LAST_USED_TOUCH_MS}; a failed touch never fails the request.
 *
 * @param authorization - Raw `Authorization` header value, or `null`.
 * @returns The token context, or `null` when the credential is absent or not active.
 */
export async function resolveBearerContext(
  authorization: string | null,
): Promise<BearerContext | null> {
  if (authorization === null || authorization.length === 0) {
    return null;
  }
  const token = parseCliBearerToken(authorization);
  if (!token) {
    return null;
  }
  const row = await db.cliAccessToken.findUnique({
    where: { tokenHash: sha256Hex(token) },
    select: {
      id: true,
      userId: true,
      scopes: true,
      tokenPrefix: true,
      expiresAt: true,
      revokedAt: true,
      lastUsedAt: true,
      user: { select: { name: true } },
    },
  });
  if (!row || row.revokedAt !== null || row.expiresAt.getTime() <= Date.now()) {
    return null;
  }
  const scopes = parseCliScopes(row.scopes);
  if (scopes.length === 0) {
    return null;
  }
  await touchLastUsed(row.id, row.lastUsedAt);
  return {
    userId: row.userId,
    scopes,
    tokenId: row.id,
    tokenPrefix: row.tokenPrefix,
    userName: row.user.name,
  };
}

async function touchLastUsed(
  tokenId: string,
  lastUsedAt: Date | null,
): Promise<void> {
  if (
    lastUsedAt !== null &&
    Date.now() - lastUsedAt.getTime() < CLI_LAST_USED_TOUCH_MS
  ) {
    return;
  }
  try {
    await db.cliAccessToken.updateMany({
      where: { id: tokenId, revokedAt: null },
      data: { lastUsedAt: new Date() },
    });
  } catch {
    return;
  }
}
