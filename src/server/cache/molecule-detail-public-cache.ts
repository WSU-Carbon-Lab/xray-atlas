/**
 * Anonymous molecule detail cache for `molecules.getBySlug` and `molecules.getById`.
 *
 * Holds slug resolution and the `toMoleculeView` document for 60 seconds under
 * `molecules-public`. Cached views always have `userHasFavorited` false.
 * Slug collisions are stored as collisions and are never stored as a found
 * molecule. Session favorites are applied by `overlayMoleculeViewFavorite`
 * after the cache read. Does not call `auth()` and does not read favorites.
 */

import { cache } from "react";
import type { MoleculeView } from "~/types/molecule";
import { slugifyMoleculeSynonym } from "~/lib/molecule-slug";
import { cachePublicCatalogRead } from "~/server/cache/public-catalog-cache";
import { loadMoleculePublicDetailRow } from "~/server/molecules/molecule-detail-load";
import { toMoleculeView } from "~/server/api/routers/molecules-view";
import { db } from "~/server/db";

const MOLECULE_PUBLIC_REVALIDATE_SECONDS = 60;
const MOLECULE_PUBLIC_CACHE_TAG = "molecules-public";
const COLLISION_CANDIDATE_LIMIT = 200;

/**
 * One disambiguation row for a slug that matches more than one molecule.
 */
export interface MoleculeSlugCollisionCandidate {
  id: string;
  name: string;
  iupacName: string;
  slug: string;
}

/**
 * Cached slug lookup.
 *
 * `missing` means no synonym slug matched, or the single match has no molecule
 * row. `collision` means more than one molecule shares the slug; that result
 * is not a molecule view. `found` is the anonymous `toMoleculeView` document
 * with `userHasFavorited` false.
 */
export type MoleculePublicSlugLookup =
  | { kind: "missing" }
  | {
      kind: "collision";
      slug: string;
      candidates: MoleculeSlugCollisionCandidate[];
    }
  | { kind: "found"; view: MoleculeView };

async function loadCollisionCandidates(
  moleculeIds: string[],
): Promise<MoleculeSlugCollisionCandidate[]> {
  const molecules = await db.molecules.findMany({
    where: { id: { in: moleculeIds } },
    select: {
      id: true,
      iupacname: true,
      moleculesynonyms: {
        where: { order: 0 },
        orderBy: [{ order: "asc" }, { synonym: "asc" }],
        take: 1,
        select: { synonym: true },
      },
    },
  });

  return molecules
    .map((molecule) => {
      const primary = molecule.moleculesynonyms[0]?.synonym ?? null;
      const name = primary ?? molecule.iupacname;
      return {
        id: molecule.id,
        name,
        iupacName: molecule.iupacname,
        slug: slugifyMoleculeSynonym(primary ?? molecule.iupacname),
      };
    })
    .sort((left, right) => {
      const bySlug = left.slug.localeCompare(right.slug);
      if (bySlug !== 0) return bySlug;
      return left.id.localeCompare(right.id);
    });
}

async function loadMoleculePublicView(
  moleculeId: string,
): Promise<MoleculeView | null> {
  const row = await loadMoleculePublicDetailRow(moleculeId);
  if (!row) return null;
  return toMoleculeView(row, { userHasFavorited: false });
}

async function loadMoleculePublicSlugLookup(
  normalizedSlug: string,
): Promise<MoleculePublicSlugLookup> {
  const matches = await db.moleculesynonyms.findMany({
    where: { slug: normalizedSlug },
    select: { moleculeid: true },
    distinct: ["moleculeid"],
    orderBy: { moleculeid: "asc" },
    take: COLLISION_CANDIDATE_LIMIT + 1,
  });
  const moleculeIds = matches
    .slice(0, COLLISION_CANDIDATE_LIMIT)
    .map((match) => match.moleculeid);

  if (moleculeIds.length === 0) {
    return { kind: "missing" };
  }

  if (moleculeIds.length > 1) {
    const candidates = await loadCollisionCandidates(moleculeIds);
    return { kind: "collision", slug: normalizedSlug, candidates };
  }

  const moleculeId = moleculeIds[0];
  if (!moleculeId) {
    return { kind: "missing" };
  }
  const view = await loadMoleculePublicView(moleculeId);
  if (!view) {
    return { kind: "missing" };
  }
  return { kind: "found", view };
}

/**
 * Loads one anonymous molecule view from the 60 second public cache.
 *
 * @param moleculeId Molecule primary key. Unknown ids resolve to `null`
 * rather than throwing. The cached view has `userHasFavorited` false.
 */
export const getCachedMoleculePublicView = cache(
  async (moleculeId: string): Promise<MoleculeView | null> => {
    const loadCached = cachePublicCatalogRead(
      `molecule-public-id:${moleculeId}`,
      [MOLECULE_PUBLIC_CACHE_TAG],
      () => loadMoleculePublicView(moleculeId),
      MOLECULE_PUBLIC_REVALIDATE_SECONDS,
    );
    return loadCached();
  },
);

/**
 * Resolves a slugified molecule name from the 60 second public cache.
 *
 * A unique slug caches the anonymous molecule view. A multi-molecule slug
 * caches the collision candidate list and does not cache a molecule view.
 * An unknown slug caches `missing`.
 *
 * @param normalizedSlug Output of `slugifyMoleculeSynonym`. Compared to
 * `moleculesynonyms.slug`.
 */
export const getCachedMoleculePublicSlugLookup = cache(
  async (normalizedSlug: string): Promise<MoleculePublicSlugLookup> => {
    const loadCached = cachePublicCatalogRead(
      `molecule-public-slug:${normalizedSlug}`,
      [MOLECULE_PUBLIC_CACHE_TAG],
      () => loadMoleculePublicSlugLookup(normalizedSlug),
      MOLECULE_PUBLIC_REVALIDATE_SECONDS,
    );
    return loadCached();
  },
);
