/**
 * Cached public molecule browse pages and tag counts.
 *
 * Owns the anonymous catalog query for `/browse/molecules` and the tag facet
 * counts that share that page. Favorite flags stay outside the cache so a
 * signed-in user still sees their own hearts. Does not apply search ranking.
 */

import type { Prisma, PrismaClient } from "~/prisma/client";
import type { MoleculeView } from "~/types/molecule";
import { cachePublicCatalogRead } from "~/server/cache/public-catalog-cache";
import { toMoleculeView } from "~/server/api/routers/molecules-view";
import {
  normalizeMoleculeBrowseFilters,
  prismaMoleculeBrowseWhere,
  sqlMoleculeBrowseFilters,
  type MoleculeBrowseFiltersInput,
} from "~/server/molecules/molecule-browse-filters";

const MOLECULE_BROWSE_PAGE_REVALIDATE_SECONDS = 60;
const MOLECULE_BROWSE_TAG_REVALIDATE_SECONDS = 120;

const moleculeBrowseInclude = {
  moleculesynonyms: { orderBy: [{ order: "asc" as const }] },
  moleculecontributors: {
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
    orderBy: [{ contributedat: "asc" as const }],
  },
  moleculetags: { include: { tags: true } },
  samples: {
    include: { _count: { select: { experiments: true } } },
  },
} satisfies Prisma.moleculesInclude;

type MoleculeBrowseRow = Prisma.moleculesGetPayload<{
  include: typeof moleculeBrowseInclude;
}>;

/** Sort key accepted by `molecules.getAllPaginated`. */
export type MoleculeBrowseSortKey =
  | "favorites"
  | "created"
  | "name"
  | "views"
  | "datasets";

/** Page request for the public molecule catalog, before per-user favorite overlay. */
export interface MoleculeBrowsePageQuery extends MoleculeBrowseFiltersInput {
  limit: number;
  offset: number;
  sortBy: MoleculeBrowseSortKey;
}

/** One cached browse page. `userHasFavorited` is always false. */
export interface MoleculeBrowsePage {
  molecules: MoleculeView[];
  total: number;
}

/** Tag facet row for the molecule browse filter. */
export interface MoleculeBrowseTagCount {
  id: string;
  label: string;
  color: string | null;
  count: number;
}

/**
 * Builds the catalog cache key for a browse page. Tag ids are sorted so
 * equivalent filters share one entry.
 */
export function moleculeBrowsePageCacheKey(
  input: MoleculeBrowsePageQuery,
): string {
  const filters = normalizeMoleculeBrowseFilters(input);
  const tags = [...filters.tagIds].sort().join(",");
  return [
    "molecule-browse-page",
    input.sortBy,
    String(input.limit),
    String(input.offset),
    tags,
    filters.hasExperimentData ? "1" : "0",
    filters.hasCas ? "1" : "0",
    filters.hasPubchem ? "1" : "0",
  ].join(":");
}

function sortBrowseSynonyms(row: MoleculeBrowseRow): MoleculeBrowseRow {
  return {
    ...row,
    moleculesynonyms: [
      ...row.moleculesynonyms
        .filter((synonym) => synonym.order === 0)
        .sort((left, right) => left.synonym.length - right.synonym.length),
      ...row.moleculesynonyms
        .filter((synonym) => synonym.order !== 0)
        .sort((left, right) => left.synonym.length - right.synonym.length),
    ],
  };
}

async function loadRowsByIds(
  db: PrismaClient,
  ids: string[],
): Promise<MoleculeBrowseRow[]> {
  if (ids.length === 0) {
    return [];
  }
  const found = await db.molecules.findMany({
    where: { id: { in: ids } },
    include: moleculeBrowseInclude,
  });
  const idToIndex = new Map(ids.map((id, index) => [id, index]));
  return found.sort(
    (left, right) =>
      (idToIndex.get(left.id) ?? 0) - (idToIndex.get(right.id) ?? 0),
  );
}

