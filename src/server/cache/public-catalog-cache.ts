import { unstable_cache } from "next/cache";

/**
 * Short-lived server cache for anonymous catalog reads used by browse and plot-viewer pickers.
 *
 * @param key Stable cache segment name.
 * @param tags Next.js cache tags for targeted invalidation.
 * @param loader Async function that loads catalog data from Postgres.
 * @param revalidateSeconds TTL in seconds (default 90).
 */
export function cachePublicCatalogRead<T>(
  key: string,
  tags: readonly string[],
  loader: () => Promise<T>,
  revalidateSeconds = 90,
): () => Promise<T> {
  return unstable_cache(loader, [key], {
    revalidate: revalidateSeconds,
    tags: [...tags],
  });
}
