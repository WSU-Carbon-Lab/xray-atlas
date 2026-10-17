/**
 * Loads blog MDX from `content/blog`.
 *
 * Owns slug rules, frontmatter validation, the hourly full-entry catalog, and
 * a frontmatter-only index for list, neighbor, and sitemap reads. Does not
 * rank related posts or render MDX.
 */

import type { Dirent } from "node:fs";
import { open, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import matter from "gray-matter";
import type { BlogCategorySlug } from "~/lib/content/blog-categories";
import { blogSlugHash } from "~/lib/content/blog-slug-hash";
import {
  blogFrontmatterSchema,
  type BlogFrontmatter,
} from "~/lib/content/schema";

const BLOG_CONTENT_ROOT = path.join(process.cwd(), "content", "blog");

const BLOG_DATE_PREFIX_PATTERN = /^\d{4}-\d{2}(-\d{2})?-/u;

const MAX_FRONTMATTER_PREFIX_BYTES = 65_536;

/** A blog MDX document with validated frontmatter and MDX body source. */
export interface BlogEntry {
  slug: string;
  filePath: string;
  frontmatter: BlogFrontmatter;
  body: string;
}

/**
 * Blog catalog row with validated frontmatter and no MDX body.
 *
 * `slug` is the public `/blog/{slug}` segment. `filePath` is the absolute
 * source path. `frontmatter` includes title, date, category, draft, and teaser.
 */
export interface BlogFrontmatterIndexEntry {
  slug: string;
  filePath: string;
  frontmatter: BlogFrontmatter;
}

/**
 * Lists every `.mdx` file directly under `content/blog`.
 *
 * @returns Absolute paths to MDX files in stable lexicographic order.
 */
async function listBlogMdxFiles(): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(BLOG_CONTENT_ROOT, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
    .map((entry) => path.join(BLOG_CONTENT_ROOT, entry.name))
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

function sortBlogEntries<
  T extends { slug: string; frontmatter: { date: string } },
>(entries: readonly T[]): T[] {
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

function assertUniqueBlogSlugs(
  entries: readonly { slug: string; filePath: string }[],
): void {
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

function blogFrontmatterFromSource(
  filePath: string,
  source: string,
): { frontmatter: BlogFrontmatter; body: string } {
  const { content, data } = matter(source);
  const parsed = blogFrontmatterSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error(
      `Invalid blog frontmatter in ${filePath}: ${parsed.error.message}`,
    );
  }

  return {
    frontmatter: parsed.data,
    body: content,
  };
}

function isAsciiFence(bytes: Buffer, offset: number): boolean {
  return (
    offset + 3 <= bytes.length &&
    bytes[offset] === 0x2d &&
    bytes[offset + 1] === 0x2d &&
    bytes[offset + 2] === 0x2d
  );
}

function closingFrontmatterEnd(bytes: Buffer): number | null {
  let offset = 0;
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    offset = 3;
  }
  if (!isAsciiFence(bytes, offset)) {
    return null;
  }

  let lineStart = offset;
  while (lineStart < bytes.length && bytes[lineStart] !== 0x0a) {
    lineStart += 1;
  }
  if (lineStart >= bytes.length) {
    return null;
  }
  lineStart += 1;

  while (lineStart < bytes.length) {
    let lineEnd = lineStart;
    while (lineEnd < bytes.length && bytes[lineEnd] !== 0x0a) {
      lineEnd += 1;
    }
    if (lineEnd >= bytes.length) {
      return null;
    }
    let contentEnd = lineEnd;
    if (contentEnd > lineStart && bytes[contentEnd - 1] === 0x0d) {
      contentEnd -= 1;
    }
    if (isAsciiFence(bytes, lineStart) && contentEnd - lineStart === 3) {
      return lineEnd + 1;
    }
    lineStart = lineEnd + 1;
  }

  return null;
}

async function readLeadingFrontmatter(filePath: string): Promise<string> {
  const handle = await open(filePath, "r");
  const chunks: Buffer[] = [];
  try {
    let total = 0;
    const scratch = Buffer.alloc(4096);
    while (total < MAX_FRONTMATTER_PREFIX_BYTES) {
      const length = Math.min(
        scratch.length,
        MAX_FRONTMATTER_PREFIX_BYTES - total,
      );
      const { bytesRead } = await handle.read(scratch, 0, length, total);
      if (bytesRead === 0) {
        break;
      }
      chunks.push(Buffer.from(scratch.subarray(0, bytesRead)));
      total += bytesRead;
      const combined = Buffer.concat(chunks);
      const end = closingFrontmatterEnd(combined);
      if (end !== null) {
        return combined.subarray(0, end).toString("utf8");
      }
    }
  } finally {
    await handle.close();
  }

  const collected = Buffer.concat(chunks);
  const end = closingFrontmatterEnd(collected);
  if (end !== null) {
    return collected.subarray(0, end).toString("utf8");
  }
  if (collected.length < MAX_FRONTMATTER_PREFIX_BYTES) {
    return collected.toString("utf8");
  }
  return readFile(filePath, "utf8");
}

/**
 * Parses and validates one blog MDX file into a {@link BlogEntry}.
 *
 * @param filePath - Absolute path to the `.mdx` file under `content/blog`.
 * @throws {Error} When frontmatter fails Zod validation; message includes `filePath`.
 */
export async function parseBlogMdxFile(filePath: string): Promise<BlogEntry> {
  const raw = await readFile(filePath, "utf8");
  const { frontmatter, body } = blogFrontmatterFromSource(filePath, raw);

  return {
    slug: blogSlugFromFilePath(filePath),
    filePath,
    frontmatter,
    body,
  };
}

async function parseBlogFrontmatterFile(
  filePath: string,
): Promise<BlogFrontmatterIndexEntry> {
  const source = await readLeadingFrontmatter(filePath);
  const { frontmatter } = blogFrontmatterFromSource(filePath, source);
  return {
    slug: blogSlugFromFilePath(filePath),
    filePath,
    frontmatter,
  };
}

async function loadBlogFrontmatterIndexUncached(): Promise<
  BlogFrontmatterIndexEntry[]
> {
  const filePaths = await listBlogMdxFiles();
  const entries = await Promise.all(filePaths.map(parseBlogFrontmatterFile));
  assertUniqueBlogSlugs(entries);
  return sortBlogEntries(entries);
}

const getBlogFrontmatterIndexCrossRequest = unstable_cache(
  loadBlogFrontmatterIndexUncached,
  ["blog-frontmatter-index"],
  { revalidate: 3600, tags: ["blog"] },
);

/**
 * Loads every blog MDX file's validated frontmatter, newest `date` first,
 * with slug as the tiebreaker. Omits MDX bodies.
 *
 * Results are deduplicated per request and revalidated hourly across requests.
 * Throws when two files share a slug or frontmatter fails validation, with the
 * offending path in the error message.
 */
export const getBlogFrontmatterIndex = cache(
  getBlogFrontmatterIndexCrossRequest,
);

/**
 * Copies an index row into a {@link BlogEntry} whose `body` is an empty string.
 *
 * List cards, neighbor links, and RSS items read frontmatter only. The empty
 * body is not article source. Use {@link getBlogEntryBySlug} or
 * {@link getBlogEntries} when the MDX body is required.
 *
 * @param entry - Frontmatter index row to copy.
 * @returns The same slug, path, and frontmatter with `body` set to `""`.
 */
export function blogEntryWithoutBody(
  entry: BlogFrontmatterIndexEntry,
): BlogEntry {
  return {
    slug: entry.slug,
    filePath: entry.filePath,
    frontmatter: entry.frontmatter,
    body: "",
  };
}

async function loadBlogEntriesUncached(): Promise<BlogEntry[]> {
  const filePaths = await listBlogMdxFiles();
  const entries = await Promise.all(filePaths.map(parseBlogMdxFile));
  assertUniqueBlogSlugs(entries);
  return sortBlogEntries(entries);
}

const getBlogEntriesCrossRequest = unstable_cache(
  loadBlogEntriesUncached,
  ["blog-entries-all"],
  { revalidate: 3600, tags: ["blog"] },
);

/**
 * Loads every blog MDX entry under `content/blog`, sorted newest first by
 * `date` with slug as the tiebreaker. Each entry includes its MDX body.
 *
 * Results are deduplicated per request and revalidated hourly across requests.
 * Callers that only need titles, dates, or neighbor links should use
 * {@link getBlogFrontmatterIndex} instead.
 */
export const getBlogEntries = cache(getBlogEntriesCrossRequest);

async function loadBlogEntryBySlug(
  slug: string,
): Promise<BlogEntry | undefined> {
  const normalizedSlug = slug.replace(/^\/+|\/+$/gu, "");
  const entries = await getBlogFrontmatterIndex();
  const match = entries.find((entry) => entry.slug === normalizedSlug);
  if (!match) {
    return undefined;
  }
  return parseBlogMdxFile(match.filePath);
}

/**
 * Resolves a blog entry by its public slug (for example `wiki-relaunch`).
 *
 * Looks the slug up in {@link getBlogFrontmatterIndex}, then reads that one
 * MDX file. Does not scan the content directory. Repeated calls with the same
 * `slug` in one request share one read, including `generateMetadata` and the
 * page.
 *
 * @param slug - Path segment after `/blog/` without leading or trailing slashes.
 * @returns The matching entry, or `undefined` when no MDX file maps to `slug`.
 * @throws {Error} When the matched file's frontmatter fails validation.
 */
export const getBlogEntryBySlug = cache(loadBlogEntryBySlug);

/**
 * Loads every listable (non-draft) blog entry, sorted newest first.
 *
 * Includes each MDX body. Prefer {@link getBlogFrontmatterIndex} when the
 * caller only renders titles or descriptions.
 */
export async function getPublishedBlogEntries(): Promise<BlogEntry[]> {
  const entries = await getBlogEntries();
  return entries.filter(isListableBlogEntry);
}

/**
 * Loads work-in-progress teaser entries for the "In the works" section.
 *
 * Reads the frontmatter index only. Returns `category`, `displayTitle`, and
 * `slugHash` so slugs never reach the DOM.
 *
 * @throws {Error} When a teaser row has no display title.
 */
export async function getTeaserEntries(): Promise<BlogTeaserEntry[]> {
  const entries = await getBlogFrontmatterIndex();
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
 *
 * @param entry - Row whose frontmatter `teaser` is `true` (use `title`) or a custom string.
 * @returns That display title, or `undefined` when `teaser` is not set.
 */
export function getTeaserDisplayTitle(entry: {
  frontmatter: Pick<BlogFrontmatter, "teaser" | "title">;
}): string | undefined {
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
 *
 * @param entry - Catalog or full entry whose frontmatter `draft` flag is checked.
 */
export function isListableBlogEntry(entry: {
  frontmatter: { draft: boolean };
}): boolean {
  return !entry.frontmatter.draft;
}

/**
 * Counts tag frequency across entries and returns the top `limit` tags by count.
 *
 * @param entries - Entries whose frontmatter `tags` are counted.
 * @param limit - Maximum tags to return. Defaults to 12.
 * @returns Tag names, highest count first, then lexicographic tag name.
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
 * Results stay sorted newest-first by {@link getBlogEntries} and include MDX
 * bodies. Use {@link getBlogFrontmatterIndex} when bodies are unused.
 *
 * @param category - Blog category slug to keep.
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
 *
 * Selects the row from {@link getBlogFrontmatterIndex}, then reads that one
 * MDX file so the returned {@link BlogEntry} still includes its body.
 *
 * @returns That entry, or `undefined` when no listable release post exists.
 * @throws {Error} When the selected file's frontmatter fails validation.
 */
export async function getLatestReleasePost(): Promise<BlogEntry | undefined> {
  const entries = await getBlogFrontmatterIndex();
  const match = entries.find(
    (entry) =>
      isListableBlogEntry(entry) && entry.frontmatter.category === "releases",
  );
  if (!match) {
    return undefined;
  }
  return parseBlogMdxFile(match.filePath);
}
