import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/** Filesystem root for blog post images co-located under `content/blog/blog-assets`. */
export const BLOG_ASSETS_ROOT = path.join(
  process.cwd(),
  "content",
  "blog",
  "blog-assets",
);

/** Public URL prefix for assets served from {@link BLOG_ASSETS_ROOT}. */
export const BLOG_ASSETS_URL_PREFIX = "/blog/blog-assets";

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

/**
 * Maps a blog asset file extension to an HTTP `Content-Type` value.
 *
 * @param extension - Lowercase extension including the leading dot.
 * @returns A MIME type when recognized; otherwise `application/octet-stream`.
 */
export function blogAssetContentType(extension: string): string {
  return (
    MIME_BY_EXTENSION[extension.toLowerCase()] ?? "application/octet-stream"
  );
}

/**
 * Resolves a public blog asset path segment list to an absolute filesystem path
 * under {@link BLOG_ASSETS_ROOT}.
 *
 * Rejects path traversal (`..`) and paths that escape the assets root.
 *
 * @param segments - URL path segments after `/blog/blog-assets/`.
 * @returns Absolute path to the asset when safe; otherwise `undefined`.
 */
export function resolveBlogAssetPath(segments: string[]): string | undefined {
  if (segments.length === 0) {
    return undefined;
  }

  if (segments.some((segment) => segment.length === 0 || segment === ".")) {
    return undefined;
  }

  if (segments.some((segment) => segment === ".." || segment.includes("\\"))) {
    return undefined;
  }

  const candidate = path.join(BLOG_ASSETS_ROOT, ...segments);
  const resolvedRoot = path.resolve(BLOG_ASSETS_ROOT);
  const resolvedCandidate = path.resolve(candidate);

  if (
    resolvedCandidate !== resolvedRoot &&
    !resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    return undefined;
  }

  return resolvedCandidate;
}

/**
 * Reads one blog asset from disk when {@link resolveBlogAssetPath} accepts the
 * segment list.
 *
 * @param segments - URL path segments after `/blog/blog-assets/`.
 * @returns File bytes and MIME type on success; otherwise `undefined`.
 */
export async function readBlogAsset(
  segments: string[],
): Promise<{ body: Buffer; contentType: string } | undefined> {
  const filePath = resolveBlogAssetPath(segments);
  if (!filePath) {
    return undefined;
  }

  try {
    const body = await readFile(filePath);
    const contentType = blogAssetContentType(path.extname(filePath));
    return { body, contentType };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

/**
 * Recursively lists every file under `directory`, relative to {@link BLOG_ASSETS_ROOT}.
 *
 * Assets are grouped into per-post subdirectories (for example
 * `beta-uploading-data/data.png`), so this walks one level of nesting in
 * addition to the historical flat layout.
 *
 * @param directory - Absolute directory to walk; defaults to the assets root.
 * @returns Path segment arrays relative to {@link BLOG_ASSETS_ROOT}, sorted.
 */
async function walkBlogAssetFiles(
  directory: string = BLOG_ASSETS_ROOT,
): Promise<string[][]> {
  let entries: Dirent[];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const files: string[][] = [];
  const childDirs: Dirent[] = [];

  for (const entry of entries) {
    if (entry.isFile()) {
      const relative = path.relative(
        BLOG_ASSETS_ROOT,
        path.join(directory, entry.name),
      );
      files.push(relative.split(path.sep));
    } else if (entry.isDirectory()) {
      childDirs.push(entry);
    }
  }

  const nested = await Promise.all(
    childDirs.map((dir) => walkBlogAssetFiles(path.join(directory, dir.name))),
  );

  return [...files, ...nested.flat()].sort((left, right) =>
    left.join("/").localeCompare(right.join("/")),
  );
}

/**
 * Lists public URL path segments for every file under `content/blog/blog-assets`,
 * including per-post subdirectories.
 *
 * Used to pre-render asset routes at build time.
 */
export async function listBlogAssetPathSegments(): Promise<string[][]> {
  return walkBlogAssetFiles();
}
