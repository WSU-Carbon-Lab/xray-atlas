import { Suspense, type ReactElement } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { AddMoleculeButton } from "~/components/contribute/add-molecule-button";
import { BrowsePageLayout } from "~/components/browse/browse-page-layout";
import { BrowseTabs } from "~/components/layout/browse-tabs";
import { getSessionUserIdFromCookies } from "~/server/auth/session-token";
import type { AppRouter } from "~/server/api/root";
import { db } from "~/server/db";
import {
  getCachedBrowseTagCounts,
  getCachedMoleculeBrowsePage,
  type MoleculeBrowsePage,
  type MoleculeBrowseTagCount,
} from "~/server/molecules/molecule-browse-page";
import type { MoleculeView } from "~/types/molecule";
import { MoleculesBrowseContent } from "./molecules-browse-content";

type MoleculeCatalogPage =
  inferRouterOutputs<AppRouter>["molecules"]["getAllPaginated"];

const DEFAULT_MOLECULE_BROWSE_QUERY = {
  limit: 12,
  offset: 0,
  sortBy: "favorites" as const,
  tagIds: [] as string[],
};

interface MoleculeBrowseSearchParams {
  q?: string | string[];
  page?: string | string[];
  tags?: string | string[];
  hasData?: string | string[];
  hasCas?: string | string[];
  hasPubchem?: string | string[];
}

function isoTimestamp(value: Date | string | undefined): string | undefined {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

function requiredIsoTimestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toMoleculeCatalogPage(page: {
  molecules: MoleculeView[];
  total: number;
  hasMore: boolean;
}): MoleculeCatalogPage {
  return {
    molecules: page.molecules.map((molecule) => ({
      ...molecule,
      createdAt: isoTimestamp(molecule.createdAt),
      updatedAt: isoTimestamp(molecule.updatedAt),
      contributors: molecule.contributors?.map((contributor) => ({
        ...contributor,
        contributedAt: requiredIsoTimestamp(contributor.contributedAt),
      })),
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

function isDefaultMoleculeBrowseRequest(
  searchParams: MoleculeBrowseSearchParams,
): boolean {
  const query = firstSearchParam(searchParams.q)?.trim() ?? "";
  const tags = firstSearchParam(searchParams.tags)?.trim() ?? "";
  const pageRaw = firstSearchParam(searchParams.page);
  const page = pageRaw ? Number.parseInt(pageRaw, 10) : 1;
  return (
    query.length === 0 &&
    tags.length === 0 &&
    !isActiveFlag(firstSearchParam(searchParams.hasData)) &&
    !isActiveFlag(firstSearchParam(searchParams.hasCas)) &&
    !isActiveFlag(firstSearchParam(searchParams.hasPubchem)) &&
    (!Number.isFinite(page) || page <= 1)
  );
}

async function overlayMoleculeFavorites(
  userId: string | null,
  page: MoleculeBrowsePage,
): Promise<MoleculeCatalogPage> {
  let molecules = page.molecules;
  if (userId && page.molecules.length > 0) {
    const favorited = await db.moleculefavorites.findMany({
      where: {
        moleculeid: { in: page.molecules.map((molecule) => molecule.id) },
        userid: userId,
      },
      select: { moleculeid: true },
    });
    if (favorited.length > 0) {
      const favoritedIds = new Set(favorited.map((row) => row.moleculeid));
      molecules = page.molecules.map((molecule) =>
        favoritedIds.has(molecule.id)
          ? { ...molecule, userHasFavorited: true }
          : molecule,
      );
    }
  }
  return toMoleculeCatalogPage({
    molecules,
    total: page.total,
    hasMore: page.molecules.length < page.total,
  });
}

async function loadMoleculeBrowseShell(seedList: boolean): Promise<{
  initialPage?: MoleculeCatalogPage;
  initialTagCounts?: MoleculeBrowseTagCount[];
}> {
  const tagCountsPromise = getCachedBrowseTagCounts(db).then(
    (counts) => counts,
    () => undefined,
  );
  if (!seedList) {
    return { initialTagCounts: await tagCountsPromise };
  }
  const [page, userId, initialTagCounts] = await Promise.all([
    getCachedMoleculeBrowsePage(db, DEFAULT_MOLECULE_BROWSE_QUERY).then(
      (loaded) => loaded,
      () => undefined,
    ),
    getSessionUserIdFromCookies(db),
    tagCountsPromise,
  ]);
  return {
    initialPage: page
      ? await overlayMoleculeFavorites(userId, page)
      : undefined,
    initialTagCounts,
  };
}

/**
 * Renders `/browse/molecules` with the cached default catalog page in the HTML.
 *
 * Loads favorites sort, limit 12, offset 0, and no tag filters from
 * `getCachedMoleculeBrowsePage`, plus tag counts from
 * `getCachedBrowseTagCounts`. When `getSessionUserIdFromCookies` resolves a
 * user id, favorite flags are overlaid after the cache. Filtered query
 * strings skip the list seed so the first paint stays on that URL. Does not
 * call `auth()`.
 *
 * @param props.searchParams - Shareable browse query string (`q`, `page`, `tags`, `hasData`, `hasCas`, `hasPubchem`).
 * @returns The client browse UI with `initialData` for the default page.
 */
export default async function MoleculesBrowsePage({
  searchParams,
}: {
  searchParams: Promise<MoleculeBrowseSearchParams>;
}): Promise<ReactElement> {
  const params = await searchParams;
  const { initialPage, initialTagCounts } = await loadMoleculeBrowseShell(
    isDefaultMoleculeBrowseRequest(params),
  );
  return (
    <Suspense
      fallback={
        <BrowsePageLayout title="Browse Molecules" subtitle="Loading...">
          <BrowseTabs />
        </BrowsePageLayout>
      }
    >
      <MoleculesBrowseContent
        AddMoleculeButton={AddMoleculeButton}
        initialPage={initialPage}
        initialTagCounts={initialTagCounts}
      />
    </Suspense>
  );
}
