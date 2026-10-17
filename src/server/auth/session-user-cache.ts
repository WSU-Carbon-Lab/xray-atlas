/**
 * Short-lived map from Auth.js session token to Atlas user id.
 *
 * Collapses repeated session lookups during one page's parallel requests.
 * A missing cookie must skip this cache. Logout clears the cookie, so the
 * next request does not read a remembered id. A token that is still presented
 * after the database row is deleted can resolve for up to the TTL.
 */

const SESSION_USER_CACHE_TTL_MS = 8_000;
const SESSION_USER_CACHE_MAX_ENTRIES = 500;

interface SessionUserCacheEntry {
  userId: string;
  freshUntil: number;
}

const sessionUserByToken = new Map<string, SessionUserCacheEntry>();

/**
 * Returns the remembered user id for `sessionToken` when the entry is still fresh.
 * `now` is epoch milliseconds and defaults to `Date.now()`.
 */
export function readCachedSessionUserId(
  sessionToken: string,
  now: number = Date.now(),
): string | null {
  const entry = sessionUserByToken.get(sessionToken);
  if (!entry) {
    return null;
  }
  if (entry.freshUntil <= now) {
    sessionUserByToken.delete(sessionToken);
    return null;
  }
  return entry.userId;
}

/**
 * Remembers `userId` for `sessionToken` for 8 seconds from `now`.
 * Drops expired entries once the map exceeds 500 tokens.
 */
export function rememberSessionUserId(
  sessionToken: string,
  userId: string,
  now: number = Date.now(),
): void {
  sessionUserByToken.set(sessionToken, {
    userId,
    freshUntil: now + SESSION_USER_CACHE_TTL_MS,
  });
  if (sessionUserByToken.size <= SESSION_USER_CACHE_MAX_ENTRIES) {
    return;
  }
  for (const [token, entry] of sessionUserByToken) {
    if (entry.freshUntil <= now) {
      sessionUserByToken.delete(token);
    }
  }
  if (sessionUserByToken.size > SESSION_USER_CACHE_MAX_ENTRIES) {
    const oldest = sessionUserByToken.keys().next().value;
    if (oldest) {
      sessionUserByToken.delete(oldest);
    }
  }
}

/** Drops every remembered session user id. */
export function clearSessionUserIdCache(): void {
  sessionUserByToken.clear();
}
