/**
 * Read credentials for the `xatlas` CLI.
 *
 * Mints a single active `xra_` token per user after a passkey-confirmed
 * session, stores only the SHA-256 hex, and exchanges a one-time loopback
 * PKCE code so the browser redirect never carries the secret. Does not
 * authorize catalog writes.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { PrismaClient } from "~/prisma/client";
import { emitAuditEvent } from "~/server/audit/emit-audit-event";
import { extractAuditRequestMeta } from "~/server/audit/request-meta";
import { db } from "~/server/db";
import { evaluateSessionWriteAssurance } from "~/server/auth/mfa-access";

/** Prefix on every CLI bearer token. */
export const CLI_TOKEN_PREFIX = "xra_";

/** Only scope issued by `xatlas login`. */
export const CLI_READ_SCOPE = "read";

const CLI_TOKEN_NAME = "xatlas";
const AUTHORIZATION_TTL_MS = 2 * 60 * 1000;
const LAST_USED_TOUCH_MS = 60 * 1000;
const CODE_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const CODE_VERIFIER_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/;
const STATE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

type CliDb = PrismaClient;

export interface CliCredentialIdentity {
  tokenId: string;
  userId: string;
  scope: string;
  tokenPrefix: string;
  name: string | null;
}

export interface CliAuthorizeInput {
  redirectUri: string;
  state: string;
  codeChallenge: string;
}

export interface IssuedCliAuthorization {
  redirectTo: string;
}

export interface CliTokenExchangeInput {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

export interface IssuedCliToken {
  token: string;
  scope: typeof CLI_READ_SCOPE;
  orcid: string;
  name: string | null;
}

/**
 * Accepts an HTTP loopback callback used by `xatlas login`.
 *
 * Allows `127.0.0.1`, `localhost`, and `::1`, port 1 through 65535, path
 * `/callback`, and no userinfo, query, or fragment.
 *
 * @param value - Candidate redirect URI from the CLI.
 * @returns The parsed URL, or `null` when the URI is not a loopback callback.
 */
export function parseLoopbackRedirectUri(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:") {
    return null;
  }
  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    return null;
  }
  if (url.username.length > 0 || url.password.length > 0) {
    return null;
  }
  if (
    url.pathname !== "/callback" ||
    url.search.length > 0 ||
    url.hash.length > 0
  ) {
    return null;
  }
  const port = Number(url.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }
  return url;
}

/**
 * Returns whether `value` is an S256 PKCE challenge (base64url SHA-256, unpadded).
 *
 * @param value - `code_challenge` from the CLI.
 */
export function isCliCodeChallenge(value: string): boolean {
  return CODE_CHALLENGE_PATTERN.test(value);
}

/**
 * Returns whether `value` is a PKCE verifier the CLI is allowed to send.
 *
 * @param value - `code_verifier` from the token exchange.
 */
export function isCliCodeVerifier(value: string): boolean {
  return CODE_VERIFIER_PATTERN.test(value);
}

/**
 * Returns whether `value` is the OAuth `state` string `xatlas login` generates.
 *
 * @param value - State query parameter echoed to the loopback callback.
 */
export function isCliLoginState(value: string): boolean {
  return STATE_PATTERN.test(value);
}

/**
 * Creates a one-time authorization code for a passkey-confirmed user.
 *
 * @param database - Prisma client.
 * @param userId - ORCID iD of the signed-in user.
 * @param input - Loopback redirect, state, and S256 challenge from the CLI.
 * @param request - Incoming authorize request, used for the passkey gate and audit metadata.
 * @returns The loopback URL the browser should open, including `code` and `state`.
 * @throws {CliAccessError} when the session is missing, the passkey gate fails,
 * or the redirect, state, or challenge is rejected.
 */
