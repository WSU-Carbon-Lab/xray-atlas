/**
 * Short-lived cookie bridge that signals first ORCID account creation when the new
 * user already has pending dataset attributions. Post-login diversion runs in the
 * Next.js proxy (middleware) after `createUser` has set the review cookie — Auth.js
 * `redirect` / `createCallbackUrl` run before `createUser` and must not own this
 * divert (that path polluted `authjs.callback-url` and produced `?welcome%3D1`).
 * Does not auto-accept attributions; `auto_accept_mode` stays off unless the user opted in.
 */
import { cookies } from "next/headers";

export const PENDING_ATTRIBUTION_REVIEW_COOKIE =
  "xray_pending_attribution_review";

/** Stores the originating Auth.js callback URL across first-login validation. */
export const PENDING_ATTRIBUTION_RETURN_TO_COOKIE =
  "xray_pending_attribution_return_to";

/** Account path for first-login and returning-user pending attribution review. */
export const PENDING_ATTRIBUTIONS_PATH = "/account/attributions/pending";

/** Query flag that unlocks first-login welcome copy on the pending page. */
export const PENDING_ATTRIBUTION_WELCOME_PARAM = "welcome";

/** Canonical welcome query value (`?welcome=1`). */
export const PENDING_ATTRIBUTION_WELCOME_VALUE = "1";

const MAX_AGE_SECONDS = 60 * 10;

const reviewCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
  secure: process.env.NODE_ENV === "production",
};

export interface PendingAttributionReviewSignal {
  orcid: string;
  pendingCount: number;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + "=".repeat(padLength));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function encodePayload(payload: PendingAttributionReviewSignal): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

/**
 * Decodes a review-cookie payload. Invalid or zero-count payloads return null so
 * callers can clear the cookie and avoid a sticky empty divert.
 *
 * @param value - Raw cookie value (base64url JSON).
 */
export function decodePendingAttributionReviewCookieValue(
  value: string,
): PendingAttributionReviewSignal | null {
  try {
    const parsed: unknown = JSON.parse(
      new TextDecoder().decode(fromBase64Url(value)),
    );
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    if (
      typeof record.orcid !== "string" ||
      record.orcid.length === 0 ||
      typeof record.pendingCount !== "number" ||
      !Number.isFinite(record.pendingCount) ||
      record.pendingCount < 1
    ) {
      return null;
    }
    return {
      orcid: record.orcid,
      pendingCount: Math.floor(record.pendingCount),
    };
  } catch {
    return null;
  }
}

/**
 * Builds the same-origin relative path for first-login attribution validation
 * with a correctly encoded `welcome=1` query (never `welcome%3D1` as a bare key).
 *
 * @returns Relative path+search string starting with `/`.
 */
export function pendingAttributionWelcomePath(): string {
  const params = new URLSearchParams({
    [PENDING_ATTRIBUTION_WELCOME_PARAM]: PENDING_ATTRIBUTION_WELCOME_VALUE,
  });
  return `${PENDING_ATTRIBUTIONS_PATH}?${params.toString()}`;
}

/**
 * Builds the absolute post-login URL for first-login attribution validation.
 *
 * @param baseUrl - Public origin (no trailing slash required). Absolute URLs are
 *   resolved with the URL constructor so `welcome` is a real query key, not an
 *   opaque encoded segment.
 * @returns Absolute URL including `?welcome=1`.
 */
export function pendingAttributionReviewRedirectUrl(baseUrl: string): string {
  const origin = baseUrl.replace(/\/$/, "");
  const url = new URL(PENDING_ATTRIBUTIONS_PATH, `${origin}/`);
  url.searchParams.set(
    PENDING_ATTRIBUTION_WELCOME_PARAM,
    PENDING_ATTRIBUTION_WELCOME_VALUE,
  );
  return url.toString();
}

/**
 * Detects first-login welcome mode from App Router `searchParams`, including the
 * accidental `?welcome%3D1` shape (literal key `welcome=1`) from older redirects.
 *
 * @param params - Next.js search params record (`welcome` and/or `welcome=1`).
 * @returns Whether the pending page should render first-login onboarding.
 */
export function isPendingAttributionWelcomeSearchParams(params: {
  welcome?: string | string[] | undefined;
  "welcome=1"?: string | string[] | undefined;
}): boolean {
  const welcomeRaw = params.welcome;
  const welcomeValue = Array.isArray(welcomeRaw) ? welcomeRaw[0] : welcomeRaw;
  if (
    welcomeValue === PENDING_ATTRIBUTION_WELCOME_VALUE ||
    welcomeValue === "true"
  ) {
    return true;
  }
  return Object.prototype.hasOwnProperty.call(params, "welcome=1");
}

