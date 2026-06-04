"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
  Suspense,
} from "react";
import { trpc } from "~/trpc/client";
import {
  MoleculeDisplayCompact,
  MoleculeDisplay,
  type DisplayMolecule,
} from "@/components/molecules/molecule-display";
import { ErrorState } from "@/components/feedback/error-state";
import {
  MoleculeCardSkeleton,
  MoleculeCompactSkeleton,
} from "@/components/feedback/loading-state";
import { BrowseTabs } from "@/components/layout/browse-tabs";
import {
  Squares2X2Icon,
  ListBulletIcon,
  HeartIcon,
  EyeIcon,
  CalendarDaysIcon,
  CircleStackIcon,
} from "@heroicons/react/24/outline";
import { AddMoleculeButton } from "@/components/contribute";
import { BrowseHeader } from "@/components/browse/browse-header";
import { BrowsePageLayout } from "@/components/browse/browse-page-layout";
import { BrowseEmptyState } from "@/components/browse/browse-empty-state";
import { ItemsPerPageSelect } from "@/components/browse/items-per-page-select";
import { BrowseSortButton, type BrowseSortOption } from "@/components/browse/browse-sort-button";
import { Pagination, Tabs, Tooltip } from "@heroui/react";
import {
  MoleculeSearchBar,
  useMoleculeFacetSelection,
  tagLabelsFromFacetItems,
  moleculeFacetSelectionToBrowseFilters,
} from "@/components/browse/molecule-search";

type MoleculeSortKey = "favorites" | "created" | "name" | "views" | "datasets";

const MOLECULE_SORT_OPTIONS: Array<BrowseSortOption<MoleculeSortKey>> = [
  {
    key: "favorites",
    label: "Most Favorited",
    icon: <HeartIcon className="h-4 w-4 shrink-0" />,
  },
  {
    key: "views",
    label: "Most Viewed",
    icon: <EyeIcon className="h-4 w-4 shrink-0" />,
  },
  {
    key: "datasets",
    label: "Most Datasets",
    icon: <CircleStackIcon className="h-4 w-4 shrink-0" />,
  },
  {
    key: "name",
    label: "Name (A-Z)",
    icon: <span className="font-mono text-sm font-semibold leading-none">A</span>,
  },
  {
    key: "created",
    label: "Newest First",
    icon: <CalendarDaysIcon className="h-4 w-4 shrink-0" />,
  },
];

const MOLECULES_BROWSE_PATH = "/browse/molecules";