async function loadBrowseRows(
  db: PrismaClient,
  input: MoleculeBrowsePageQuery,
  tagFilter: ReturnType<typeof prismaMoleculeBrowseWhere>,
  browseFilterSql: ReturnType<typeof sqlMoleculeBrowseFilters>,
): Promise<MoleculeBrowseRow[]> {
  if (input.sortBy === "datasets") {
    const orderedIds = await db.$queryRaw<Array<{ id: string }>>`
      SELECT m.id
      FROM public.molecules m
      LEFT JOIN public.samples s ON s.moleculeid = m.id
      LEFT JOIN public.experiments e ON e.sampleid = s.id
      WHERE (${browseFilterSql})
      GROUP BY m.id
      ORDER BY COUNT(DISTINCT e.id) DESC, m.createdat DESC
      LIMIT ${input.limit}
      OFFSET ${input.offset}
    `;
    return loadRowsByIds(
      db,
      orderedIds.map((row) => row.id),
    );
  }
  if (input.sortBy === "name") {
    const orderedIds = await db.$queryRaw<Array<{ id: string }>>`
      SELECT m.id
      FROM public.molecules m
      WHERE (${browseFilterSql})
      ORDER BY LOWER(
        COALESCE(
          (
            SELECT ms.synonym
            FROM public.moleculesynonyms ms
            WHERE ms.moleculeid = m.id AND ms."order" = 0
            ORDER BY LENGTH(ms.synonym) ASC, ms.synonym ASC
            LIMIT 1
          ),
          m.iupacname
        )
      ) ASC
      LIMIT ${input.limit}
      OFFSET ${input.offset}
    `;
    return loadRowsByIds(
      db,
      orderedIds.map((row) => row.id),
    );
  }

  const orderBy =
    input.sortBy === "favorites"
      ? [
          { favoritecount: "desc" as const },
          { createdat: "desc" as const },
          { id: "desc" as const },
        ]
      : input.sortBy === "views"
        ? [
            { viewcount: "desc" as const },
            { createdat: "desc" as const },
            { id: "desc" as const },
          ]
        : [{ createdat: "desc" as const }, { id: "desc" as const }];
  return db.molecules.findMany({
    where: tagFilter,
    take: input.limit,
    skip: input.offset,
    include: moleculeBrowseInclude,
    orderBy,
  });
}

async function loadPublicMoleculeBrowsePage(
  db: PrismaClient,
  input: MoleculeBrowsePageQuery,
): Promise<MoleculeBrowsePage> {
  const browseFilters = normalizeMoleculeBrowseFilters(input);
  const tagFilter = prismaMoleculeBrowseWhere(browseFilters);
  const browseFilterSql = sqlMoleculeBrowseFilters(browseFilters, "m");
  const [rows, total] = await Promise.all([
    loadBrowseRows(db, input, tagFilter, browseFilterSql),
    db.molecules.count({ where: tagFilter }),
  ]);
  return {
    molecules: rows.map((row) =>
      toMoleculeView(sortBrowseSynonyms(row), { userHasFavorited: false }),
    ),
    total,
  };
}

/**
 * Loads a public molecule browse page, reusing a 60 second catalog cache.
 * `userHasFavorited` is false on every row; callers overlay the session user.
 */
export function getCachedMoleculeBrowsePage(
  db: PrismaClient,
  input: MoleculeBrowsePageQuery,
): Promise<MoleculeBrowsePage> {
  const loadCached = cachePublicCatalogRead(
    moleculeBrowsePageCacheKey(input),
    ["molecules", "molecule-browse"],
    () => loadPublicMoleculeBrowsePage(db, input),
    MOLECULE_BROWSE_PAGE_REVALIDATE_SECONDS,
  );
  return loadCached();
}

async function loadBrowseTagCounts(
  db: PrismaClient,
): Promise<MoleculeBrowseTagCount[]> {
  const rows = await db.$queryRaw<
    Array<{
      id: string;
      name: string;
      color: string | null;
      count: bigint;
    }>
  >`
    SELECT
      t.id,
      t.name,
      t.color,
      COUNT(mt.molecule_id)::bigint AS count
    FROM public.tags t
    LEFT JOIN public.molecule_tags mt ON mt.tag_id = t.id
    GROUP BY t.id, t.name, t.color
    ORDER BY count DESC, t.name ASC
  `;
  return rows.map((row) => ({
    id: row.id,
    label: row.name,
    color: row.color,
    count: Number(row.count),
  }));
}

/**
 * Loads molecule-browse tag facets with counts, cached for 120 seconds.
 */
export function getCachedBrowseTagCounts(
  db: PrismaClient,
): Promise<MoleculeBrowseTagCount[]> {
  const loadCached = cachePublicCatalogRead(
    "molecule-browse-tag-counts",
    ["molecules", "tags", "molecule-browse"],
    () => loadBrowseTagCounts(db),
    MOLECULE_BROWSE_TAG_REVALIDATE_SECONDS,
  );
  return loadCached();
}
