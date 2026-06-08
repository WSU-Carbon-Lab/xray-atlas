import {
  googleFaviconUrlForHostname,
  trimFacilityWebsiteUrl,
} from "~/lib/facility-website-url";
import {
  assertSafeRemoteImageUrl,
  fetchRemoteImageBytesForSampling,
} from "~/server/utils/safe-remote-image-url";

const FAVICON_MAX_BYTES = 256 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
const HTML_MAX_BYTES = 512 * 1024;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECT_HOPS = 8;

const LINK_ICON_REL =
  /<link\b[^>]*\brel=["'](?:[^"']*\b)?(?:shortcut\s+icon|icon|apple-touch-icon)\b(?:[^"']*)["'][^>]*>/gi;

async function fetchSafeHtmlDocument(url: string): Promise<string | null> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    const target = await assertSafeRemoteImageUrl(current);
    const res = await fetch(target.toString(), {
      method: "GET",
      redirect: "manual",
      headers: { Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
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
    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      return null;
    }
    const cl = res.headers.get("content-length");
    if (cl !== null && Number(cl) > HTML_MAX_BYTES) return null;
    const text = await res.text();
    if (text.length > HTML_MAX_BYTES) return null;
    return text;
  }
  return null;
}

function readLinkHref(tag: string): string | null {
  const hrefMatch = /\bhref=["']([^"']+)["']/i.exec(tag);
  return hrefMatch?.[1]?.trim() ?? null;
}

function resolveIconHref(rawHref: string, pageUrl: URL): string | null {
  try {
    return new URL(rawHref, pageUrl).toString();
  } catch {
    return null;
  }
}

async function probeDisplayableImageUrl(candidate: string): Promise<string | null> {
  try {
    const validated = await assertSafeRemoteImageUrl(candidate);
    const bytes = await fetchRemoteImageBytesForSampling(
      validated.toString(),
      FAVICON_MAX_BYTES,
      FETCH_TIMEOUT_MS,
    );
    if (bytes && bytes.byteLength > 0) {
      return validated.toString();
    }
  } catch {
    return null;
  }
  return null;
}

async function discoverIconFromHtml(pageUrl: URL): Promise<string | null> {
  const html = await fetchSafeHtmlDocument(pageUrl.toString());
  if (!html) return null;

  const candidates: string[] = [];
  for (const match of html.matchAll(LINK_ICON_REL)) {
    const href = readLinkHref(match[0] ?? "");
    if (!href) continue;
    const absolute = resolveIconHref(href, pageUrl);
    if (absolute) candidates.push(absolute);
  }

  for (const candidate of candidates) {
    const resolved = await probeDisplayableImageUrl(candidate);
    if (resolved) return resolved;
  }
  return null;
}

async function tryDefaultFaviconIco(origin: string): Promise<string | null> {
  return probeDisplayableImageUrl(`${origin}/favicon.ico`);
}

/**
 * Resolves a displayable favicon URL for a validated facility website.
 * Probes HTML `<link rel="icon">` tags, then `/favicon.ico`, then Google's favicon service
 * for the site hostname. Returns null when the website URL is empty.
 *
 * @param websiteUrl - Absolute http(s) facility homepage URL.
 * @returns Cached favicon URL to persist, or null when no website is configured.
 */
export async function resolveFacilityFaviconUrl(
  websiteUrl: string | null | undefined,
): Promise<string | null> {
  const trimmed = websiteUrl ? trimFacilityWebsiteUrl(websiteUrl) : null;
  if (!trimmed) return null;

  const pageUrl = await assertSafeRemoteImageUrl(trimmed);

  const fromHtml = await discoverIconFromHtml(pageUrl);
  if (fromHtml) return fromHtml;

  const fromIco = await tryDefaultFaviconIco(pageUrl.origin);
  if (fromIco) return fromIco;

  return googleFaviconUrlForHostname(pageUrl.hostname);
}
