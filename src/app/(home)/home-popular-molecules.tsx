/**
 * Server read for the home popular-molecules carousel.
 * Loads the shared popularity cache, then overlays the signed-in user's favorites.
 * Does not own browse queries or the public cache key format.
 */

import { cache } from "react";
import type { ReactElement } from "react";
import {
  HomePopularMoleculesError,
  TopUpvotedMolecules,
} from "~/app/(home)/home-page-content";
import { toMoleculeView } from "~/server/api/routers/molecules-view";
import { getSessionUserIdFromCookies } from "~/server/auth/session-token";
import { getCachedPopularMoleculeRows } from "~/server/cache/popular-molecules-cache";
import { db } from "~/server/db";
import type { MoleculeView } from "~/types/molecule";

const HOME_POPULAR_MOLECULES_MAX = 4;

const loadHomePopularMoleculeViews = cache(
  async (): Promise<MoleculeView[]> => {
    const [rows, userId] = await Promise.all([
      getCachedPopularMoleculeRows(db, HOME_POPULAR_MOLECULES_MAX),
      getSessionUserIdFromCookies(db),
    ]);

    let favoritedIds = new Set<string>();
    if (userId && rows.length > 0) {
      const favorited = await db.moleculefavorites.findMany({
        where: {
          moleculeid: { in: rows.map((molecule) => molecule.id) },
          userid: userId,
        },
        select: { moleculeid: true },
      });
      favoritedIds = new Set(favorited.map((favorite) => favorite.moleculeid));
    }

    return rows.map((molecule) =>
      toMoleculeView(molecule, {
        userHasFavorited: favoritedIds.has(molecule.id),
      }),
    );
  },
);

function popularMoleculesErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Failed to load molecules";
}

/**
 * Renders up to four popularity-ranked molecule cards from the catalog cache.
 * Signed-in users receive `userHasFavorited` on each card; anonymous reads skip that query.
 * On failure, renders the same catalog error panel the client query used, with a refresh retry.
 */
export async function HomePopularMolecules(): Promise<ReactElement> {
  const loaded = await loadHomePopularMoleculeViews().then(
    (molecules) => ({ ok: true as const, molecules }),
    (error: unknown) => {
      console.error(
        "[HomePopularMolecules] Failed to load popular molecules",
        error,
      );
      return {
        ok: false as const,
        message: popularMoleculesErrorMessage(error),
      };
    },
  );
  if (!loaded.ok) {
    return <HomePopularMoleculesError message={loaded.message} />;
  }
  return <TopUpvotedMolecules molecules={loaded.molecules} />;
}