export async function createCliAuthorization(
  database: CliDb,
  userId: string,
  input: CliAuthorizeInput,
  request: Request,
): Promise<IssuedCliAuthorization> {
  const redirectUrl = parseLoopbackRedirectUri(input.redirectUri);
  if (
    !redirectUrl ||
    !isCliLoginState(input.state) ||
    !isCliCodeChallenge(input.codeChallenge)
  ) {
    throw new CliAccessError(
      "The CLI login request is not a valid loopback callback.",
      400,
    );
  }

  const assurance = await evaluateSessionWriteAssurance(
    database,
    userId,
    request,
  );
  if (!assurance.enrolled) {
    throw new CliAccessError(
      "Register a passkey from your profile before creating a CLI credential.",
      403,
    );
  }
  if (!assurance.satisfied) {
    throw new CliAccessError(
      "Confirm with a passkey before creating a CLI credential.",
      403,
    );
  }

  const code = randomBytes(32).toString("base64url");
  const now = new Date();
  await database.cliAuthorizationCode.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: now } },
        {
          consumedAt: {
            lt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          },
        },
      ],
    },
  });
  await database.cliAuthorizationCode.create({
    data: {
      userId,
      codeHash: sha256Hex(code),
      codeChallenge: input.codeChallenge,
      redirectUri: redirectUrl.toString(),
      expiresAt: new Date(now.getTime() + AUTHORIZATION_TTL_MS),
    },
  });

  const callback = new URL(redirectUrl.toString());
  callback.searchParams.set("code", code);
  callback.searchParams.set("state", input.state);
  return { redirectTo: callback.toString() };
}

/**
 * Exchanges a loopback authorization code for a read token.
 *
 * Revokes any previous active CLI token for the user. The returned `token`
 * is the only copy of the secret.
 *
 * @param database - Prisma client.
 * @param input - Code, PKCE verifier, and the same loopback redirect URI.
 * @param request - Exchange request, recorded on the audit row.
 * @returns The plaintext token and the account it belongs to.
 * @throws {CliAccessError} when the code, verifier, or redirect does not match.
 */
