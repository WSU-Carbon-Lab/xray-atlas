"use client";

import {
  useState,
  useMemo,
} from "react";
import { trpc } from "~/trpc/client";
import { CatalogDataErrorState } from "@/components/feedback/catalog-data-error-state";
import {
  CalendarDaysIcon,
  CheckBadgeIcon,
  CircleStackIcon,
  EyeIcon,
  HeartIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { BrowseTabs } from "@/components/layout/browse-tabs";
import { BrowsePageLayout } from "@/components/browse/browse-page-layout";
import { BrowseHeader } from "@/components/browse/browse-header";
import { BrowseEmptyState } from "@/components/browse/browse-empty-state";
import { BrowseSortButton, type BrowseSortOption } from "@/components/browse/browse-sort-button";
import { ItemsPerPageSelect } from "@/components/browse/items-per-page-select";
import { NexafsExperimentCompactSkeleton } from "@/components/feedback/loading-state";
import { NexafsExperimentCompactCard } from "@/components/nexafs/nexafs-display";
import { AddNexafsCard } from "@/components/contribute";
import { Pagination } from "@heroui/react";
import { NEXAFS_SORT_LABELS, type NexafsBrowseSortKey } from "./nexafs-browse-experiment-utils";
import { mapNexafsBrowseGroupToCard } from "./nexafs-browse-map-group";
import {
  useFacetSelection,
  UnifiedSearchBar,
  type FacetData,
} from "./unified-search";

const NEXAFS_SORT_OPTIONS: Array<BrowseSortOption<NexafsBrowseSortKey>> = [
  {
    key: "quality",
    label: NEXAFS_SORT_LABELS.quality,
    icon: <ShieldCheckIcon className="h-4 w-4 shrink-0" />,
  },
  {
    key: "favorites",
    label: NEXAFS_SORT_LABELS.favorites,
    icon: <HeartIcon className="h-4 w-4 shrink-0" />,
  },
  {
    key: "views",
    label: NEXAFS_SORT_LABELS.views,
    icon: <EyeIcon className="h-4 w-4 shrink-0" />,
  },
  {
    key: "geometries",
    label: NEXAFS_SORT_LABELS.geometries,
    icon: <CircleStackIcon className="h-4 w-4 shrink-0" />,
  },
  {
    key: "publications",
    label: NEXAFS_SORT_LABELS.publications,
    icon: <CheckBadgeIcon className="h-4 w-4 shrink-0" />,
  },
  {
    key: "name",
    label: NEXAFS_SORT_LABELS.name,
    icon: (
      <span className="font-mono text-sm font-semibold leading-none">A</span>
    ),
  },
  {
    key: "newest",
    label: NEXAFS_SORT_LABELS.newest,
    icon: <CalendarDaysIcon className="h-4 w-4 shrink-0" />,
  },
];

/**
 * Props for `NexafsBrowseExperimentSection`.
 *
 * @param basePath - URL path prefix used when writing search params.
 * @param contributeNexafsHref - Href for the "Add dataset" card.
 * @param showMoleculeFilter - When `true`, the molecule facet is visible in the unified bar.
 * @param lockedMoleculeId - When set, locks the molecule facet to this UUID (embed mode).
 * @param emptyStateBrowseAllHref - Link shown on the empty state when no results are found.
 * @param itemsPerPageLabelId - `id` of the external label element for the items-per-page select.
 * @param emptyListMessage - Copy shown when the catalog is empty and no search is active.
 * @param variant - `"fullPage"` wraps in page chrome; `"embedded"` renders controls only.
 */
export interface NexafsBrowseExperimentSectionProps {
  basePath: string;
  contributeNexafsHref: string;
  showMoleculeFilter: boolean;
  lockedMoleculeId?: string;
  emptyStateBrowseAllHref?: string;
  itemsPerPageLabelId?: string;
  emptyListMessage?: string;
  variant?: "fullPage" | "embedded";
}

export function NexafsBrowseExperimentSection({
  basePath,
  contributeNexafsHref,
  showMoleculeFilter: _showMoleculeFilter,
  lockedMoleculeId,
  emptyStateBrowseAllHref = "/browse/nexafs",
  itemsPerPageLabelId = "nexafs-items-per-page",
  emptyListMessage,
  variant = "embedded",
}: NexafsBrowseExperimentSectionProps) {
  const [sortBy, setSortBy] = useState<NexafsBrowseSortKey>("quality");
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const facetCountsQuery = trpc.experiments.facetCounts.useQuery(undefined, {
    staleTime: 120_000,
    gcTime: 300_000,
  });

  const facetData = useMemo<FacetData | null>(() => {
    const d = facetCountsQuery.data;
    if (!d) return null;
    return {
      edges: d.edges,
      instruments: d.instruments,
      molecules: d.molecules,
      contributors: d.contributors,
    };
  }, [facetCountsQuery.data]);

  const {
    selection,
    catalogFilters,
    tokens,
    query,
    debouncedQuery,
    urlSynced,
    setQuery,
    add,
    remove,
    toggle: _toggle,
    clearAll: clearFacets,
    setExperimentType,
    setVerification,
    currentPage,
    setCurrentPage,
  } = useFacetSelection({
    basePath,
    lockedMoleculeId,
    facetData: facetData ?? undefined,
  });

  const searchEntitiesQuery = trpc.experiments.searchEntities.useQuery(
    { query: debouncedQuery.trim(), limitPerGroup: 5 },
    {
      enabled: debouncedQuery.trim().length > 0,
      staleTime: 30_000,
      gcTime: 300_000,
    },
  );

  const searchResults = useMemo<FacetData | null>(() => {
    const d = searchEntitiesQuery.data;
    if (!d) return null;
    return {
      edges: d.edges,
      instruments: d.instruments,
      molecules: d.molecules,
      contributors: d.contributors,
    };
  }, [searchEntitiesQuery.data]);

  const edgesQuery = trpc.experiments.listEdges.useQuery(undefined, {
    staleTime: 300_000,
    gcTime: 600_000,
  });

  const edgeOptions = useMemo(
    () => edgesQuery.data?.edges ?? [],
    [edgesQuery.data?.edges],
  );

  const hasSearchQuery = debouncedQuery.trim().length > 0;

  const effectiveMoleculeIds: string[] = lockedMoleculeId
    ? [lockedMoleculeId]
    : selection.mol;

  const commonFilters = {
    moleculeIds: effectiveMoleculeIds.length > 0 ? effectiveMoleculeIds : undefined,
    edgeIds: selection.edge.length > 0 ? selection.edge : undefined,
    instrumentIds: selection.instrument.length > 0 ? selection.instrument : undefined,
    contributorOrcids: selection.contributor.length > 0 ? selection.contributor : undefined,
    experimentType: catalogFilters.experimentType,
    verifiedOnly: catalogFilters.verifiedOnly,
    verificationSource: catalogFilters.verificationSource,
  };

  const searchData = trpc.experiments.browseSearch.useQuery(
    {
      query: debouncedQuery.trim(),
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
      sortBy,
      ...commonFilters,
    },
    {
      enabled: urlSynced && hasSearchQuery,
      staleTime: 30_000,
      gcTime: 300_000,
    },
  );

  const allData = trpc.experiments.browseList.useQuery(
    {
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
      sortBy,
      ...commonFilters,
    },
    {
      enabled: urlSynced && !hasSearchQuery,
      staleTime: 30_000,
      gcTime: 300_000,
    },
  );

  const data = hasSearchQuery
    ? { groups: searchData.data?.groups ?? [], total: searchData.data?.total ?? 0 }
    : { groups: allData.data?.groups ?? [], total: allData.data?.total ?? 0 };

  const isLoading =
    !urlSynced || (hasSearchQuery ? searchData.isLoading : allData.isLoading);
  const isError = hasSearchQuery ? searchData.isError : allData.isError;
  const error = hasSearchQuery ? searchData.error : allData.error;
  const refetchResults = hasSearchQuery
    ? searchData.refetch
    : allData.refetch;

  const totalPages = Math.max(1, Math.ceil((data.total ?? 0) / itemsPerPage));

  const handleClearAll = () => {
    clearFacets();
    setQuery("");
  };

  const hasAnyFilter =
    tokens.length > 0 || debouncedQuery.trim().length > 0;

  const pageSubtitle = hasSearchQuery
    ? `Search results for "${debouncedQuery}"`
    : "Filter by molecule, edge, instrument, acquisition, verification, or search the catalog.";

  const inner = (
    <div className="space-y-6">
      <BrowseHeader
        searchChrome={
          <UnifiedSearchBar
            tokens={tokens}
            query={query}
            onQueryChange={setQuery}
            onAdd={add}
            onRemove={remove}
            onClearAll={handleClearAll}
            catalogFilters={catalogFilters}
            onExperimentTypeChange={setExperimentType}
            onVerificationChange={setVerification}
            facetCounts={facetData}
            searchResults={searchResults}
            edges={edgeOptions}
            selectedEdgeIds={selection.edge}
            onEdgesChange={(ids) => {
              const toAdd = ids.filter((id) => !selection.edge.includes(id));
              const toRemove = selection.edge.filter(
                (id) => !ids.includes(id),
              );
              for (const id of toRemove) remove("edge", id);
              for (const id of toAdd) add("edge", id);
            }}
          />
        }
        trailing={
          !hasSearchQuery ? (
            <BrowseSortButton
              options={NEXAFS_SORT_OPTIONS}
              value={sortBy}
              onChange={setSortBy}
              ariaLabel={`Sort experiments; current order is ${NEXAFS_SORT_LABELS[sortBy]}`}
              contentWidth="w-[min(100vw-2rem,300px)]"
            />
          ) : null
        }
      />

      <div>
        {isLoading && (
          <div className="space-y-3" aria-busy aria-label="Loading NEXAFS experiments">
            {Array.from({ length: itemsPerPage }).map((_, i) => (
              <NexafsExperimentCompactSkeleton key={i} />
            ))}
          </div>
        )}

        {isError && (
          <CatalogDataErrorState
            error={error}
            title="Failed to load results"
            onRetry={() => void refetchResults()}
          />
        )}

        {!isLoading && !isError && (
          <>
            {data.groups.length === 0 ? (
              <BrowseEmptyState
                message={
                  hasSearchQuery
                    ? `No NEXAFS experiments found for "${debouncedQuery}".`
                    : (emptyListMessage ??
                      "No NEXAFS experiments in the database yet.")
                }
                hasSearchQuery={hasSearchQuery || hasAnyFilter}
                browseAllHref={emptyStateBrowseAllHref}
                onClearSearch={() => {
                  setQuery("");
                  handleClearAll();
                }}
              >
                <AddNexafsCard
                  href={contributeNexafsHref}
                  className="min-h-[140px] w-full"
                />
              </BrowseEmptyState>
            ) : (
              <div className="space-y-3">
                <AddNexafsCard
                  href={contributeNexafsHref}
                  className="min-h-[140px] w-full"
                />
                {data.groups.map((group) => {
                  const { key, props } = mapNexafsBrowseGroupToCard(group);
                  return <NexafsExperimentCompactCard key={key} {...props} />;
                })}
              </div>
            )}

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <ItemsPerPageSelect
                value={itemsPerPage}
                onChange={setItemsPerPage}
                labelId={itemsPerPageLabelId}
              />
              {totalPages > 1 ? (
                <Pagination size="sm" className="gap-2">
                  <Pagination.Content className="gap-2">
                    <Pagination.Item>
                      <Pagination.Previous
                        isDisabled={currentPage <= 1}
                        aria-label="Previous page"
                        onPress={() =>
                          setCurrentPage(Math.max(1, currentPage - 1))
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
                              isActive={p === currentPage}
                              onPress={() => setCurrentPage(p)}
                              className={`rounded-lg border border-border bg-surface text-foreground ${
                                p === currentPage
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
                          {currentPage} / {totalPages}
                        </span>
                      </Pagination.Item>
                    ) : null}
                    <Pagination.Item>
                      <Pagination.Next
                        isDisabled={currentPage >= totalPages}
                        aria-label="Next page"
                        onPress={() =>
                          setCurrentPage(Math.min(totalPages, currentPage + 1))
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
  );

  if (variant === "fullPage") {
    return (
      <BrowsePageLayout
        title="Browse NEXAFS experiments"
        subtitle={pageSubtitle}
      >
        <BrowseTabs />
        {inner}
      </BrowsePageLayout>
    );
  }

  return inner;
}
