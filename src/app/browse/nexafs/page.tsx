import type { ReactElement } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { NexafsBrowsePageClient } from "~/app/browse/nexafs/nexafs-browse-page-client";
import type { AppRouter } from "~/server/api/root";
import { getSessionUserIdFromCookies } from "~/server/auth/session-token";
import {
  getCachedNexafsBrowseList,
  overlayNexafsBrowseFavoriteFlags,
  type NexafsBrowseListPage,
} from "~/server/cache/nexafs-browse-public-cache";
import { db } from "~/server/db";

type NexafsCatalogPage =
  inferRouterOutputs<AppRouter>["experiments"]["browseList"];

const DEFAULT_NEXAFS_BROWSE_LIST = {
  limit: 12,
  offset: 0,
  sortBy: "quality" as const,
  verifiedOnly: false,
  verificationSource: "either" as const,
};

interface NexafsBrowseSearchParams {
  q?: string | string[];
  page?: string | string[];
  edge?: string | string[];
  mol?: string | string[];
  instrument?: string | string[];
  contributor?: string | string[];
  experimentType?: string | string[];
  verified?: string | string[];
  verificationSource?: string | string[];
  nexafsExperiment?: string | string[];
}

function toNexafsCatalogPage(page: {
  groups: NexafsBrowseListPage["groups"];
  total: number;
  hasMore: boolean;
}): NexafsCatalogPage {
  return {
    groups: page.groups.map((group) => ({
      ...group,
      createdat: group.createdat.toISOString(),
    })),
    total: page.total,
    hasMore: page.hasMore,
  };
}

function firstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function isActiveFlag(value: string | undefined): boolean {
  return value === "1" || value === "true";
}

function isDefaultNexafsBrowseRequest(
  searchParams: NexafsBrowseSearchParams,
): boolean {
  const query = firstSearchParam(searchParams.q)?.trim() ?? "";
  const pageRaw = firstSearchParam(searchParams.page);
  const page = pageRaw ? Number.parseInt(pageRaw, 10) : 1;
  const verificationSource = firstSearchParam(searchParams.verificationSource);
  const facetKeys = [
    searchParams.edge,
    searchParams.mol,
    searchParams.instrument,
    searchParams.contributor,
    searchParams.experimentType,
    searchParams.nexafsExperiment,
  ];
  const hasFacet = facetKeys.some((value) => {
    const text = firstSearchParam(value)?.trim() ?? "";
    return text.length > 0;
  });
  return (
    query.length === 0 &&
    !hasFacet &&
    !isActiveFlag(firstSearchParam(searchParams.verified)) &&
    (verificationSource === undefined ||
      verificationSource.length === 0 ||
      verificationSource === "either") &&
    (!Number.isFinite(page) || page <= 1)
  );
}

async function loadDefaultNexafsBrowseList(): Promise<
  NexafsCatalogPage | undefined
> {
  const [page, userId] = await Promise.all([
    getCachedNexafsBrowseList(db, DEFAULT_NEXAFS_BROWSE_LIST).then(
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
  return toNexafsCatalogPage({
    groups,
    total: page.total,
    hasMore: groups.length < page.total,
  });
}

/**
 * Renders `/browse/nexafs` with the cached default catalog page in the HTML.
 *
 * Loads quality sort, limit 12, offset 0, and no filters from
 * `getCachedNexafsBrowseList`. When `getSessionUserIdFromCookies` resolves a
 * user id, `overlayNexafsBrowseFavoriteFlags` sets `userHasFavorited` after
 * the cache. Filtered query strings skip that seed. Does not call `auth()`.
 *
 * @param props.searchParams - Shareable browse query string (`q`, `page`, facet keys, verification, `nexafsExperiment`).
 * @returns The client browse UI with `initialData` for the default page.
 */
export default async function NexafsBrowsePage({
  searchParams,
}: {
  searchParams: Promise<NexafsBrowseSearchParams>;
}): Promise<ReactElement> {
  const params = await searchParams;
  const initialBrowseList = isDefaultNexafsBrowseRequest(params)
    ? await loadDefaultNexafsBrowseList()
    : undefined;
  return <NexafsBrowsePageClient initialBrowseList={initialBrowseList} />;
}
