import { db } from "~/server/db";
import { cachePublicCatalogRead } from "~/server/cache/public-catalog-cache";

/** Live dataset and favorite counts for the curated home molecules; `{}` when the database is unavailable. */
export async function getCachedHomeMoleculeCounts(
  ids: readonly string[],
): Promise<Record<string, { datasets: number; favorites: number }>> {
  const load = cachePublicCatalogRead(
    `home-molecule-counts:${ids.join(",")}`,
    ["home-molecule-counts"],
    async () => {
      const rows = await db.molecules.findMany({
        where: { id: { in: [...ids] } },
        select: {
          id: true,
          favoritecount: true,
          samples: {
            select: { _count: { select: { experiments: true } } },
          },
        },
      });
      return Object.fromEntries(
        rows.map((r) => [
          r.id,
          {
            favorites: r.favoritecount,
            datasets: r.samples.reduce((n, s) => n + s._count.experiments, 0),
          },
        ]),
      );
    },
    600,
  );
  try {
    return await load();
  } catch {
    return {};
  }
}