export async function exchangeCliAuthorizationCode(
  database: CliDb,
  input: CliTokenExchangeInput,
  request: Request,
): Promise<IssuedCliToken> {
  if (
    !isCliCodeVerifier(input.codeVerifier) ||
    !parseLoopbackRedirectUri(input.redirectUri)
  ) {
    throw new CliAccessError("Login code is invalid or expired.", 400);
  }

  const redirectUri = new URL(input.redirectUri).toString();
  const row = await database.cliAuthorizationCode.findUnique({
    where: { codeHash: sha256Hex(input.code) },
    select: {
      id: true,
      userId: true,
      codeChallenge: true,
      redirectUri: true,
      expiresAt: true,
      consumedAt: true,
    },
  });
  const challenge = pkceS256(input.codeVerifier);
  const matches =
    row !== null &&
    row.consumedAt === null &&
    row.expiresAt.getTime() > Date.now() &&
    safeEqual(row.redirectUri, redirectUri) &&
    safeEqual(row.codeChallenge, challenge);
  if (!row || !matches) {
    throw new CliAccessError("Login code is invalid or expired.", 400);
  }

  const consumed = await database.cliAuthorizationCode.updateMany({
    where: { id: row.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (consumed.count !== 1) {
    throw new CliAccessError("Login code is invalid or expired.", 400);
  }

  const token = `${CLI_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  const tokenPrefix = token.slice(0, 12);
  const issued = await database.$transaction(async (tx) => {
    const replaced = await tx.cliAccessToken.updateMany({
      where: { userId: row.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.cliAccessToken.create({
      data: {
        userId: row.userId,
        name: CLI_TOKEN_NAME,
        tokenHash: sha256Hex(token),
        tokenPrefix,
        scope: CLI_READ_SCOPE,
      },
    });
    const user = await tx.user.findUnique({
      where: { id: row.userId },
      select: { id: true, name: true },
    });
    return {
      replaced: replaced.count,
      orcid: user?.id ?? row.userId,
      name: user?.name ?? null,
    };
  });

  await emitAuditEvent({
    eventType: "cli.token.issue",
    eventScope: "cli.token",
    actorUserId: row.userId,
    subjectUserId: row.userId,
    payload: {
      tokenPrefix,
      scope: CLI_READ_SCOPE,
      replaced: issued.replaced,
    },
    requestMeta: extractAuditRequestMeta(request.headers),
    failSilent: true,
  });

  return {
    token,
    scope: CLI_READ_SCOPE,
    orcid: issued.orcid,
    name: issued.name,
  };
}

/**
 * Resolves a presented `xra_` bearer token to the owning account.
 *
 * @param authorization - Raw `Authorization` header value, or `null` when absent.
 * @returns The active credential, `null` when no header is present, or `"invalid"`
 * when the header is present but is not an active read token.
 */
export async function resolvePresentedCliBearer(
  authorization: string | null,
): Promise<CliCredentialIdentity | null | "invalid"> {
  if (authorization === null || authorization.length === 0) {
    return null;
  }
  const token = bearerToken(authorization);
  if (!token) {
    return "invalid";
  }
  const row = await db.cliAccessToken.findUnique({
    where: { tokenHash: sha256Hex(token) },
    select: {
      id: true,
      userId: true,
      scope: true,
      tokenPrefix: true,
      revokedAt: true,
      lastUsedAt: true,
      user: { select: { name: true } },
    },
  });
  if (!row || row.revokedAt !== null || row.scope !== CLI_READ_SCOPE) {
    return "invalid";
  }
  await touchLastUsed(row.id, row.lastUsedAt);
  return {
    tokenId: row.id,
    userId: row.userId,
    scope: row.scope,
    tokenPrefix: row.tokenPrefix,
    name: row.user.name,
  };
}

/**
 * Rejects molecule and dataset list requests that send a bad CLI credential.
 *
 * Absent `Authorization` stays public. A malformed, unknown, or revoked token
 * returns 401 and does not run the catalog query.
 *
 * @param request - Incoming catalog GET.
 * @returns A 401 response, or `null` when the request may proceed.
 */
export async function rejectInvalidPresentedBearer(
  request: Request,
): Promise<NextResponse | null> {
  const resolved = await resolvePresentedCliBearer(
    request.headers.get("authorization"),
  );
  if (resolved === "invalid") {
    return cliError("Unauthorized", 401);
  }
  return null;
}

/**
 * Revokes the CLI token presented as a bearer credential.
 *
 * @param authorization - Raw `Authorization` header value.
 * @param request - Revoke request, recorded on the audit row.
 * @returns The prefix of the revoked token.
 * @throws {CliAccessError} with status 401 when the token is missing or inactive.
 */
export async function revokePresentedCliToken(
  authorization: string | null,
  request: Request,
): Promise<{ tokenPrefix: string }> {
  const identity = await resolvePresentedCliBearer(authorization);
  if (!identity || identity === "invalid") {
    throw new CliAccessError("Unauthorized", 401);
  }
  await db.cliAccessToken.updateMany({
    where: { id: identity.tokenId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await emitAuditEvent({
    eventType: "cli.token.revoke",
    eventScope: "cli.token",
    actorUserId: identity.userId,
    subjectUserId: identity.userId,
    payload: { tokenPrefix: identity.tokenPrefix },
    requestMeta: extractAuditRequestMeta(request.headers),
    failSilent: true,
  });
  return { tokenPrefix: identity.tokenPrefix };
}

/**
 * Failure from CLI credential routes. `status` is the HTTP status to return.
 */
export class CliAccessError extends Error {
  readonly status: number;

  /**
   * @param message - Reader-facing error copied into `{ error }`.
   * @param status - HTTP status. 400 for a bad login code, 401 for a bad token, 403 for passkey.
   */
  constructor(message: string, status: number) {
    super(message);
    this.name = "CliAccessError";
    this.status = status;
  }
}

/**
 * Builds a JSON error body for CLI credential routes.
 *
 * Sets `Cache-Control: no-store`. Status 401 also sets `WWW-Authenticate: Bearer`.
 *
 * @param message - Value of the `error` field.
 * @param status - HTTP status code.
 */
export function cliError(message: string, status: number): NextResponse {
  const headers = new Headers({ "cache-control": "no-store" });
  if (status === 401) {
    headers.set("www-authenticate", "Bearer");
  }
  return NextResponse.json({ error: message }, { status, headers });
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function pkceS256(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

function bearerToken(authorization: string): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
  const token = match?.[1];
  if (!token || !token.startsWith(CLI_TOKEN_PREFIX) || token.length < 20) {
    return null;
  }
  return token;
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  if (leftBytes.length !== rightBytes.length) {
    return false;
  }
  return timingSafeEqual(leftBytes, rightBytes);
}

async function touchLastUsed(
  tokenId: string,
  lastUsedAt: Date | null,
): Promise<void> {
  if (
    lastUsedAt !== null &&
    Date.now() - lastUsedAt.getTime() < LAST_USED_TOUCH_MS
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
