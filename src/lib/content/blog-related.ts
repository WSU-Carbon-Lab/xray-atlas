import type { BlogCategorySlug } from "~/lib/content/blog-categories";
import { isListableBlogEntry, type BlogEntry } from "~/lib/content/blog-loader";

/**
 * Lists other listable posts in the same category as `current`, newest first.
 *
 * Excludes `current` and caps results at `limit`. Returns an empty array when the
 * category has no siblings or `category` is omitted.
 */
export function categoryReadNextPosts(
  entries: BlogEntry[],
  current: BlogEntry,
  limit = 5,
  category?: BlogCategorySlug,
): BlogEntry[] {
  const categorySlug = category ?? current.frontmatter.category;

  return entries
    .filter(
      (entry) =>
        isListableBlogEntry(entry) &&
        entry.slug !== current.slug &&
        entry.frontmatter.category === categorySlug,
    )
    .slice(0, limit);
}

/**
 * Selects up to `limit` related posts ranked by shared tags, then category, then recency.
 *
 * Excludes the current post and series siblings. Returns an empty array when fewer than
 * two candidates score above zero.
 */
export function relatedBlogPosts(
  entries: BlogEntry[],
  current: BlogEntry,
  limit = 2,
): BlogEntry[] {
  const currentSeries = current.frontmatter.series?.name;
  const currentTags = new Set(current.frontmatter.tags);

  const candidates = entries.filter((entry) => {
    if (!isListableBlogEntry(entry)) {
      return false;
    }
    if (entry.slug === current.slug) {
      return false;
    }
    if (currentSeries && entry.frontmatter.series?.name === currentSeries) {
      return false;
    }
    return true;
  });

  const scored = [
    ...candidates
      .map((entry) => {
        const sharedTagCount = entry.frontmatter.tags.filter((tag) =>
          currentTags.has(tag),
        ).length;
        const sameCategory =
          entry.frontmatter.category === current.frontmatter.category ? 1 : 0;
        const score = sharedTagCount * 10 + sameCategory;
        return { entry, score, date: entry.frontmatter.date };
      })
      .filter((row) => row.score > 0),
  ].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return right.date.localeCompare(left.date);
  });

  if (scored.length < 2) {
    return [];
  }

  return scored.slice(0, limit).map((row) => row.entry);
}
