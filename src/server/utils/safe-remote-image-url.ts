/**
 * Validates `http`/`https` URLs before the server fetches them (SSRF mitigation for icon sampling).
 * Used only from admin-only tRPC; residual DNS timing gaps are an accepted trade-off at that boundary.
 * Rejects non-http(s) schemes, credentials, obvious loopback and private hosts in the URL string,
 * then resolves hostnames and rejects addresses in private/link-local/metadata space (DNS rebinding).
 * Fetches use manual redirects with the same checks on each hop.
 */

import { resolve4, resolve6 } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_URL_LENGTH = 2048;
const MAX_REDIRECT_HOPS = 8;

function isDisallowedIpv4Parts(o: readonly number[]): boolean {
  if (o.length !== 4 || o.some((n) => n > 255)) return true;
  const [a, b] = o;
  if (a === undefined || b === undefined) return true;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

/**
 * Returns true when `ip` must not be reached by server-side fetch (private, loopback, CGNAT, etc.).
 *
 * @param ip - IPv4 or IPv6 literal from `net.isIP` or DNS resolution.
 */
export function isDisallowedDestinationIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
    if (!m) return true;
    const o = m.slice(1, 5).map((x) => Number(x));
    return isDisallowedIpv4Parts(o);
  }
  if (v === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true;
    if (lower.startsWith("fe80:")) return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("ff")) return true;
    const mapped = /^::ffff:(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(lower);
    if (mapped) {
      const o = mapped.slice(1, 5).map((x) => Number(x));
      return isDisallowedIpv4Parts(o);
    }
    return false;
  }
  return true;
}

function assertSafeHttpUrlShape(raw: string): URL {
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
    if (isDisallowedIpv4Parts(o)) {
      throw new Error("Host not allowed.");
    }
  }
  return u;
}

async function assertHostnameResolvesToPublicIps(hostname: string): Promise<void> {
  const kind = isIP(hostname);
  if (kind === 4 || kind === 6) {
    if (isDisallowedDestinationIp(hostname)) {
      throw new Error("Host not allowed.");
    }
    return;
  }
  const v4 = await resolve4(hostname).catch((e: NodeJS.ErrnoException) => {
    if (e.code === "ENOTFOUND" || e.code === "ENODATA") return [] as string[];
    throw e;
  });
  const v6 = await resolve6(hostname).catch((e: NodeJS.ErrnoException) => {
    if (e.code === "ENOTFOUND" || e.code === "ENODATA") return [] as string[];
    throw e;
  });
  const all = [...v4, ...v6];
  if (all.length === 0) {
    throw new Error("Host not allowed.");
  }
  for (const ip of all) {
    if (isDisallowedDestinationIp(ip)) {
      throw new Error("Host not allowed.");
    }
  }
}

/**
 * Parses `raw` as an absolute URL, applies string-based host rules, resolves DNS for non-literal
 * hosts, and rejects destinations that map to disallowed addresses.
 *
 * @param raw - Candidate URL string (typically trimmed).
 * @returns Normalized `URL` when safe.
 * @throws Error with message safe to map to `BAD_REQUEST` when the URL or host is disallowed.
 */
export async function assertSafeRemoteImageUrl(raw: string): Promise<URL> {
  const u = assertSafeHttpUrlShape(raw);
  await assertHostnameResolvesToPublicIps(u.hostname);
  return u;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * Fetches image bytes after SSRF checks on the initial URL and on every redirect Location (manual
 * redirects; each hop re-validates URL shape and DNS). Returns `null` on unsafe redirect, non-OK
 * response, oversize body, or too many hops.
 *
 * @param initialUrl - First-hop URL string (same constraints as {@link assertSafeRemoteImageUrl}).
 * @param maxBytes - Maximum response body size to buffer.
 * @param timeoutMs - Per-request abort timeout in milliseconds.
 */
export async function fetchRemoteImageBytesForSampling(
  initialUrl: string,
  maxBytes: number,
  timeoutMs: number,
): Promise<ArrayBuffer | null> {
  let current = initialUrl;
  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    const target = await assertSafeRemoteImageUrl(current);
    const res = await fetch(target.toString(), {
      method: "GET",
      redirect: "manual",
      headers: { Accept: "image/*,*/*;q=0.8" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (REDIRECT_STATUSES.has(res.status)) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      try {
        current = new URL(loc, target).toString();
      } catch {
        return null;
      }
      continue;
    }
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!ct.startsWith("image/")) return null;
    const cl = res.headers.get("content-length");
    if (cl !== null && Number(cl) > maxBytes) return null;
    const ab = await res.arrayBuffer();
    if (ab.byteLength > maxBytes) return null;
    return ab;
  }
  return null;
}
