import { cookies } from "next/headers";
import type { PrismaClient } from "~/prisma/client";
import {
  readCachedSessionUserId,
  rememberSessionUserId,
} from "~/server/auth/session-user-cache";

export const SESSION_COOKIE_NAMES = [
  "__Host-authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
] as const;

type SessionLookupDb = Pick<PrismaClient, "session">;

/**
 * Reads the Auth.js database session token from the Next.js cookie store.
 * Returns `null` when no session cookie is present or `cookies()` is unavailable.
 */
export async function getSessionTokenFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    for (const name of SESSION_COOKIE_NAMES) {
      const value = cookieStore.get(name)?.value;
      if (value) {
        return value;
      }
    }
    return null;
  } catch {
    return null;
  }
}

const sessionUserInflight = new Map<string, Promise<string | null>>();

async function lookupSessionUserId(
  db: SessionLookupDb,
  sessionToken: string,
): Promise<string | null> {
  try {
    const row = await db.session.findUnique({
      where: { sessionToken },
      select: { userId: true, expires: true },
    });
    if (!row?.userId || row.expires < new Date()) {
      return null;
    }
    rememberSessionUserId(sessionToken, row.userId);
    return row.userId;
  } catch {
    return null;
  }
}

/**
 * Resolves the signed-in Atlas user id from Auth.js session cookies without invoking the full
 * Auth.js `auth()` pipeline. Reuses an in-flight lookup and an 8 second token cache.
 * Returns `null` when no valid session exists or when the database lookup fails so callers
 * fail closed on account-linking gates. A request with no session cookie does not read the cache.
 */
export async function getSessionUserIdFromCookies(
  db: SessionLookupDb,
): Promise<string | null> {
  const sessionToken = await getSessionTokenFromCookies();
  if (!sessionToken) {
    return null;
  }
  const cached = readCachedSessionUserId(sessionToken);
  if (cached) {
    return cached;
  }
  const inflight = sessionUserInflight.get(sessionToken);
  if (inflight) {
    return inflight;
  }
  const pending = lookupSessionUserId(db, sessionToken).finally(() => {
    sessionUserInflight.delete(sessionToken);
  });
  sessionUserInflight.set(sessionToken, pending);
  return pending;
}

/**
 * Reads the database session token from an incoming Request cookie header.
 */
export function getSessionTokenFromRequest(
  req: Request | undefined,
): string | null {
  if (!req) {
    return null;
  }
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }
  const pairs = cookieHeader.split(";").map((part) => part.trim());
  for (const name of SESSION_COOKIE_NAMES) {
    const prefix = `${name}=`;
    const match = pairs.find((p) => p.startsWith(prefix));
    if (match) {
      const value = match.slice(prefix.length);
      if (value) {
        try {
          return decodeURIComponent(value);
        } catch {
          return value;
        }
      }
    }
  }
  return null;
}
