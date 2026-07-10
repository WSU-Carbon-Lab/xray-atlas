/**
 * Shareable NEXAFS experiment deep-link helpers for molecule detail and Zenodo metadata.
 *
 * Preferred citation URL: `/d/{atlasDatasetId}` (opaque short id).
 * Legacy expand link: `/molecules/{slug}?nexafsExperiment={uuid}`.
 */

import {
  atlasDatasetPath,
  normalizeAtlasDatasetId,
} from "~/lib/atlas-dataset-id";

export const NEXAFS_EXPERIMENT_SEARCH_PARAM = "nexafsExperiment" as const;

const EXPERIMENT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Parses a `nexafsExperiment` search-param value into a UUID string.
 *
 * @param raw - Raw query value from `URLSearchParams.get`, or `null`.
 * @returns Trimmed UUID when valid; otherwise `null`.
 */
export function parseNexafsExperimentSearchParam(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!EXPERIMENT_UUID_RE.test(trimmed)) return null;
  return trimmed;
}

/**
 * Builds a relative molecule deep-link path for an Atlas NEXAFS experiment.
 *
 * @param moleculeSlug - Canonical molecule synonym slug (path segment).
 * @param experimentId - Atlas experiment UUID.
 * @returns Path like `/molecules/polystyrene?nexafsExperiment=…`.
 */
export function moleculeNexafsExperimentHref(
  moleculeSlug: string,
  experimentId: string,
): string {
  const slug = moleculeSlug.trim().replace(/^\/+|\/+$/g, "");
  const safeSlug = slug.length > 0 ? slug : "molecule";
  return `/molecules/${safeSlug}?${NEXAFS_EXPERIMENT_SEARCH_PARAM}=${experimentId}`;
}

/**
 * Builds a path that drops `nexafsExperiment` when it matches `experimentId`.
 *
 * Used when collapsing a deep-linked dataset card so the address bar returns to
 * `/molecules/{slug}` (or the same path with unrelated query keys preserved).
 *
 * @param pathname - Current path without query (e.g. `/molecules/polystyrene`).
 * @param search - Current search string, with or without a leading `?`.
 * @param experimentId - Experiment UUID that owns the deep link.
 * @returns Updated path when the param was removed; `null` when unchanged.
 */
export function pathnameWithoutNexafsExperimentDeepLink(
  pathname: string,
  search: string,
  experimentId: string,
): string | null {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const current = parseNexafsExperimentSearchParam(
    params.get(NEXAFS_EXPERIMENT_SEARCH_PARAM),
  );
  if (current === null || current !== experimentId) return null;
  params.delete(NEXAFS_EXPERIMENT_SEARCH_PARAM);
  const qs = params.toString();
  return qs.length > 0 ? `${pathname}?${qs}` : pathname;
}

/**
 * Builds the short citation path for an Atlas dataset id.
 *
 * @param atlasDatasetId - Opaque 8-character Atlas dataset id.
 * @returns Path like `/d/k7m2xq4n`.
 */
export function atlasDatasetCitationHref(atlasDatasetId: string): string {
  const id = normalizeAtlasDatasetId(atlasDatasetId);
  if (!id) {
    throw new Error(`Invalid Atlas dataset id: ${atlasDatasetId}`);
  }
  return atlasDatasetPath(id);
}
