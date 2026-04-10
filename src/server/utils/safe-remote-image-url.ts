/**
 * Validates `http`/`https` URLs before the server fetches them (SSRF mitigation for icon sampling).
 * Rejects non-http(s) schemes, obvious loopback and private hosts, and link-local IPv6 literals.
 */

const MAX_URL_LENGTH = 2048;

/**
 * Parses `raw` as an absolute URL and throws if the target host is not allowed for server-side fetch.
 *
 * @param raw - Candidate URL string (typically trimmed).
 * @returns Normalized `URL` when safe.
 * @throws Error with message safe to map to `BAD_REQUEST` when the URL or host is disallowed.
 */
export function assertSafeRemoteImageUrl(raw: string): URL {
  const t = raw.trim();
  if (t.length === 0 || t.length > MAX_URL_LENGTH) {
    throw new Error("Invalid URL.");
  }
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed.");
  }
  if (u.username !== "" || u.password !== "") {
    throw new Error("URL must not include credentials.");
  }
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) {
    throw new Error("Host not allowed.");
  }
  if (host.includes(":")) {
    const h = host.toLowerCase();
    if (h === "::1" || h.startsWith("fe80:")) {
      throw new Error("Host not allowed.");
    }
    if (
      h.startsWith("fc00:") ||
      h.startsWith("fcff:") ||
      h.startsWith("fd00:") ||
      h.startsWith("fdff:")
    ) {
      throw new Error("Host not allowed.");
    }
  }
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const o = ipv4.slice(1, 5).map((x) => Number(x));
    if (o.some((n) => n > 255)) {
      throw new Error("Invalid host.");
    }
    const [a, b] = o;
    if (a === undefined || b === undefined) {
      throw new Error("Invalid host.");
    }
    if (a === 0 || a === 10 || a === 127) {
      throw new Error("Host not allowed.");
    }
    if (a === 169 && b === 254) {
      throw new Error("Host not allowed.");
    }
    if (a === 192 && b === 168) {
      throw new Error("Host not allowed.");
    }
    if (a === 172 && b >= 16 && b <= 31) {
      throw new Error("Host not allowed.");
    }
  }
  return u;
}
