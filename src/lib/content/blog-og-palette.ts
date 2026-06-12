function hashSlug(slug: string): number {
  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash * 31 + slug.charCodeAt(index)) >>> 0;
  }
  return hash;
}

/**
 * Returns deterministic oklch gradient stops for blog OG tiles keyed by slug or title seed.
 */
export function blogOgTilePalette(seed: string): {
  primary: string;
  secondary: string;
} {
  const hash = hashSlug(seed);
  const hueA = hash % 360;
  const hueB = (hueA + 40 + (hash % 80)) % 360;
  return {
    primary: `oklch(0.62 0.14 ${hueA})`,
    secondary: `oklch(0.78 0.08 ${hueB})`,
  };
}
