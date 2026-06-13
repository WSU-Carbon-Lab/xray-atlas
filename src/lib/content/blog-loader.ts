import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { BlogCategorySlug } from "~/lib/content/blog-categories";
import { blogSlugHash } from "~/lib/content/blog-slug-hash";
import {
  blogFrontmatterSchema,
  type BlogFrontmatter,
} from "~/lib/content/schema";

const BLOG_CONTENT_ROOT = path.join(process.cwd(), "content", "blog");

const BLOG_DATE_PREFIX_PATTERN = /^\d{4}-\d{2}(-\d{2})?-/u;

/** A blog MDX document with validated frontmatter and MDX body source. */
export interface BlogEntry {
  slug: string;
  filePath: string;
  frontmatter: BlogFrontmatter;
  body: string;
}

/**
 * Lists every `.mdx` file directly under `content/blog`.
 *
 * @returns Absolute paths to MDX files in stable lexicographic order.
 */
async function listBlogMdxFiles(
  directory: string = BLOG_CONTENT_ROOT,
): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
    .map((entry) => path.join(directory, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Maps a blog MDX filename to its public `/blog/{slug}` segment.
 *
 * Strips an optional leading calendar prefix (`2026-06-` or `2026-06-15-`)
 * before removing the `.mdx` extension.
 */
export function blogSlugFromFilePath(filePath: string): string {
  const basename = path.basename(filePath, ".mdx");
  return basename.replace(BLOG_DATE_PREFIX_PATTERN, "");
}

function sortBlogEntries(entries: BlogEntry[]): BlogEntry[] {
  return [...entries].sort((left, right) => {
    const dateCompare = right.frontmatter.date.localeCompare(
      left.frontmatter.date,
    );
    if (dateCompare !== 0) {
      return dateCompare;
    }
    return left.slug.localeCompare(right.slug);
  });
}

function assertUniqueBlogSlugs(entries: BlogEntry[]): void {
  const slugToPath = new Map<string, string>();
  for (const entry of entries) {
    const existingPath = slugToPath.get(entry.slug);
    if (existingPath) {
      throw new Error(
        `Duplicate blog slug "${entry.slug}" in ${entry.filePath} and ${existingPath}`,
      );
    }
    slugToPath.set(entry.slug, entry.filePath);
  }
}

/**
 * Parses and validates one blog MDX file into a {@link BlogEntry}.
 *
 * @param filePath - Absolute path to the `.mdx` file under `content/blog`.
 * @throws {Error} When frontmatter fails Zod validation; message includes `filePath`.
 */
export async function parseBlogMdxFile(filePath: string): Promise<BlogEntry> {
  const raw = await readFile(filePath, "utf8");
  const { content, data } = matter(raw);
  const parsed = blogFrontmatterSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error(
      `Invalid blog frontmatter in ${filePath}: ${parsed.error.message}`,
    );
  }

  return {
    slug: blogSlugFromFilePath(filePath),
    filePath,
    frontmatter: parsed.data,
    body: content,
  };
}

/**
 * Loads every blog MDX entry under `content/blog`, sorted newest first by
 * `date` with slug as the tiebreaker.
 */
export async function getBlogEntries(): Promise<BlogEntry[]> {
  const filePaths = await listBlogMdxFiles();
  const entries = await Promise.all(filePaths.map(parseBlogMdxFile));
  assertUniqueBlogSlugs(entries);
  return sortBlogEntries(entries);
}

/**
 * Resolves a blog entry by its public slug (for example `wiki-relaunch`).
 *
 * @param slug - Path segment after `/blog/` without leading or trailing slashes.
 * @returns The matching entry, or `undefined` when no MDX file maps to `slug`.
 */
export async function getBlogEntryBySlug(
  slug: string,
): Promise<BlogEntry | undefined> {
  const normalizedSlug = slug.replace(/^\/+|\/+$/gu, "");
  const entries = await getBlogEntries();
  return entries.find((entry) => entry.slug === normalizedSlug);
}

/**
 * Loads every listable (non-draft) blog entry, sorted newest first.
 */
export async function getPublishedBlogEntries(): Promise<BlogEntry[]> {
  const entries = await getBlogEntries();
  return entries.filter(isListableBlogEntry);
}

/**
 * Loads work-in-progress teaser entries for the "In the works" section.
 *
 * Returns only `category`, `displayTitle`, and `slugHash` so slugs never reach the DOM.
 */
export async function getTeaserEntries(): Promise<BlogTeaserEntry[]> {
  const entries = await getBlogEntries();
  return entries
    .filter(
      (entry) =>
        entry.frontmatter.draft && isBlogTeaser(entry.frontmatter.teaser),
    )
    .map((entry) => {
      const displayTitle = getTeaserDisplayTitle(entry);
      if (!displayTitle) {
        throw new Error(
          `Teaser entry ${entry.filePath} has teaser frontmatter but no display title`,
        );
      }
      return {
        category: entry.frontmatter.category,
        displayTitle,
        slugHash: blogSlugHash(entry.slug),
      };
    });
}

/** A work-in-progress teaser surfaced in the "In the works" section without exposing slugs. */
export interface BlogTeaserEntry {
  category: BlogCategorySlug;
  displayTitle: string;
  slugHash: string;
}

/**
 * Returns whether frontmatter `teaser` marks the post as work-in-progress (`true` or a custom string).
 */
export function isBlogTeaser(teaser: BlogFrontmatter["teaser"]): boolean {
  return teaser === true || typeof teaser === "string";
}

/**
 * Resolves the reader-facing teaser title from frontmatter `teaser` and `title`.
 */
export function getTeaserDisplayTitle(entry: BlogEntry): string | undefined {
  const { teaser, title } = entry.frontmatter;
  if (teaser === true) {
    return title;
  }
  if (typeof teaser === "string") {
    return teaser;
  }
  return undefined;
}

/**
 * Returns whether an entry is listable on indexes, feeds, sitemap, and post static params.
 *
 * Excludes drafts only. A stale `teaser` flag on a published post does not suppress listing.
 */
export function isListableBlogEntry(entry: BlogEntry): boolean {
  return !entry.frontmatter.draft;
}

/**
 * Counts tag frequency across entries and returns the top `limit` tags by count.
 */
export function topBlogTags(entries: BlogEntry[], limit = 12): string[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const tag of entry.frontmatter.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((left, right) => {
      const countCompare = right[1] - left[1];
      if (countCompare !== 0) {
        return countCompare;
      }
      return left[0].localeCompare(right[0]);
    })
    .slice(0, limit)
    .map(([tag]) => tag);
}

/**
 * Loads listable blog entries whose frontmatter `category` matches `category`.
 *
 * Results stay sorted newest-first by {@link getBlogEntries}.
 */
export async function getBlogEntriesByCategory(
  category: BlogCategorySlug,
): Promise<BlogEntry[]> {
  const entries = await getBlogEntries();
  return entries.filter(
    (entry) =>
      isListableBlogEntry(entry) && entry.frontmatter.category === category,
  );
}

/**
 * Returns the newest listable blog entry in the `releases` category, if one exists.
 */
export async function getLatestReleasePost(): Promise<BlogEntry | undefined> {
  const entries = await getBlogEntriesByCategory("releases");
  return entries[0];
}
