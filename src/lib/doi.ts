const DOI_PREFIX_PATTERN = /^https?:\/\/(?:dx\.)?doi\.org\//i;

const DOI_BODY_PATTERN = /^10\.\d{4,9}\/\S+$/i;

/**
 * Canonicalizes DOI input into a normalized identifier string suitable for exact database lookup.
 *
 * @param value - Raw DOI input that may be empty, already canonical, or prefixed by `https://doi.org/`.
 * @returns Canonical lowercase DOI string, or `null` when input is empty after trimming.
 */
export function normalizeDoi(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const stripped = trimmed.replace(DOI_PREFIX_PATTERN, "").toLowerCase();
  return stripped.length > 0 ? stripped : null;
}

/**
 * Returns whether `value` matches the project's minimal DOI body pattern after {@link normalizeDoi}.
 *
 * @param value - Raw or canonical DOI string.
 * @returns `true` when normalization succeeds and the body matches `10.xxxx/...`.
 */
export function isCanonicalDoiShape(value: string): boolean {
  const normalized = normalizeDoi(value);
  if (!normalized) {
    return false;
  }
  return DOI_BODY_PATTERN.test(normalized);
}

export type PublicationLookupQueryMode = "doi" | "text";

/**
 * Classifies a publication lookup query as a DOI-shaped identifier or free-text title search.
 *
 * @param query - Trimmed user input from the source-paper DOI field.
 * @returns `doi` when the string normalizes to a canonical DOI body; otherwise `text`.
 */
export function classifyPublicationLookupQuery(
  query: string,
): { mode: PublicationLookupQueryMode; normalizedDoi: string | null } {
  const trimmed = query.trim();
  if (!trimmed) {
    return { mode: "text", normalizedDoi: null };
  }
  const normalized = normalizeDoi(trimmed);
  if (normalized && isCanonicalDoiShape(normalized)) {
    return { mode: "doi", normalizedDoi: normalized };
  }
  return { mode: "text", normalizedDoi: null };
}

/**
 * Returns whether a debounced publication lookup request should run for the given mode and query.
 *
 * @param mode - Output of {@link classifyPublicationLookupQuery}.
 * @param query - Trimmed query string.
 * @returns `true` when DOI mode has a valid DOI or text mode has at least three characters.
 */
export function isPublicationLookupQueryReady(
  mode: PublicationLookupQueryMode,
  query: string,
): boolean {
  if (mode === "doi") {
    return isCanonicalDoiShape(query);
  }
  return query.trim().length >= 3;
}
