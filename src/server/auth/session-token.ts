import { cookies } from "next/headers";
import type { PrismaClient } from "~/prisma/client";

export const SESSION_COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
] as const;

type SessionLookupDb = Pick<PrismaClient, "session">;

/**
 * Resolves the signed-in Atlas user id from Auth.js session cookies without invoking the full
 * Auth.js `auth()` pipeline. Returns `null` when no valid session exists or when the database
 * lookup fails so callers fail closed on account-linking gates.
 */
export async function getSessionUserIdFromCookies(
  db: SessionLookupDb,
): Promise<string | null> {
  const cookieStore = await cookies();
  let sessionToken: string | undefined;
  for (const name of SESSION_COOKIE_NAMES) {
    sessionToken = cookieStore.get(name)?.value;
    if (sessionToken) {
      break;
    }
  }
  if (!sessionToken) {
    return null;
  }
  try {
    const row = await db.session.findUnique({
      where: { sessionToken },
      select: { userId: true, expires: true },
    });
    if (!row || row.expires < new Date()) {
      return null;
    }
    return row.userId;
  } catch {
    return null;
  }
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
