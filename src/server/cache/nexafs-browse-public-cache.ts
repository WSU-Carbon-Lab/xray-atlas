/**
 * Shared catalog cache for public NEXAFS browse pages.
 *
 * Caches `experiments.browseList` and `experiments.browseSearch` pages for 60
 * seconds under the `nexafs-browse` tag. Cached groups always have
 * `userHasFavorited` false. Session hearts are applied by
 * `overlayNexafsBrowseFavoriteFlags` after the read so one entry is shared
 * across sessions. Does not cache per-user state or `searchEntities` typeahead.
 */

import type { PrismaClient } from "~/prisma/client";
import { cachePublicCatalogRead } from "~/server/cache/public-catalog-cache";
import {
  fetchNexafsBrowseGrouped,
  type NexafsBrowseGroupDto,
  type NexafsBrowseGroupFilters,
  type NexafsBrowseSortKey,
} from "~/server/nexafs/nexafsBrowseGroups";

const NEXAFS_BROWSE_LIST_REVALIDATE_SECONDS = 60;

/**
 * Zod-parsed `experiments.browseList` input used as the catalog cache key.
 *
 * `sortBy` is the transformed `NexafsBrowseSortKey` (`comments` is already
 * `publications`). Optional id arrays are stored as provided; the key function
 * sorts copies of them.
 */
export interface NexafsBrowseListCacheInput {
  limit: number;
  offset: number;
  sortBy: NexafsBrowseSortKey;
  moleculeId?: string;
  edgeId?: string;
  instrumentId?: string;
  moleculeIds?: string[];
  edgeIds?: string[];
  instrumentIds?: string[];
  contributorOrcids?: string[];
  experimentIds?: string[];
  experimentType?: NexafsBrowseGroupFilters["experimentType"];
  verifiedOnly: boolean;
  verificationSource: "either" | "publication" | "atlas";
  sourcePaperDoi?: string;
}

/**
 * One cached `browseList` page.
 *
 * `groups` are `NexafsBrowseGroupDto` rows with `userHasFavorited` false.
 * `total` is the unpaged match count from `fetchNexafsBrowseGrouped`.
 */
export interface NexafsBrowseListPage {
  groups: NexafsBrowseGroupDto[];
  total: number;
}

function sortedIdSegment(ids: readonly string[] | undefined): string {
  if (!ids || ids.length === 0) {
    return "";
  }
  return [...ids].sort().join(",");
}

/**
 * Builds the `experiments.browseList` catalog cache key from Zod-parsed input.
 *
 * Equivalent filters share one entry. Id arrays are sorted so request order
 * does not split the cache. Each segment is percent-encoded, then joined with
 * `:`, so commas and colons inside a DOI or id cannot collide with separators.
 * Omitted optional scalars and empty id arrays encode as an empty segment.
 *
 * Segment order: `sortBy`, `limit`, `offset`, `moleculeId`, `edgeId`,
 * `instrumentId`, `moleculeIds`, `edgeIds`, `instrumentIds`,
 * `contributorOrcids`, `experimentIds`, `experimentType`, `verifiedOnly`
 * (`1` or `0`), `verificationSource`, `sourcePaperDoi`.
 *
 * @param input Parsed browse list filters. `sortBy` must already be a
 * `NexafsBrowseSortKey`.
 * @returns Stable cache key string beginning with `nexafs-browse-list`.
 */
export function nexafsBrowseListCacheKey(
  input: NexafsBrowseListCacheInput,
): string {
  const segments = [
    "nexafs-browse-list",
    input.sortBy,
    String(input.limit),
    String(input.offset),
    input.moleculeId ?? "",
    input.edgeId ?? "",
    input.instrumentId ?? "",
    sortedIdSegment(input.moleculeIds),
    sortedIdSegment(input.edgeIds),
    sortedIdSegment(input.instrumentIds),
    sortedIdSegment(input.contributorOrcids),
    sortedIdSegment(input.experimentIds),
    input.experimentType ?? "",
    input.verifiedOnly ? "1" : "0",
    input.verificationSource,
    input.sourcePaperDoi ?? "",
  ];
  return segments.map((segment) => encodeURIComponent(segment)).join(":");
}

/**
 * Browse-list filters plus the trimmed text query used by `browseSearch`.
 */
export interface NexafsBrowseSearchCacheInput extends NexafsBrowseListCacheInput {
  query: string;
}

/**
 * Builds the `experiments.browseSearch` catalog cache key.
 *
 * Uses the same filter segments as `nexafsBrowseListCacheKey`, then appends
 * the trimmed query so a search page never shares an entry with an unsearched
 * list page. The query segment is percent-encoded.
 *
 * @param input Parsed search input. `query` must already be trimmed and
 * non-empty. `sortBy` must already be a `NexafsBrowseSortKey`.
 * @returns Stable cache key string beginning with `nexafs-browse-list`.
 */
export function nexafsBrowseSearchCacheKey(
  input: NexafsBrowseSearchCacheInput,
): string {
  return `${nexafsBrowseListCacheKey(input)}:${encodeURIComponent(input.query)}`;
}

/**
 * Restores `createdat` after `unstable_cache` JSON round-trip.
 *
 * A cache miss already holds `Date` instances and is returned unchanged. A hit
 * stores `createdat` as an ISO string; those groups are copied with a parsed
 * `Date` so callers keep the pre-cache response contract.
 */
