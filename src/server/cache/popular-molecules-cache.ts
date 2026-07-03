import type { PrismaClient } from "~/prisma/client";
import { cachePublicCatalogRead } from "~/server/cache/public-catalog-cache";
import { queryMoleculeIdsByPopularityRank } from "~/server/api/routers/molecules-popularity-ranking";

/**
 * Loads popularity-ranked molecule rows for the home carousel and similar surfaces.
 */
async function loadPopularMoleculeRows(db: PrismaClient, limit: number) {
  const orderedIds = await queryMoleculeIdsByPopularityRank(db, limit);
  if (orderedIds.length === 0) {
    return [];
  }

  const molecules = await db.molecules.findMany({
    where: { id: { in: orderedIds } },
    include: {
      moleculesynonyms: {
        orderBy: [{ order: "asc" }],
      },
      moleculecontributors: {
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: { contributedat: "asc" },
      },
      moleculetags: { include: { tags: true } },
      samples: {
        include: { _count: { select: { experiments: true } } },
      },
    },
  });

  const idOrder = new Map(orderedIds.map((id, index) => [id, index]));
  molecules.sort(
    (left, right) => (idOrder.get(left.id) ?? 0) - (idOrder.get(right.id) ?? 0),
  );

  return molecules.map((molecule) => ({
    ...molecule,
    moleculesynonyms: [
      ...molecule.moleculesynonyms
        .filter((synonym) => synonym.order === 0)
        .sort((left, right) => left.synonym.length - right.synonym.length),
      ...molecule.moleculesynonyms
        .filter((synonym) => synonym.order !== 0)
        .sort((left, right) => left.synonym.length - right.synonym.length),
    ],
  }));
}

export type PopularMoleculeRow = Awaited<
  ReturnType<typeof loadPopularMoleculeRows>
>[number];

/**
 * Returns cached popularity-ranked molecule rows for anonymous catalog reads.
 */
export function getCachedPopularMoleculeRows(
  db: PrismaClient,
  limit: number,
): Promise<Awaited<ReturnType<typeof loadPopularMoleculeRows>>> {
  const loadCached = cachePublicCatalogRead(
    `popular-molecules:${limit}`,
    ["molecules", "popular-molecules"],
    () => loadPopularMoleculeRows(db, limit),
    120,
  );
  return loadCached();
}
