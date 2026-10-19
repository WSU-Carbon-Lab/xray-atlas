/**
 * Published Dev Docs releases.
 *
 * Unversioned `/docs` URLs are the latest release. `/docs/v/<id>` pins one
 * release. The catalog is the only list the version selector and the
 * versioned docs route accept.
 */

export interface DocsVersion {
  readonly id: string;
  readonly label: string;
  readonly latest: boolean;
}

/** Releases a reader can open. The newest entry is `latest`. */
export const docsVersions: readonly DocsVersion[] = [
  { id: "1.0.0", label: "v1.0.0", latest: true },
];

/**
 * Returns the release served at unversioned `/docs` URLs.
 *
 * @returns The catalog entry flagged `latest`.
 * @throws {Error} when the catalog has no latest release.
 */
export function latestDocsVersion(): DocsVersion {
  const latest = docsVersions.find((version) => version.latest);
  if (!latest) {
    throw new Error("Dev Docs require one latest release.");
  }
  return latest;
}

/**
 * Looks up a release id from a `/docs/v/<id>` segment.
 *
 * @param id - Version id such as `1.0.0`, without a `v` prefix.
 * @returns The catalog entry, or `undefined` when that release is not published.
 */
export function docsVersionById(id: string): DocsVersion | undefined {
  return docsVersions.find((version) => version.id === id);
}

/**
 * Reads the pinned release from a docs pathname.
 *
 * @param pathname - Browser pathname, with no query or hash.
 * @returns The catalog entry when the path is `/docs/v/<id>`, otherwise `null`.
 */
export function docsVersionFromPath(pathname: string): DocsVersion | null {
  const match = /^\/docs\/v\/([^/]+)(?:\/|$)/.exec(pathname);
  const id = match?.[1];
  if (!id) {
    return null;
  }
  return docsVersionById(id) ?? null;
}

/**
 * Strips a `/docs/v/<id>` prefix so nav matching uses the stable docs path.
 *
 * @param pathname - Browser or rewritten pathname, with no query or hash.
 * @returns A path beginning with `/docs`.
 */
export function canonicalDocsPath(pathname: string): string {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  const match = /^\/docs\/v\/[^/]+(.*)$/.exec(normalized);
  if (!match) {
    return normalized;
  }
  const rest = match[1];
  return rest && rest.length > 0 ? `/docs${rest}` : "/docs";
}

/**
 * Builds the href for `canonicalPath` on a pinned release.
 *
 * @param canonicalPath - Unversioned docs path such as `/docs/cli`.
 * @param pinned - Release to pin. `null` keeps the latest, unversioned URL.
 * @returns The path the version selector and sidebar should use.
 */
export function hrefForDocsVersion(
  canonicalPath: string,
  pinned: DocsVersion | null,
): string {
  if (!pinned) {
    return canonicalPath;
  }
  if (canonicalPath === "/docs") {
    return `/docs/v/${pinned.id}`;
  }
  return `/docs/v/${pinned.id}${canonicalPath.slice("/docs".length)}`;
}
