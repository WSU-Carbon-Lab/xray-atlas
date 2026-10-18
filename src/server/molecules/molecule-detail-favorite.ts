/**
 * Overlays the session favorite flag onto a cached anonymous molecule view.
 *
 * Does not load the molecule. A null or empty user id is the anonymous path
 * and returns the view unchanged without reading favorites.
 */

import type { Prisma } from "~/prisma/client";
import type { db } from "~/server/db";
import { findMoleculeFavorite } from "~/server/db/engagement-queries";
import type { MoleculeView } from "~/types/molecule";

type Db = typeof db | Prisma.TransactionClient;

/**
 * Sets `userHasFavorited` from the session favorite row for `view.id`.
 *
 * Returns `view` unchanged when `userId` is null or empty, and when no
 * favorite row exists (`userHasFavorited` stays false on the cached view).
 * When a favorite row exists, returns a shallow copy with `userHasFavorited`
 * set to true. Does not mutate `view`.
 *
 * @param prisma Prisma client or transaction. Same contract as
 * `findMoleculeFavorite`: `typeof db` or `Prisma.TransactionClient`.
 * @param userId Session user id. `null` or `""` selects the anonymous path
 * and skips the favorite read.
 * @param view Cached anonymous molecule view. `view.id` is the molecule
 * primary key used for the favorite lookup.
 * @returns `view` when the caller is anonymous or has no favorite row;
 * otherwise a shallow copy with `userHasFavorited` set to true.
 */
export async function overlayMoleculeViewFavorite(
  prisma: Db,
  userId: string | null,
  view: MoleculeView,
): Promise<MoleculeView> {
  if (userId == null || userId.length === 0) {
    return view;
  }
  const favorite = await findMoleculeFavorite(prisma, view.id, userId);
  if (favorite != null) {
    return { ...view, userHasFavorited: true };
  }
  return view;
}
