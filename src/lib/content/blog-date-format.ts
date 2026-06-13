/**
 * Client-safe blog date formatting without MDX/remark dependencies.
 *
 * Keeps calendar-day display helpers out of `blog-presentation.ts` so Header and
 * account menu client components do not import unified/remark at module init.
 */

/**
 * Formats a blog calendar day (`YYYY-MM-DD`) for display.
 *
 * When `relative` is true and the post is within the last 14 days, returns compact
 * relative labels (`Today`, `Yesterday`, `N days ago`). Otherwise returns a long-form
 * US locale date. On statically generated blog routes, relative strings reflect the
 * build timestamp until the next deployment.
 */
export function formatBlogDate(
  isoDate: string,
  options?: { relative?: boolean; now?: Date },
): string {
  const date = new Date(`${isoDate}T12:00:00.000Z`);
  const now = options?.now ?? new Date();

  if (options?.relative) {
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 14) {
      if (diffDays === 0) {
        return "Today";
      }
      if (diffDays === 1) {
        return "Yesterday";
      }
      return `${diffDays} days ago`;
    }
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
