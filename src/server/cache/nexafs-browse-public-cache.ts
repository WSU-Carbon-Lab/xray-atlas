import type { PrismaClient } from "~/prisma/client";
import { cachePublicCatalogRead } from "~/server/cache/public-catalog-cache";
import {
  fetchNexafsBrowseGrouped,
  type NexafsBrowseGroupFilters,
  type NexafsBrowseSortKey,
} from "~/server/nexafs/nexafsBrowseGroups";

export type NexafsBrowseListCacheInput = {
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
  experimentType?: NexafsBrowseGroupFilters["experimentType"];
  verifiedOnly: boolean;
  verificationSource: "either" | "publication" | "atlas";
  sourcePaperDoi?: string;
  experimentIds?: string[];
};

/**
 * Returns whether an anonymous browse list request can reuse the shared catalog cache.
 */
export function isAnonymousUnfilteredNexafsBrowse(
  input: NexafsBrowseListCacheInput,
): boolean {
  if (input.moleculeId || input.edgeId || input.instrumentId) {
    return false;
  }
  if (input.moleculeIds?.length) {
    return false;
  }
  if (input.edgeIds?.length) {
    return false;
  }
  if (input.instrumentIds?.length) {
    return false;
  }
  if (input.contributorOrcids?.length) {
    return false;
  }
  if (input.experimentType) {
    return false;
  }
  if (input.verifiedOnly) {
    return false;
  }
  if (input.verificationSource !== "either") {
    return false;
  }
  if (input.sourcePaperDoi) {
    return false;
  }
  if (input.experimentIds?.length) {
    return false;
  }
  return true;
}

/**
 * Loads a cached anonymous NEXAFS browse page when no filters or session overlays apply.
 */
export function getCachedAnonymousNexafsBrowse(
  db: PrismaClient,
  input: Pick<NexafsBrowseListCacheInput, "limit" | "offset" | "sortBy">,
): ReturnType<typeof fetchNexafsBrowseGrouped> {
  const loadCached = cachePublicCatalogRead(
    `nexafs-browse-anon:${input.sortBy}:${input.limit}:${input.offset}`,
    ["nexafs-browse"],
    () =>
      fetchNexafsBrowseGrouped(db, {
        viewerUserId: null,
        filters: {},
        searchQuery: null,
        sortBy: input.sortBy,
        limit: input.limit,
        offset: input.offset,
      }),
    90,
  );
  return loadCached();
}
