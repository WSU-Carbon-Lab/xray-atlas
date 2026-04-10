/**
 * Helpers for normalizing app role slug drafts from a display name or direct slug input.
 * Aligns with create-role UI: lowercase ASCII, and space, hyphen, and slashes become underscores.
 */

/**
 * Lowercases `raw` and maps ASCII space, hyphen (`-`), forward slash (`/`), and backslash (`\\`)
 * to underscores; collapses runs of underscores and trims leading or trailing underscores.
 *
 * @param raw - Role display name or slug field text; may be empty.
 * @returns Normalized slug fragment suitable for optional `slug` on role create; empty when `raw` is empty or only separators.
 */
export function normalizeRoleSlugInput(raw: string): string {
  const lowered = raw.toLowerCase();
  const withUnderscores = lowered.replace(/[ \-\/\\]/g, "_");
  const collapsed = withUnderscores.replace(/_+/g, "_");
  return collapsed.replace(/^_|_$/g, "");
}
