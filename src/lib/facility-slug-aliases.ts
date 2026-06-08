const FACILITY_SLUG_ALIASES: Readonly<Record<string, string>> = {
  als: "advanced-light-source",
  nslsii: "national-synchrotron-light-source-ii",
  ansto: "the-australian-synchrotron",
};

/**
 * Maps a lowercase facility acronym route segment to its canonical slug when `slug`
 * is a registered alias; returns `null` when `slug` is not an alias (case-insensitive).
 */
export function resolveFacilitySlugAlias(slug: string): string | null {
  const key = slug.trim().toLowerCase();
  return FACILITY_SLUG_ALIASES[key] ?? null;
}
