/**
 * Per-request molecule detail reads for `/molecules/[id]`.
 *
 * Deduplicates `molecules.getBySlug` / `molecules.getById` across
 * `generateMetadata` and the layout. Loads the default embedded NEXAFS page
 * from the 60 second molecule-page card cache and overlays session favorites
 * afterward. Does not call `auth()` and does not cache per-user molecule
 * favorite state across requests.
 */

import { cache } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";
import { getSessionUserIdFromCookies } from "~/server/auth/session-token";
import { overlayNexafsBrowseFavoriteFlags } from "~/server/cache/nexafs-browse-public-cache";
import { db } from "~/server/db";
import { getCachedMoleculePageNexafsCards } from "~/server/nexafs/molecule-page-card-list";
import { slugifyMoleculeSynonym } from "~/lib/molecule-slug";
import { api } from "~/trpc/server";

const MOLECULE_ROUTE_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type NexafsCatalogPage =
  inferRouterOutputs<AppRouter>["experiments"]["browseList"];

const DEFAULT_MOLECULE_NEXAFS_BROWSE = {
  limit: 12,
  offset: 0,
  sortBy: "quality" as const,
};

type MoleculeBySlug = Awaited<ReturnType<typeof api.molecules.getBySlug>>;

type MoleculeSlugCollision = Extract<
  MoleculeBySlug,
  { kind: "slug_collision" }
>;

type MoleculeRouteView = Exclude<MoleculeBySlug, { kind: "slug_collision" }>;

/**
 * One `/molecules/[id]` lookup for this request.
 *
 * `found` carries the molecule view. `collision` carries the slug candidates.
 * `not_found` is a normal result, not a rejected promise, so `React.cache`
 * does not surface `NOT_FOUND` as a render error.
 */
export type MoleculeRouteResolution =
  | { status: "found"; molecule: MoleculeRouteView }
  | { status: "collision"; collision: MoleculeSlugCollision }
  | { status: "not_found" };

function isTrpcNotFound(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const record = err as { code?: unknown; data?: { code?: unknown } };
  return record.code === "NOT_FOUND" || record.data?.code === "NOT_FOUND";
}

function isMoleculeSlugCollision(
  value: MoleculeBySlug,
): value is MoleculeSlugCollision {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    value.kind === "slug_collision"
  );
}

function isMoleculeRouteUuid(routeId: string): boolean {
  return MOLECULE_ROUTE_UUID.test(routeId);
}

async function resolveMoleculeByRouteIdUncached(
  routeId: string,
): Promise<MoleculeRouteResolution> {
  try {
    if (isMoleculeRouteUuid(routeId)) {
      const molecule = await api.molecules.getById({ id: routeId });
      return { status: "found", molecule };
    }
    const resolved = await api.molecules.getBySlug({
      slug: slugifyMoleculeSynonym(routeId),
    });
    if (isMoleculeSlugCollision(resolved)) {
      return { status: "collision", collision: resolved };
    }
    return { status: "found", molecule: resolved };
  } catch (err: unknown) {
    if (isTrpcNotFound(err)) {
      return { status: "not_found" };
    }
    throw err;
  }
}

/**
 * Reports whether `/molecules/[id]` must redirect to the canonical slug.
 *
 * UUID segments and any segment other than `canonicalSlug` redirect. The
 * comparison uses the raw segment, so a differently cased slug redirects
 * even when slug normalization resolves the same molecule.
 *
 * @param routeId Raw `params.id` segment.
 * @param canonicalSlug Slug from `canonicalMoleculeSlugFromView`.
 * @returns `true` when the layout should redirect to `/molecules/{canonicalSlug}`.
 */
export function moleculeRouteNeedsCanonicalRedirect(
  routeId: string,
  canonicalSlug: string,
): boolean {
  return isMoleculeRouteUuid(routeId) || routeId !== canonicalSlug;
}

/**
 * Resolves `/molecules/[id]` once per request.
 *
 * UUID params call `molecules.getById`. Every other param is normalized with
 * `slugifyMoleculeSynonym` and loaded with `molecules.getBySlug`.
 * `generateMetadata`, the layout, and the page share this cached promise, so
 * one HTML request does not run the procedure twice. Unknown molecules resolve
 * to `{ status: "not_found" }`. Database failures still reject.
 *
 * @param routeId Raw `params.id` segment.
 * @returns Found molecule, slug collision, or not-found. Does not reject for a missing molecule.
 */
export const resolveMoleculeByRouteId = cache(resolveMoleculeByRouteIdUncached);

/**
 * Loads the default embedded NEXAFS page for one molecule.
 *
 * Uses quality sort, limit 12, and offset 0 for `moleculeId`, matching the
 * embedded section's initial query. Reads `getCachedMoleculePageNexafsCards`
 * and then `overlayNexafsBrowseFavoriteFlags` for
 * `getSessionUserIdFromCookies`. A loader failure returns `undefined` so the
 * page can fall back to the client query. Does not call `auth()`.
 *
 * @param moleculeId Molecule UUID locked by the embedded browse section.
 * @returns The `experiments.browseList` page, or `undefined` when the cache read fails.
 */
export const loadDefaultMoleculeNexafsBrowseList = cache(
  async (moleculeId: string): Promise<NexafsCatalogPage | undefined> => {
    const [page, userId] = await Promise.all([
      getCachedMoleculePageNexafsCards(db, {
        moleculeId,
        ...DEFAULT_MOLECULE_NEXAFS_BROWSE,
      }).then(
        (loaded) => loaded,
        () => undefined,
      ),
      getSessionUserIdFromCookies(db),
    ]);
    if (!page) {
      return undefined;
    }
    const groups = await overlayNexafsBrowseFavoriteFlags(
      db,
      userId,
      page.groups,
    );
    return {
      groups: groups.map((group) => ({
        ...group,
        createdat: group.createdat.toISOString(),
      })),
      total: page.total,
      hasMore: groups.length < page.total,
    };
  },
);
