/**
 * Built-in application roles that form a single "lineage" tier: Contributor, Maintainer, Administrator.
 * Users may hold any number of custom roles, but at most one of these slugs at a time.
 */
export const APP_LINEAGE_ROLE_SLUGS = [
  "administrator",
  "maintainer",
  "contributor",
] as const;

export type AppLineageRoleSlug = (typeof APP_LINEAGE_ROLE_SLUGS)[number];

/**
 * Slug for the top lineage tier. Management-capability checks treat this role as granting
 * admin-console access even when legacy `can_manage_users` columns drift after migrations.
 */
export const APP_ADMINISTRATOR_SLUG: AppLineageRoleSlug = "administrator";

const LINEAGE_SLUG_SET = new Set<string>(APP_LINEAGE_ROLE_SLUGS);

/**
 * Counts how many of the given slugs are lineage roles (`administrator`, `maintainer`, `contributor`).
 *
 * @param slugs - Role slugs from `AppRole.slug`, in any order.
 * @returns The number of lineage slugs present (0, 1, or more).
 */
export function countLineageRolesInSlugs(slugs: readonly string[]): number {
  return slugs.filter((s) => LINEAGE_SLUG_SET.has(s)).length;
}

/**
 * Reports whether a slug is one of the three fixed lineage roles.
 *
 * @param slug - `AppRole.slug` to test.
 */
export function isLineageRoleSlug(slug: string): boolean {
  return LINEAGE_SLUG_SET.has(slug);
}
