function hashSlug(slug: string): number {
  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash * 31 + slug.charCodeAt(index)) >>> 0;
  }
  return hash;
}

/**
 * Returns a deterministic opaque hash for a blog slug used in teaser tiles without
 * exposing the slug in the DOM.
 */
export function blogSlugHash(slug: string): string {
  const hash = hashSlug(slug);
  return hash.toString(16).padStart(8, "0");
}
