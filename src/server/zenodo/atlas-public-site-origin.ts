/**
 * Resolves the stable public X-ray Atlas origin for Zenodo deposit metadata.
 *
 * Minted records must never embed request-time hosts (`getBaseUrl`, `AUTH_URL`,
 * `VERCEL_URL`, or localhost). Defaults to {@link site.url} from brand identity.
 * Optional `ATLAS_PUBLIC_SITE_URL` overrides that default when explicitly set to a
 * non-loopback absolute origin (preview hosts are allowed only via that override).
 *
 * Canonical experiment links use `/molecules/{slug}?nexafsExperiment={uuid}` so
 * paste-from-Zenodo lands on the molecule page with that dataset expanded.
 */

import { site } from "~/app/brand";
import { moleculeNexafsExperimentHref } from "~/lib/nexafs-experiment-deep-link";
import { slugifyMoleculeSynonym } from "~/lib/molecule-slug";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * True when `hostname` is a loopback or `.localhost` development host.
 *
 * @param hostname - URL hostname (no port).
 */
export function isLoopbackHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (LOOPBACK_HOSTS.has(host)) return true;
  return host.endsWith(".localhost");
}

/**
 * Normalizes an absolute site origin to `scheme://host[:port]` with no trailing slash.
 *
 * @param raw - Absolute http(s) URL or origin string.
 * @returns Origin without a trailing slash.
 * @throws {Error} When `raw` is not a valid absolute http(s) URL.
 */
export function normalizePublicSiteOrigin(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Public site origin must be a non-empty absolute URL.");
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Public site origin is not a valid URL: ${raw}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `Public site origin must use http or https (got ${parsed.protocol}).`,
    );
  }
  return parsed.origin.replace(/\/$/, "");
}

/**
 * Resolves the canonical public Atlas origin used in Zenodo descriptions and related links.
 *
 * Preference order:
 * 1. `ATLAS_PUBLIC_SITE_URL` when set (must not be loopback)
 * 2. Brand {@link site.url} (`https://xrayatlas.wsu.edu`)
 *
 * Never consults `getBaseUrl`, `AUTH_URL`, or `VERCEL_URL`.
 *
 * @returns Absolute public origin with no trailing slash.
 * @throws {Error} When `ATLAS_PUBLIC_SITE_URL` is set to a loopback or invalid URL.
 */
export function getAtlasPublicSiteOrigin(): string {
  const configured = process.env.ATLAS_PUBLIC_SITE_URL?.trim();
  if (configured && configured.length > 0) {
    const origin = normalizePublicSiteOrigin(configured);
    const hostname = new URL(origin).hostname;
    if (isLoopbackHostname(hostname)) {
      throw new Error(
        "ATLAS_PUBLIC_SITE_URL must not be a localhost/loopback origin; Zenodo deposits require a public Atlas URL.",
      );
    }
    return origin;
  }
  return normalizePublicSiteOrigin(site.url);
}

/**
 * Builds the canonical public deep-link for an Atlas NEXAFS experiment.
 *
 * Shape: `{origin}/molecules/{slug}?nexafsExperiment={experimentId}`
 *
 * @param experimentId - Atlas experiment UUID.
 * @param moleculeSlug - Canonical molecule synonym slug (or display name; slugified).
 * @param origin - Optional origin override (defaults to {@link getAtlasPublicSiteOrigin}).
 * @returns Absolute molecule deep-link URL on the public site.
 */
export function buildAtlasExperimentMoleculeUrl(
  experimentId: string,
  moleculeSlug: string,
  origin: string = getAtlasPublicSiteOrigin(),
): string {
  const base = normalizePublicSiteOrigin(origin);
  const slug = slugifyMoleculeSynonym(moleculeSlug);
  return `${base}${moleculeNexafsExperimentHref(slug, experimentId)}`;
}

/** @deprecated Prefer {@link buildAtlasExperimentMoleculeUrl}. */
export const buildAtlasExperimentBrowseUrl = buildAtlasExperimentMoleculeUrl;

const LOOPBACK_ATLAS_URL_RE =
  /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]|[a-z0-9-]+\.localhost)(?::\d+)?\/(?:browse(?:\/nexafs)?\?nexafsExperiment=|molecules\/[^?\s"'<>]+\?nexafsExperiment=)/i;

const LEGACY_BROWSE_EXPERIMENT_URL_RE =
  /\/browse(?:\/nexafs)?\?nexafsExperiment=[0-9a-fA-F-]{36}/i;

/**
 * Detects loopback Atlas experiment URLs that should not appear in published Zenodo metadata.
 *
 * @param text - Description HTML or related-identifier string.
 * @returns `true` when a localhost / 127.0.0.1 / `*.localhost` Atlas experiment link is present.
 */
export function descriptionContainsLoopbackAtlasUrl(text: string): boolean {
  return LOOPBACK_ATLAS_URL_RE.test(text);
}

/**
 * Detects legacy `/browse?nexafsExperiment=` (or `/browse/nexafs?…`) links in Zenodo HTML.
 *
 * @param text - Zenodo description HTML.
 * @returns `true` when a browse-catalog experiment query link is present.
 */
export function descriptionContainsLegacyBrowseExperimentUrl(
  text: string,
): boolean {
  return LEGACY_BROWSE_EXPERIMENT_URL_RE.test(text);
}

/**
 * Detects Zenodo descriptions that still use localhost or legacy browse experiment links.
 *
 * @param text - Zenodo description HTML.
 * @returns `true` when the description should be rebuilt to the molecule deep-link form.
 */
export function descriptionNeedsAtlasExperimentUrlRepair(text: string): boolean {
  if (descriptionContainsLoopbackAtlasUrl(text)) return true;
  return descriptionContainsLegacyBrowseExperimentUrl(text);
}

/** @deprecated Prefer {@link descriptionNeedsAtlasExperimentUrlRepair}. */
export const descriptionNeedsAtlasCanonicalUrlRepair =
  descriptionNeedsAtlasExperimentUrlRepair;

/**
 * Rewrites loopback Atlas experiment URLs in HTML/text to the public site origin.
 *
 * Preserves path/query (including legacy `/browse?…` shapes). Prefer rebuilding metadata
 * via {@link buildAtlasExperimentMoleculeUrl} when upgrading to molecule deep-links.
 *
 * @param text - Zenodo description (or similar) that may contain localhost experiment links.
 * @param publicOrigin - Target public origin (defaults to {@link getAtlasPublicSiteOrigin}).
 * @returns Text with loopback origins replaced; unchanged when none match.
 */
export function rewriteLoopbackAtlasBrowseUrls(
  text: string,
  publicOrigin: string = getAtlasPublicSiteOrigin(),
): string {
  const origin = normalizePublicSiteOrigin(publicOrigin);
  return text.replace(
    /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]|[a-z0-9-]+\.localhost)(?::\d+)?(\/(?:browse(?:\/nexafs)?\?nexafsExperiment=[0-9a-fA-F-]{36}|molecules\/[^?\s"'<>]+\?nexafsExperiment=[0-9a-fA-F-]{36}))/gi,
    `${origin}$1`,
  );
}
