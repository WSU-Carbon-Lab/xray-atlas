import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import {
  wikiFrontmatterSchema,
  type WikiFrontmatter,
} from "~/lib/content/schema";

const WIKI_CONTENT_ROOT = path.join(process.cwd(), "content", "wiki");

/** A wiki MDX document with validated frontmatter and MDX body source. */
export interface WikiEntry {
  slug: string;
  filePath: string;
  frontmatter: WikiFrontmatter;
  body: string;
}

/**
 * Recursively lists every `.mdx` file under `content/wiki`.
 *
 * @returns Absolute paths to MDX files in stable lexicographic order.
 */
async function listWikiMdxFiles(
  directory: string = WIKI_CONTENT_ROOT,
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

  const files: string[] = [];
  const childDirs: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      childDirs.push(entryPath);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".mdx")) {
      files.push(entryPath);
    }
  }

  childDirs.sort((left, right) => left.localeCompare(right));
  const nested = await Promise.all(childDirs.map(listWikiMdxFiles));
  return [
    ...files.sort((left, right) => left.localeCompare(right)),
    ...nested.flat(),
  ];
}

/**
 * Maps a wiki MDX file path to its public `/wiki/{slug}` segment.
 *
 * Strips the `.mdx` extension and treats a trailing `index` basename as a
 * directory index (`foo/index.mdx` becomes slug `foo`).
 */
export function wikiSlugFromFilePath(filePath: string): string {
  const relativePath = path.relative(WIKI_CONTENT_ROOT, filePath);
  const withoutExtension = relativePath.replace(/\.mdx$/u, "");
  const segments = withoutExtension.split(path.sep);
  if (segments.at(-1) === "index") {
    segments.pop();
  }
  return segments.join("/");
}

/**
 * Parses and validates one wiki MDX file into a {@link WikiEntry}.
 *
 * @param filePath - Absolute path to the `.mdx` file under `content/wiki`.
 * @throws {Error} When frontmatter fails Zod validation; message includes `filePath`.
 */
export async function parseWikiMdxFile(filePath: string): Promise<WikiEntry> {
  const raw = await readFile(filePath, "utf8");
  const { content, data } = matter(raw);
  const parsed = wikiFrontmatterSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error(
      `Invalid wiki frontmatter in ${filePath}: ${parsed.error.message}`,
    );
  }

  return {
    slug: wikiSlugFromFilePath(filePath),
    filePath,
    frontmatter: parsed.data,
    body: content,
  };
}

/**
 * Loads every wiki MDX entry under `content/wiki`, sorted by slug.
 */
export async function getWikiEntries(): Promise<WikiEntry[]> {
  const filePaths = await listWikiMdxFiles();
  const entries = await Promise.all(filePaths.map(parseWikiMdxFile));
  return entries.sort((left, right) => left.slug.localeCompare(right.slug));
}

/**
 * Resolves a wiki entry by its public slug (for example `contributions` or `foo/bar`).
 *
 * @param slug - Path segment after `/wiki/` without leading or trailing slashes.
 * @returns The matching entry, or `undefined` when no MDX file maps to `slug`.
 */
export async function getWikiEntryBySlug(
  slug: string,
): Promise<WikiEntry | undefined> {
  const normalizedSlug = slug.replace(/^\/+|\/+$/gu, "");
  const entries = await getWikiEntries();
  return entries.find((entry) => entry.slug === normalizedSlug);
}
