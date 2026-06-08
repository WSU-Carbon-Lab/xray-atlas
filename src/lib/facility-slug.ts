export type FacilitySlugSource = {
  name: string;
};

/**
 * Normalizes a facility display name into a URL path segment: lowercase, non-alphanumerics
 * become hyphens, leading and trailing hyphens are removed, and an empty result becomes
 * `facility`.
 */
export function slugifyFacilityName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base.length > 0 ? base : "facility";
}

/**
 * Returns the canonical facility slug derived from `name`, the persisted source when no
 * dedicated `facilities.slug` column is present.
 */
export function canonicalFacilitySlugFromName(name: string): string {
  return slugifyFacilityName(name);
}

/**
 * Returns the canonical facility slug for routing and metadata from a facility record shape.
 */
export function canonicalFacilitySlugFromView(
  facility: FacilitySlugSource,
): string {
  return canonicalFacilitySlugFromName(facility.name);
}
