import {
  isBlogTeaser,
  isListableBlogEntry,
  type BlogEntry,
} from "~/lib/content/blog-loader";
import type { BlogFrontmatter } from "~/lib/content/schema";

/** One part row in a blog series navigation box. */
export interface BlogSeriesPartRow {
  part: number;
  slug?: string;
  title: string;
  isCurrent: boolean;
  isPublished: boolean;
}

/**
 * Returns every entry sharing `seriesName`, ordered by `series.part` ascending.
 */
export function blogEntriesInSeries(
  entries: BlogEntry[],
  seriesName: string,
): BlogEntry[] {
  return [
    ...entries.filter((entry) => entry.frontmatter.series?.name === seriesName),
  ].sort(
    (left, right) =>
      left.frontmatter.series!.part - right.frontmatter.series!.part,
  );
}

/**
 * Builds series part rows for the article series box.
 *
 * Unpublished draft teasers render as "Part n, coming soon" without leaking titles.
 */
export function blogSeriesPartRows(
  entries: BlogEntry[],
  current: BlogEntry,
): BlogSeriesPartRow[] {
  const series = current.frontmatter.series;
  if (!series) {
    return [];
  }

  return blogEntriesInSeries(entries, series.name).map((entry) => {
    const part = entry.frontmatter.series!.part;
    const published = isListableBlogEntry(entry);
    const redactedTeaser =
      entry.frontmatter.draft && isBlogTeaser(entry.frontmatter.teaser);

    return {
      part,
      slug: published ? entry.slug : undefined,
      title: published
        ? entry.frontmatter.title
        : redactedTeaser
          ? `Part ${part}, coming soon`
          : entry.frontmatter.title,
      isCurrent: entry.slug === current.slug,
      isPublished: published,
    };
  });
}

/**
 * Resolves previous and next post links with series order first, then category.
 */
export function adjacentBlogPosts(
  entries: BlogEntry[],
  slug: string,
  frontmatter: BlogFrontmatter,
): {
  previous?: { slug: string; title: string };
  next?: { slug: string; title: string };
} {
  const published = entries.filter(isListableBlogEntry);
  const seriesName = frontmatter.series?.name;

  if (seriesName) {
    const seriesPublished = blogEntriesInSeries(published, seriesName);
    const seriesIndex = seriesPublished.findIndex(
      (entry) => entry.slug === slug,
    );
    if (seriesIndex !== -1) {
      const previous = seriesPublished[seriesIndex + 1];
      const next = seriesPublished[seriesIndex - 1];
      return {
        previous: previous
          ? { slug: previous.slug, title: previous.frontmatter.title }
          : undefined,
        next: next
          ? { slug: next.slug, title: next.frontmatter.title }
          : undefined,
      };
    }
  }

  const inCategory = published.filter(
    (entry) => entry.frontmatter.category === frontmatter.category,
  );
  const index = inCategory.findIndex((entry) => entry.slug === slug);
  if (index === -1) {
    return {};
  }

  const previous = inCategory[index + 1];
  const next = inCategory[index - 1];
  return {
    previous: previous
      ? { slug: previous.slug, title: previous.frontmatter.title }
      : undefined,
    next: next ? { slug: next.slug, title: next.frontmatter.title } : undefined,
  };
}
