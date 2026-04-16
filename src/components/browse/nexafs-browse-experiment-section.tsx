"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { ExperimentType } from "~/prisma/browser";
import { trpc } from "~/trpc/client";
import { ErrorState } from "@/components/feedback/error-state";
import {
  ArrowsUpDownIcon,
  CalendarDaysIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckIcon,
  CircleStackIcon,
  EyeIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";
import { BrowseTabs } from "@/components/layout/browse-tabs";
import { BrowsePageLayout } from "@/components/browse/browse-page-layout";
import { BrowseHeader } from "@/components/browse/browse-header";
import { BrowseEmptyState } from "@/components/browse/browse-empty-state";
import { ItemsPerPageSelect } from "@/components/browse/items-per-page-select";
import { NexafsExperimentCompactCard } from "@/components/nexafs/nexafs-display";
import { NexafsBrowseActiveFilters } from "@/components/browse/nexafs-browse-active-filters";
import { NexafsMoleculeFilterDropdown } from "@/components/browse/nexafs-molecule-filter-dropdown";
import { NexafsEdgeFilterDropdown } from "@/components/browse/nexafs-edge-filter-dropdown";
import { NexafsInstrumentFilterDropdown } from "@/components/browse/nexafs-instrument-filter-dropdown";
import { NexafsAcquisitionFilterDropdown } from "@/components/browse/nexafs-acquisition-filter-dropdown";
import { AddNexafsCard } from "@/components/contribute";
import { Pagination } from "@heroui/react";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";
import {
  EXPERIMENT_TYPE_LABELS,
  NEXAFS_SORT_LABELS,
  parseSortParam,
  parseExperimentTypeParam,
  type NexafsBrowseSortKey,
} from "./nexafs-browse-experiment-utils";
import { mapNexafsBrowseGroupToCard } from "./nexafs-browse-map-group";

const NEXAFS_SORT_OPTIONS: Array<{
  key: NexafsBrowseSortKey;
  label: string;
  icon: ReactNode;
}> = [
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
    key: "comments",
    label: NEXAFS_SORT_LABELS.comments,
    icon: <ChatBubbleBottomCenterTextIcon className="h-4 w-4 shrink-0" />,
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

export interface NexafsBrowseExperimentSectionProps {
  basePath: string;
  contributeNexafsHref: string;
  showMoleculeFilter: boolean;
  lockedMoleculeId?: string;
  emptyStateBrowseAllHref?: string;
  itemsPerPageLabelId?: string;
  /** Shown when the catalog list is empty and the user is not searching (e.g. molecule-scoped copy). */
  emptyListMessage?: string;
  /**
   * When `"fullPage"`, wraps content in `BrowsePageLayout` and `BrowseTabs` with the same titles as `/browse/nexafs`.
   * When `"embedded"`, renders only the browse controls and list (for molecule detail).
   */
  variant?: "fullPage" | "embedded";
}

export function NexafsBrowseExperimentSection({
  basePath,
  contributeNexafsHref,
  showMoleculeFilter,
  lockedMoleculeId,
  emptyStateBrowseAllHref = "/browse/nexafs",
  itemsPerPageLabelId = "nexafs-items-per-page",
  emptyListMessage,
  variant = "embedded",
}: NexafsBrowseExperimentSectionProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [urlSynced, setUrlSynced] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortBy, setSortBy] = useState<NexafsBrowseSortKey>("favorites");
  const [moleculeId, setMoleculeId] = useState<string | undefined>(undefined);
  const [edgeId, setEdgeId] = useState<string | undefined>(undefined);
  const [instrumentId, setInstrumentId] = useState<string | undefined>(
    undefined,
  );
  const [experimentType, setExperimentType] = useState<
    ExperimentType | undefined
  >(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const urlKey = searchParams.toString();

  const effectiveMoleculeId = lockedMoleculeId ?? moleculeId;

  useLayoutEffect(() => {
    const sp = new URLSearchParams(urlKey);
    const q = sp.get("q") ?? "";
    setQuery(q);
    setDebouncedQuery(q);
    setSortBy(parseSortParam(sp.get("sort")));
    if (!lockedMoleculeId) {
      setMoleculeId(sp.get("molecule") ?? undefined);
    }
    setEdgeId(sp.get("edge") ?? undefined);
    setInstrumentId(sp.get("instrument") ?? undefined);
    setExperimentType(parseExperimentTypeParam(sp.get("type")));
    const p = sp.get("page");
    const n = p ? parseInt(p, 10) : 1;
    setCurrentPage(Number.isFinite(n) && n > 0 ? n : 1);
    setUrlSynced(true);
  }, [urlKey, lockedMoleculeId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    sortBy,
    itemsPerPage,
    moleculeId,
    edgeId,
    instrumentId,
    experimentType,
    lockedMoleculeId,
  ]);

  useEffect(() => {
    if (!urlSynced) return;
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (currentPage > 1) params.set("page", currentPage.toString());
    if (sortBy !== "favorites") params.set("sort", sortBy);
    if (!lockedMoleculeId && moleculeId) params.set("molecule", moleculeId);
    if (edgeId) params.set("edge", edgeId);
    if (instrumentId) params.set("instrument", instrumentId);
    if (experimentType) params.set("type", experimentType);
    const qs = params.toString();
    const path = `${basePath}${qs ? `?${qs}` : ""}`;
    router.replace(path, { scroll: false });
  }, [
    urlSynced,
    debouncedQuery,
    currentPage,
    sortBy,
    moleculeId,
    edgeId,
    instrumentId,
    experimentType,
    router,
    basePath,
    lockedMoleculeId,
  ]);

  const hasSearchQuery = debouncedQuery.trim().length > 0;

  const searchData = trpc.experiments.browseSearch.useQuery(
    {
      query: debouncedQuery.trim(),
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
      sortBy,
      moleculeId: effectiveMoleculeId,
      edgeId,
      instrumentId,
      experimentType,
    },
    {
      enabled: urlSynced && hasSearchQuery,
      staleTime: 30000,
    },
  );

  const allData = trpc.experiments.browseList.useQuery(
    {
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
      sortBy,
      moleculeId: effectiveMoleculeId,
      edgeId,
      instrumentId,
      experimentType,
    },
    {
      enabled: urlSynced && !hasSearchQuery,
      staleTime: 30000,
    },
  );

  const edgesQuery = trpc.experiments.listEdges.useQuery(undefined, {
    staleTime: 120000,
  });

  const instrumentsQuery = trpc.instruments.list.useQuery(
    { limit: 200, status: "active" },
    { staleTime: 120000 },
  );

  const moleculeSummaryQuery = trpc.experiments.browseMoleculeSummary.useQuery(
    { id: moleculeId! },
    {
      enabled: showMoleculeFilter && !!moleculeId,
      staleTime: 60_000,
    },
  );

  const data = hasSearchQuery
    ? {
        groups: searchData.data?.groups ?? [],
        total: searchData.data?.total ?? 0,
      }
    : {
        groups: allData.data?.groups ?? [],
        total: allData.data?.total ?? 0,
      };

  const isLoading =
    !urlSynced || (hasSearchQuery ? searchData.isLoading : allData.isLoading);
  const isError = hasSearchQuery ? searchData.isError : allData.isError;
  const error = hasSearchQuery ? searchData.error : allData.error;

  const totalPages = Math.max(1, Math.ceil((data.total ?? 0) / itemsPerPage));

  const edgeOptions = useMemo(
    () => edgesQuery.data?.edges ?? [],
    [edgesQuery.data?.edges],
  );

  const instrumentOptions = useMemo(
    () => instrumentsQuery.data?.instruments ?? [],
    [instrumentsQuery.data?.instruments],
  );

  const instrumentFilterOptions = useMemo(
    () =>
      instrumentOptions.map((inst) => ({
        id: inst.id,
        name: inst.name,
        facilityName: inst.facilities?.name ?? null,
      })),
    [instrumentOptions],
  );

  const activeMoleculeLabel =
    showMoleculeFilter && moleculeId
      ? moleculeSummaryQuery.isSuccess && !moleculeSummaryQuery.data
        ? "Unknown molecule"
        : (moleculeSummaryQuery.data?.iupacname ?? null)
      : null;

  const activeEdgeLabel = useMemo(() => {
    if (!edgeId) return null;
    const e = edgeOptions.find((x) => x.id === edgeId);
    return e ? `${e.targetatom} ${e.corestate}` : null;
  }, [edgeId, edgeOptions]);

  const activeInstrumentLabel = useMemo(() => {
    if (!instrumentId) return null;
    const i = instrumentOptions.find((x) => x.id === instrumentId);
    if (!i) return null;
    return i.facilities?.name ? `${i.name} (${i.facilities.name})` : i.name;
  }, [instrumentId, instrumentOptions]);

  const activeAcquisitionLabel = useMemo(
    () =>
      experimentType ? (EXPERIMENT_TYPE_LABELS[experimentType] ?? null) : null,
    [experimentType],
  );

  const sortLabelCurrent = NEXAFS_SORT_LABELS[sortBy];

  const handleClearFilters = () => {
    if (!lockedMoleculeId) setMoleculeId(undefined);
    setEdgeId(undefined);
    setInstrumentId(undefined);
    setExperimentType(undefined);
  };

  const pageSubtitle = hasSearchQuery
    ? `Search results for "${debouncedQuery}"`
    : "Filter by molecule, edge, instrument, or acquisition mode, search the catalog, or change sort order.";

  const inner = (
    <div className="space-y-6">
      <BrowseHeader
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search catalog…"
      >
        {showMoleculeFilter ? (
          <div className="shrink-0">
            <NexafsMoleculeFilterDropdown
              moleculeId={moleculeId}
              onMoleculeChange={setMoleculeId}
            />
          </div>
        ) : null}
        <div className="shrink-0">
          <NexafsEdgeFilterDropdown
            edgeId={edgeId}
            edges={edgeOptions}
            onEdgeChange={setEdgeId}
          />
        </div>
        <div className="shrink-0">
          <NexafsInstrumentFilterDropdown
            instrumentId={instrumentId}
            instruments={instrumentFilterOptions}
            onInstrumentChange={setInstrumentId}
          />
        </div>
        <div className="shrink-0">
          <NexafsAcquisitionFilterDropdown
            experimentType={experimentType}
            onExperimentTypeChange={setExperimentType}
          />
        </div>
        {!hasSearchQuery ? (
          <PopoverMenu
            contentClassName="w-[min(100vw-2rem,300px)]"
            renderTrigger={({ triggerProps, isOpen }) => (
              <button
                {...triggerProps}
                type="button"
                aria-label={`Sort experiments; current order is ${sortLabelCurrent}`}
                className="border-border bg-surface text-muted focus-visible:ring-accent hover:bg-default hover:text-foreground flex h-12 min-h-12 shrink-0 items-center gap-2 rounded-lg border px-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <ArrowsUpDownIcon
                  className="h-5 w-5 shrink-0 stroke-[1.5]"
                  aria-hidden
                />
                <span className="text-sm font-medium">Sort</span>
                <span className="sr-only">
                  {isOpen ? "Close sort options" : "Open sort options"}
                </span>
              </button>
            )}
            renderContent={({ contentPositionClassName, contentProps, close }) => (
              <PopoverMenuContent
                {...contentProps}
                className={`${contentPositionClassName} w-[min(100vw-2rem,300px)] rounded-xl py-1`}
              >
                <div className="space-y-0.5 p-1">
                  {NEXAFS_SORT_OPTIONS.map((option) => {
                    const isSelected = option.key === sortBy;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => {
                          setSortBy(option.key);
                          close();
                        }}
                        className={`focus-visible:ring-accent flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 ${
                          isSelected
                            ? "bg-accent-soft text-foreground ring-accent/35 ring-1"
                            : "text-muted hover:bg-default hover:text-foreground"
                        }`}
                        aria-label={`Sort by ${option.label}`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {option.icon}
                          <span className="truncate">{option.label}</span>
                        </span>
                        {isSelected ? (
                          <CheckIcon
                            className="text-accent h-4 w-4 shrink-0"
                            aria-hidden
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </PopoverMenuContent>
            )}
          />
        ) : null}
      </BrowseHeader>

      <NexafsBrowseActiveFilters
        moleculeLabel={activeMoleculeLabel}
        edgeLabel={activeEdgeLabel}
        instrumentLabel={activeInstrumentLabel}
        acquisitionLabel={activeAcquisitionLabel}
        onRemoveMolecule={() => setMoleculeId(undefined)}
        onRemoveEdge={() => setEdgeId(undefined)}
        onRemoveInstrument={() => setInstrumentId(undefined)}
        onRemoveAcquisition={() => setExperimentType(undefined)}
        onClearAll={handleClearFilters}
      />

      <div>
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: itemsPerPage }).map((_, i) => (
              <div
                key={i}
                className="border-border bg-surface h-32 animate-pulse rounded-xl border shadow-lg"
              />
            ))}
          </div>
        )}

        {isError && (
          <ErrorState
            title="Failed to load results"
            message={
              error?.message ??
              "Oh no! Our beam must have dumped... Please try again in a moment or submit a support ticket."
            }
            onRetry={() => window.location.reload()}
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
                hasSearchQuery={hasSearchQuery}
                browseAllHref={emptyStateBrowseAllHref}
                onClearSearch={() => {
                  setQuery("");
                  setDebouncedQuery("");
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
                          setCurrentPage((p) => Math.max(1, p - 1))
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
                          setCurrentPage((p) =>
                            Math.min(totalPages, p + 1),
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
