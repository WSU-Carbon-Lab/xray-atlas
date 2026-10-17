/**
 * Public facility catalog cache for detail documents and `facilities.getBySlug`.
 *
 * Holds the slug index and one detail row per facility for 60 seconds under
 * `facilities-public`. Does not cache stewards, website mutations, or
 * session-specific fields. Call `revalidateFacilityPublicCache` after a
 * facility write so the next read reloads Postgres.
 */

import { cache } from "react";
import { revalidateTag } from "next/cache";
import type { Prisma } from "~/prisma/client";
import { isFacilityUuidSegment } from "~/lib/facility-route";
import type { FacilityRouteRecord } from "~/lib/facility-route";
import { matchFacilitiesBySlug } from "~/lib/facility-slug";
import { cachePublicCatalogRead } from "~/server/cache/public-catalog-cache";
import { db } from "~/server/db";

const FACILITY_PUBLIC_REVALIDATE_SECONDS = 60;
const FACILITY_PUBLIC_CACHE_TAG = "facilities-public";

const facilityRouteIndexSelect = {
  id: true,
  name: true,
  city: true,
  country: true,
  facilitytype: true,
} as const;

const facilityPublicDetailInclude = {
  instruments: {
    orderBy: {
      name: "asc" as const,
    },
  },
  _count: {
    select: {
      instruments: true,
    },
  },
} as const;

/**
 * Facility detail row served by `facilities.getBySlug` and the public detail page.
 */
export type FacilityPublicDetail = Prisma.facilitiesGetPayload<{
  include: typeof facilityPublicDetailInclude;
}>;

/**
 * Slug lookup against the cached facility index and detail row.
 *
 * `found` carries the detail payload. `missing` means no name slug matched.
 * `ambiguous` means more than one facility slugifies to the same segment.
 */
export type FacilityPublicSlugLookup =
  | { kind: "found"; facility: FacilityPublicDetail }
  | { kind: "missing" }
  | { kind: "ambiguous" };

async function loadFacilityRouteIndex(): Promise<FacilityRouteRecord[]> {
  return db.facilities.findMany({
    select: facilityRouteIndexSelect,
    orderBy: { name: "asc" },
  });
}

async function loadFacilityPublicDetail(
  id: string,
): Promise<FacilityPublicDetail | null> {
  return db.facilities.findUnique({
    where: { id },
    include: facilityPublicDetailInclude,
  });
}

const readCachedFacilityRouteIndex = cachePublicCatalogRead(
  "facility-public-route-index",
  [FACILITY_PUBLIC_CACHE_TAG],
  loadFacilityRouteIndex,
  FACILITY_PUBLIC_REVALIDATE_SECONDS,
);

/**
 * Loads every facility route row from the 60 second public cache.
 *
 * Rows contain `id`, `name`, `city`, `country`, and `facilitytype` only.
 * Ordered by `name` ascending. A cache miss reads Postgres once for the index.
 */
export const getCachedFacilityRouteIndex = cache(readCachedFacilityRouteIndex);

/**
 * Loads one facility with instruments and the instrument count from the 60 second public cache.
 *
 * @param id Facility primary key. Unknown ids resolve to `null` rather than throwing.
 */
export const getCachedFacilityPublicDetail = cache(
  async (id: string): Promise<FacilityPublicDetail | null> => {
    const loadCached = cachePublicCatalogRead(
      `facility-public-detail:${id}`,
      [FACILITY_PUBLIC_CACHE_TAG],
      () => loadFacilityPublicDetail(id),
      FACILITY_PUBLIC_REVALIDATE_SECONDS,
    );
    return loadCached();
  },
);

/**
 * Resolves a `/facilities/[segment]` parameter from the cached route index.
 *
 * UUID segments match `id` case-insensitively. Other segments match the unique
 * slugified facility name, including registered aliases. Returns `null` when
 * the segment is unknown or more than one facility shares the slug, matching
 * the uncached route resolver.
 *
 * @param segment Raw route parameter, either a facility UUID or a slug.
 */
export const resolveCachedFacilityRoute = cache(
  async (segment: string): Promise<FacilityRouteRecord | null> => {
    const index = await getCachedFacilityRouteIndex();
    if (isFacilityUuidSegment(segment)) {
      const normalized = segment.toLowerCase();
      return index.find((row) => row.id.toLowerCase() === normalized) ?? null;
    }
    const matches = matchFacilitiesBySlug(index, segment);
    if (matches.length !== 1) {
      return null;
    }
    return matches[0] ?? null;
  },
);

/**
 * Resolves a public facility slug to the cached detail payload.
 *
 * Does not treat UUID segments as ids. `ambiguous` preserves the slug
 * collision that `facilities.getBySlug` reports as not found.
 *
 * @param slug Route slug after alias normalization inside `matchFacilitiesBySlug`.
 */
export const lookupCachedFacilityBySlug = cache(
  async (slug: string): Promise<FacilityPublicSlugLookup> => {
    const index = await getCachedFacilityRouteIndex();
    const matches = matchFacilitiesBySlug(index, slug);
    if (matches.length > 1) {
      return { kind: "ambiguous" };
    }
    const match = matches[0];
    if (!match) {
      return { kind: "missing" };
    }
    const facility = await getCachedFacilityPublicDetail(match.id);
    if (!facility) {
      return { kind: "missing" };
    }
    return { kind: "found", facility };
  },
);

/**
 * Expires the public facility index and every cached detail row.
 *
 * The next catalog read reloads Postgres. Safe from route handlers and server actions.
 */
export function revalidateFacilityPublicCache(): void {
  revalidateTag(FACILITY_PUBLIC_CACHE_TAG, { expire: 0 });
}