function MoleculesBrowseContent() {
  const { data: tagFacetItems = [] } = trpc.molecules.browseTagCounts.useQuery(
    undefined,
    { staleTime: 5 * 60 * 1000 },
  );

  const tagLabels = useMemo(
    () => tagLabelsFromFacetItems(tagFacetItems),
    [tagFacetItems],
  );

  const facet = useMoleculeFacetSelection({
    basePath: MOLECULES_BROWSE_PATH,
    tagLabels,
  });

  const browseFilters = useMemo(
    () => moleculeFacetSelectionToBrowseFilters(facet.selection),
    [facet.selection],
  );

  const [sortBy, setSortBy] = useState<MoleculeSortKey>("favorites");
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [viewMode, setViewMode] = useState<"compact" | "spacious">("compact");

  useLayoutEffect(() => {
    const savedViewMode = localStorage.getItem("moleculeViewMode");
    if (savedViewMode === "compact" || savedViewMode === "spacious") {
      setViewMode(savedViewMode);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("moleculeViewMode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    facet.setCurrentPage(1);
  }, [sortBy, itemsPerPage, facet.setCurrentPage]);

  const hasSearchQuery = facet.debouncedQuery.trim().length > 0;
  const queryEnabled = facet.urlSynced;

  const searchData = trpc.molecules.autosuggest.useQuery(
    {
      query: facet.debouncedQuery,
      limit: itemsPerPage,
      ...browseFilters,
    },
    {
      enabled: queryEnabled && hasSearchQuery,
      staleTime: 30000,
      placeholderData: (previousData) => previousData,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const allData = trpc.molecules.getAllPaginated.useQuery(
    {
      limit: itemsPerPage,
      offset: (facet.currentPage - 1) * itemsPerPage,
      sortBy,
      ...browseFilters,
    },
    {
      enabled: queryEnabled && !hasSearchQuery,
      staleTime: 30000,
      placeholderData: (previousData) => previousData,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const data = hasSearchQuery ? searchData.data : allData.data;
  const isLoading = hasSearchQuery ? searchData.isLoading : allData.isLoading;
  const isError = hasSearchQuery ? searchData.isError : allData.isError;
  const error = hasSearchQuery ? searchData.error : allData.error;
  type SearchResult = NonNullable<typeof searchData.data>;
  type PaginatedResult = NonNullable<typeof allData.data>;
  type SearchResultMolecule = NonNullable<SearchResult["results"]>[number];
  type PaginatedResultMolecule = NonNullable<
    PaginatedResult["molecules"]
  >[number];
  type NormalizedMolecule = SearchResultMolecule | PaginatedResultMolecule;

  const normalizedData = hasSearchQuery
    ? {
        molecules: (searchData.data?.results ?? []) as NormalizedMolecule[],
        total: searchData.data?.results?.length ?? 0,
        hasMore: false,
      }
    : {
        molecules: (allData.data?.molecules ?? []) as NormalizedMolecule[],
        total: allData.data?.total ?? 0,
        hasMore: allData.data?.hasMore ?? false,
      };

  const isSearchResultMolecule = (
    molecule: NormalizedMolecule,
  ): molecule is SearchResultMolecule =>
    "iupacName" in molecule && "synonyms" in molecule;

  const searchResultToView = (
    molecule: SearchResultMolecule,
  ): DisplayMolecule => ({
    name: molecule.iupacName,
    iupacName: molecule.iupacName,
    commonName: molecule.synonyms.length > 0 ? molecule.synonyms : undefined,
    chemicalFormula: molecule.chemicalFormula,
    SMILES: molecule.smiles,
    InChI: molecule.inchi,
    pubChemCid: molecule.pubChemCid ?? undefined,
    casNumber: molecule.casNumber ?? undefined,
    imageUrl: molecule.imageUrl ?? undefined,
    id: molecule.id,
    favoriteCount: 0,
    userHasFavorited: false,
  });

  const toDisplayMolecule = (
    molecule: NormalizedMolecule,
  ): DisplayMolecule | null => {
    if (!molecule) return null;
    if (isSearchResultMolecule(molecule)) return searchResultToView(molecule);
    return molecule as DisplayMolecule;
  };

  const totalPages = Math.max(
    1,
    Math.ceil((normalizedData.total ?? 0) / itemsPerPage),
  );
  const molecules = normalizedData.molecules;

  const handleMoleculeCreated = useCallback(() => {
    void searchData.refetch();
    void allData.refetch();
  }, [searchData, allData]);

  const handleClearAll = useCallback(() => {
    facet.clearAll();
    facet.setQuery("");
  }, [facet]);

  const subtitle = hasSearchQuery
    ? `Search results for "${facet.debouncedQuery}"`
    : "Explore all molecules in the X-ray Atlas database.";

  const viewToggle = (
    <Tooltip delay={0}>
      <div className="h-12 min-h-12 shrink-0">
        <Tabs
          selectedKey={viewMode}
          onSelectionChange={(key) =>
            setViewMode(key as "compact" | "spacious")
          }
          className="w-fit"
        >
          <Tabs.ListContainer>
            <Tabs.List
              aria-label="View mode"
              className="border-border bg-surface text-muted !flex !h-12 !min-h-12 !w-fit min-w-[5.25rem] flex-row items-center gap-1 rounded-lg border p-1"
            >
              <Tabs.Tab
                id="compact"
                aria-label="Compact list view"
                className="text-muted hover:text-foreground data-[selected=true]:text-accent-foreground data-[selected=true]:hover:text-accent-foreground relative z-10 flex h-10 min-h-10 flex-1 basis-0 items-center justify-center rounded-md p-0 text-sm leading-none font-normal transition-colors outline-none"
              >
                <ListBulletIcon className="relative z-10 block h-5 w-5 shrink-0 stroke-[1.5] text-current" />
                <Tabs.Indicator className="bg-accent rounded-md shadow-none ring-0" />
              </Tabs.Tab>
              <Tabs.Tab
                id="spacious"
                aria-label="Spacious grid view"
                className="text-muted hover:text-foreground data-[selected=true]:text-accent-foreground data-[selected=true]:hover:text-accent-foreground relative z-10 flex h-10 min-h-10 flex-1 basis-0 items-center justify-center rounded-md p-0 text-sm leading-none font-normal transition-colors outline-none"
              >
                <Squares2X2Icon className="relative z-10 block h-5 w-5 shrink-0 stroke-[1.5] text-current" />
                <Tabs.Indicator className="bg-accent rounded-md shadow-none ring-0" />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>
      <Tooltip.Content
        placement="top"
        className="bg-foreground text-background rounded-lg px-3 py-2 shadow-lg"
      >
        Display molecules in a compact list or spacious grid view
      </Tooltip.Content>
    </Tooltip>
  );

  return (
    <BrowsePageLayout title="Browse Molecules" subtitle={subtitle}>
      <BrowseTabs />

      <div className="space-y-6">
        <BrowseHeader
          searchChrome={
            <MoleculeSearchBar
              facet={facet}
              tagFacetItems={tagFacetItems}
              placeholder="Search catalog..."
            />
          }
          trailing={
            <>
              {!hasSearchQuery ? (
                <BrowseSortButton
                  options={MOLECULE_SORT_OPTIONS}
                  value={sortBy}
                  onChange={setSortBy}
                  contentWidth="w-[220px]"
                />
              ) : null}
              {viewToggle}
            </>
          }
        />

        <div>
          {isLoading && (
            <div
              className={
                viewMode === "compact"
                  ? "space-y-3"
                  : "grid w-full grid-cols-1 gap-6 md:grid-cols-2"
              }
            >
              {Array.from({ length: itemsPerPage }).map((_, i) =>
                viewMode === "compact" ? (
                  <MoleculeCompactSkeleton key={i} />
                ) : (
                  <MoleculeCardSkeleton key={i} />
                ),
              )}
            </div>
          )}

          {isError && (
            <ErrorState
              title="Failed to load results"
              message={
                error?.message ??
                "An error occurred while loading search results."
              }
              onRetry={() => window.location.reload()}
            />
          )}

          {!isLoading && !isError && data && (
            <>
              {molecules.length === 0 ? (
                <BrowseEmptyState
                  message={
                    hasSearchQuery
                      ? `No molecules found for "${facet.debouncedQuery}".`
                      : "No molecules match the current filters."
                  }
                  hasSearchQuery={
                    hasSearchQuery || facet.tokens.length > 0
                  }
                  browseAllHref={MOLECULES_BROWSE_PATH}
                  onClearSearch={handleClearAll}
                >
                  <AddMoleculeButton
                    className="min-h-[140px]"
                    onCreated={handleMoleculeCreated}
                  />
                </BrowseEmptyState>
              ) : (
                <>
                  {viewMode === "compact" ? (
                    <div
                      className="space-y-3 [&>*]:[contain-intrinsic-size:0_80px] [&>*]:[content-visibility:auto]"
                      aria-label="Molecule results"
                    >
                      <AddMoleculeButton
                        className="min-h-[140px] w-full"
                        onCreated={handleMoleculeCreated}
                      />
                      {molecules.map((molecule) => {
                        const displayMolecule = toDisplayMolecule(molecule);
                        if (!displayMolecule) return null;

                        return (
                          <MoleculeDisplayCompact
                            key={molecule.id}
                            molecule={displayMolecule}
                            enableRealtime={false}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 [&>div]:[contain-intrinsic-size:0_220px] [&>div]:[content-visibility:auto]">
                      <AddMoleculeButton
                        className="min-h-[220px]"
                        onCreated={handleMoleculeCreated}
                      />
                      {molecules.map((molecule) => {
                        const displayMolecule = toDisplayMolecule(molecule);
                        if (!displayMolecule) return null;

                        return (
                          <div key={molecule.id}>
                            <MoleculeDisplay
                              molecule={displayMolecule}
                              enableRealtime={false}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <ItemsPerPageSelect
                  value={itemsPerPage}
                  onChange={setItemsPerPage}
                />
                {totalPages > 1 ? (
                  <Pagination size="sm" className="gap-2">
                    <Pagination.Content className="gap-2">
                      <Pagination.Item>
                        <Pagination.Previous
                          isDisabled={facet.currentPage <= 1}
                          aria-label="Previous page"
                          onPress={() =>
                            facet.setCurrentPage(
                              Math.max(1, facet.currentPage - 1),
                            )
                          }
                          className="rounded-lg border border-border bg-surface"
                        >
                          <Pagination.PreviousIcon />
                        </Pagination.Previous>
                      </Pagination.Item>
                      {totalPages <= 20
                        ? Array.from(
                            { length: totalPages },
                            (_, i) => i + 1,
                          ).map((p) => (
                            <Pagination.Item key={p}>
                              <Pagination.Link
                                isActive={p === facet.currentPage}
                                onPress={() => facet.setCurrentPage(p)}
                                className={`rounded-lg border border-border bg-surface text-foreground ${
                                  p === facet.currentPage
                                    ? "border-accent bg-accent text-accent-foreground"
                                    : ""
                                }`}
                              >
                                {p}
                              </Pagination.Link>
                            </Pagination.Item>
                          ))
                        : null}
                      {totalPages > 20 ? (
                        <Pagination.Item>
                          <span className="text-muted px-2 text-xs tabular-nums">
                            {facet.currentPage} / {totalPages}
                          </span>
                        </Pagination.Item>
                      ) : null}
                      <Pagination.Item>
                        <Pagination.Next
                          isDisabled={facet.currentPage >= totalPages}
                          aria-label="Next page"
                          onPress={() =>
                            facet.setCurrentPage(
                              Math.min(totalPages, facet.currentPage + 1),
                            )
                          }
                          className="rounded-lg border border-border bg-surface"
                        >
                          <Pagination.NextIcon />
                        </Pagination.Next>
                      </Pagination.Item>
                    </Pagination.Content>
                  </Pagination>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </BrowsePageLayout>
  );
}

export default function MoleculesBrowsePage() {
  return (
    <Suspense
      fallback={
        <BrowsePageLayout title="Browse Molecules" subtitle="Loading...">
          <BrowseTabs />
        </BrowsePageLayout>
      }
    >
      <MoleculesBrowseContent />
    </Suspense>
  );
}