function reviveNexafsBrowseListPage(
  page: NexafsBrowseListPage,
): NexafsBrowseListPage {
  let revived = false;
  const groups = page.groups.map((group) => {
    const raw = group.createdat as Date | string;
    if (raw instanceof Date) {
      return group;
    }
    const createdat = new Date(raw);
    if (Number.isNaN(createdat.getTime())) {
      return group;
    }
    revived = true;
    return { ...group, createdat };
  });
  if (!revived) {
    return page;
  }
  return { groups, total: page.total };
}

function loadCachedNexafsBrowsePage(
  db: PrismaClient,
  cacheKey: string,
  input: NexafsBrowseListCacheInput,
  searchQuery: string | null,
): Promise<NexafsBrowseListPage> {
  const loadCached = cachePublicCatalogRead(
    cacheKey,
    ["nexafs-browse"],
    () =>
      fetchNexafsBrowseGrouped(db, {
        viewerUserId: null,
        filters: {
          moleculeId: input.moleculeId,
          edgeId: input.edgeId,
          instrumentId: input.instrumentId,
          moleculeIds: input.moleculeIds,
          edgeIds: input.edgeIds,
          instrumentIds: input.instrumentIds,
          contributorOrcids: input.contributorOrcids,
          experimentType: input.experimentType,
          verifiedOnly: input.verifiedOnly,
          verificationSource: input.verificationSource,
          sourcePaperDoi: input.sourcePaperDoi,
          experimentIds: input.experimentIds,
        },
        searchQuery,
        sortBy: input.sortBy,
        limit: input.limit,
        offset: input.offset,
      }),
    NEXAFS_BROWSE_LIST_REVALIDATE_SECONDS,
  );
  return loadCached().then(reviveNexafsBrowseListPage);
}

/**
 * Loads one public NEXAFS browse page from the 60 second catalog cache.
 *
 * Calls `fetchNexafsBrowseGrouped` with `viewerUserId: null` and
 * `searchQuery: null`, so every group has `userHasFavorited` false and no
 * text-search predicate is applied. Callers that have a session user overlay
 * favorites after this promise resolves. Does not throw a domain error; Prisma
 * and cache failures propagate from the loader.
 *
 * @param db Prisma client used on a cache miss. The same client must be safe
 * to close over for the cache lifetime.
 * @param input Page size, offset, sort, and every browse filter. `limit` and
 * `offset` are the already-validated procedure values.
 * @returns Cached page whose groups are not session-specific. Do not mutate
 * the group objects; copy them when overlaying `userHasFavorited`.
 */
export function getCachedNexafsBrowseList(
  db: PrismaClient,
  input: NexafsBrowseListCacheInput,
): Promise<NexafsBrowseListPage> {
  return loadCachedNexafsBrowsePage(
    db,
    nexafsBrowseListCacheKey(input),
    input,
    null,
  );
}

/**
 * Loads one public NEXAFS search page from the 60 second catalog cache.
 *
 * Calls `fetchNexafsBrowseGrouped` with `viewerUserId: null` and
 * `searchQuery` set to `input.query`, so every group has `userHasFavorited`
 * false. The query must already be trimmed. Callers overlay session favorites
 * after this promise resolves.
 *
 * @param db Prisma client used on a cache miss.
 * @param input Search text plus the same filters as `browseList`, without
 * `experimentIds` unless the caller sets them.
 * @returns Cached page whose groups are not session-specific. Do not mutate
 * the group objects.
 */
export function getCachedNexafsBrowseSearch(
  db: PrismaClient,
  input: NexafsBrowseSearchCacheInput,
): Promise<NexafsBrowseListPage> {
  return loadCachedNexafsBrowsePage(
    db,
    nexafsBrowseSearchCacheKey(input),
    input,
    input.query,
  );
}

/**
 * Copies browse groups so `userHasFavorited` matches one session user.
 *
 * Reads `experimentfavorites` once for the page's experiment ids after the
 * catalog cache has resolved. Anonymous users and pages with no rows skip the
 * query. An empty favorite set returns `groups` unchanged. Favorited groups
 * are shallow copies; cached objects are not mutated.
 *
 * @param db Prisma client for the favorite lookup.
 * @param userId Session user id, or null when the request is anonymous.
 * @param groups Catalog groups from a cached browse page.
 * @returns The same array when no overlay applies, otherwise a new array.
 */
export async function overlayNexafsBrowseFavoriteFlags(
  db: PrismaClient,
  userId: string | null,
  groups: NexafsBrowseGroupDto[],
): Promise<NexafsBrowseGroupDto[]> {
  if (!userId || groups.length === 0) {
    return groups;
  }
  const favorited = await db.experimentfavorites.findMany({
    where: {
      userid: userId,
      experimentid: { in: groups.map((group) => group.experimentId) },
    },
    select: { experimentid: true },
  });
  if (favorited.length === 0) {
    return groups;
  }
  const favoritedIds = new Set(favorited.map((row) => row.experimentid));
  return groups.map((group) =>
    favoritedIds.has(group.experimentId)
      ? { ...group, userHasFavorited: true }
      : group,
  );
}
