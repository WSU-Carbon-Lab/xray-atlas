/**
 * Shareable NEXAFS experiment deep-link helpers for molecule detail and Zenodo metadata.
 *
 * Canonical shape: `/molecules/{slug}?nexafsExperiment={uuid}` — lands on the molecule page
 * with that experiment card expanded. Does not own browse facet state; callers preserve the
 * query key when rewriting other search params.
 */

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