/**
 * Returns whether Auth.js is redirecting to an Atlas app URL (relative or same
 * origin) rather than an external OAuth authorize endpoint.
 *
 * @param url - Absolute or relative target from Auth.js `redirect`.
 * @param baseUrl - Auth.js public origin (no trailing slash required).
 */
export function isSameOriginAuthAppRedirect(
  url: string,
  baseUrl: string,
): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) {
    return true;
  }
  try {
    return new URL(url).origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
}

/**
 * Normalizes an Auth.js redirect `url` into a same-origin relative path safe to
 * restore after first-login attribution validation.
 *
 * @param url - Absolute or relative callback from Auth.js `redirect`.
 * @param baseUrl - Auth.js public origin (no trailing slash required).
 * @returns Relative path+search+hash, or `/` when the target is external, opaque,
 *   the sign-in surface, or the pending validation page itself.
 */
export function sanitizePendingAttributionReturnTo(
  url: string,
  baseUrl: string,
): string {
  const fallback = "/";

  const sanitizeRelative = (relative: string): string => {
    if (!relative.startsWith("/") || relative.startsWith("//")) {
      return fallback;
    }
    if (relative === "/sign-in" || relative.startsWith("/sign-in?")) {
      return fallback;
    }
    if (
      relative === PENDING_ATTRIBUTIONS_PATH ||
      relative.startsWith(`${PENDING_ATTRIBUTIONS_PATH}?`)
    ) {
      return fallback;
    }
    return relative;
  };

  if (url.startsWith("/")) {
    return sanitizeRelative(url);
  }

  try {
    const parsed = new URL(url);
    const base = new URL(baseUrl);
    if (parsed.origin !== base.origin) {
      return fallback;
    }
    return sanitizeRelative(parsed.pathname + parsed.search + parsed.hash);
  } catch {
    return fallback;
  }
}

/**
 * Marks the current Auth.js OAuth callback so post-login proxy can send a
 * newly created ORCID user to pending attribution review.
 *
 * @param signal - ORCID primary key and pending attribution count (must be >= 1).
 */
export async function setPendingAttributionReviewCookie(
  signal: PendingAttributionReviewSignal,
): Promise<void> {
  if (signal.pendingCount < 1) {
    return;
  }
  const cookieStore = await cookies();
  cookieStore.set(
    PENDING_ATTRIBUTION_REVIEW_COOKIE,
    encodePayload(signal),
    reviewCookieOptions,
  );
}

/**
 * Reads the first-login pending-attribution review cookie without clearing it.
 *
 * @returns Decoded signal when present and valid; otherwise `null`.
 */
export async function peekPendingAttributionReviewCookie(): Promise<PendingAttributionReviewSignal | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PENDING_ATTRIBUTION_REVIEW_COOKIE)?.value;
  if (!raw) {
    return null;
  }
  return decodePendingAttributionReviewCookieValue(raw);
}

/**
 * Reads and clears the first-login pending-attribution review cookie.
 *
 * @returns Decoded signal when present and valid; otherwise `null`. Clears the
 *   cookie even when the payload is invalid so a stale value cannot divert forever.
 */
export async function consumePendingAttributionReviewCookie(): Promise<PendingAttributionReviewSignal | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PENDING_ATTRIBUTION_REVIEW_COOKIE)?.value;
  if (!raw) {
    return null;
  }
  cookieStore.delete(PENDING_ATTRIBUTION_REVIEW_COOKIE);
  return decodePendingAttributionReviewCookieValue(raw);
}

/**
 * Deletes the review cookie without decoding (invalid or leftover payloads).
 */
export async function clearPendingAttributionReviewCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_ATTRIBUTION_REVIEW_COOKIE);
}

/**
 * Persists the originating post-login URL for restoration after validation.
 *
 * @param returnTo - Same-origin relative path from {@link sanitizePendingAttributionReturnTo}.
 */
export async function setPendingAttributionReturnToCookie(
  returnTo: string,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    PENDING_ATTRIBUTION_RETURN_TO_COOKIE,
    returnTo,
    reviewCookieOptions,
  );
}

/**
 * Reads the originating return-to path without clearing the cookie.
 *
 * @returns Relative path when present; otherwise `null`.
 */
export async function peekPendingAttributionReturnToCookie(): Promise<
  string | null
> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PENDING_ATTRIBUTION_RETURN_TO_COOKIE)?.value;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return null;
  }
  return raw;
}

/**
 * Reads and clears the originating return-to cookie.
 *
 * @returns Relative path when present; otherwise `null`.
 */
export async function consumePendingAttributionReturnToCookie(): Promise<
  string | null
> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PENDING_ATTRIBUTION_RETURN_TO_COOKIE)?.value;
  if (!raw) {
    return null;
  }
  cookieStore.delete(PENDING_ATTRIBUTION_RETURN_TO_COOKIE);
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return null;
  }
  return raw;
}
