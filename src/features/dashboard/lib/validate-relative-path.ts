/**
 * Validates one filesystem path segment for STXM catalog walks.
 *
 * Rejects empty segments and parent-directory traversal (`..`).
 *
 * @param segment - Single path component between slashes.
 */
export function isValidRelativePathSegment(segment: string): boolean {
  if (segment.length === 0) {
    return false;
  }
  if (segment === "." || segment === "..") {
    return false;
  }
  if (segment.includes("/") || segment.includes("\\")) {
    return false;
  }
  return true;
}

/**
 * Validates a relative path built from slash-separated segments.
 *
 * @param relativePath - Path relative to a beamtime or experiment root.
 */
export function isValidStxmRelativePath(relativePath: string): boolean {
  if (relativePath.length === 0 || relativePath.length > 1024) {
    return false;
  }
  if (relativePath.startsWith("/") || relativePath.endsWith("/")) {
    return false;
  }
  const segments = relativePath.split("/");
  return segments.every(isValidRelativePathSegment);
}
