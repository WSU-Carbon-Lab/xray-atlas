const SESSION_COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
] as const;

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
