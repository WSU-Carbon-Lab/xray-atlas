/**
 * Canonical blog category registry and lookup helpers.
 *
 * Category slugs are the single source of truth for frontmatter validation,
 * routes, RSS feeds, and UI labels. Do not duplicate category strings elsewhere.
 */

/** URL-safe blog category slug used in frontmatter, routes, and feeds. */
export type BlogCategorySlug =
  | "releases"
  | "technical"
  | "perspectives"
  | "guides";

/** One blog category with route slug, reader-facing label, kicker, and index copy. */
export interface BlogCategoryDefinition {
  slug: BlogCategorySlug;
  label: string;
  kicker: string;
  description: string;
}

/** Tuple of category slugs for Zod enums and static param generation. */
export const BLOG_CATEGORY_SLUGS = [
  "releases",
  "technical",
  "perspectives",
  "guides",
] as const satisfies readonly BlogCategorySlug[];

/** Ordered registry of the four blog categories. */
export const BLOG_CATEGORIES: readonly BlogCategoryDefinition[] = [
  {
    slug: "releases",
    label: "Releases",
    kicker: "RELEASE",
    description: "Platform releases, milestones, and what shipped.",
  },
  {
    slug: "technical",
    label: "Technical",
    kicker: "TECHNICAL",
    description: "Architecture, infrastructure, and implementation notes.",
  },
  {
    slug: "perspectives",
    label: "Perspectives",
    kicker: "PERSPECTIVE",
    description: "Product direction, philosophy, and community context.",
  },
  {
    slug: "guides",
    label: "Guides",
    kicker: "HOW-TO",
    description: "Practical walkthroughs for contributors and researchers.",
  },
];

const categoryBySlug = new Map<BlogCategorySlug, BlogCategoryDefinition>(
  BLOG_CATEGORIES.map((category) => [category.slug, category]),
);

/**
 * Returns the registry entry for `slug`, or `undefined` when the slug is unknown.
 */
export function getBlogCategory(
  slug: string,
): BlogCategoryDefinition | undefined {
  if (!isBlogCategorySlug(slug)) {
    return undefined;
  }
  return categoryBySlug.get(slug);
}

/**
 * Narrows `slug` to a known blog category slug.
 */
export function isBlogCategorySlug(slug: string): slug is BlogCategorySlug {
  return categoryBySlug.has(slug as BlogCategorySlug);
}

/**
 * Builds the public index path for a category (`/blog/category/{slug}`).
 */
export function blogCategoryHref(slug: BlogCategorySlug): string {
  return `/blog/category/${slug}`;
}

/**
 * Builds the RSS feed path for a category (`/blog/category/{slug}/rss.xml`).
 */
export function blogCategoryRssHref(slug: BlogCategorySlug): string {
  return `/blog/category/${slug}/rss.xml`;
}
