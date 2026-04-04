"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { ExperimentType } from "~/prisma/browser";
import { trpc } from "~/trpc/client";
import { ErrorState } from "@/components/feedback/error-state";
import { ArrowsUpDownIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { BrowseTabs } from "@/components/layout/browse-tabs";
import { BrowsePageLayout } from "@/components/browse/browse-page-layout";
import { BrowseHeader } from "@/components/browse/browse-header";
import { BrowseEmptyState } from "@/components/browse/browse-empty-state";
import { ItemsPerPageSelect } from "@/components/browse/items-per-page-select";
import { NexafsExperimentCompactCard } from "@/components/nexafs/nexafs-display";
import { NexafsBrowseActiveFilters } from "@/components/browse/nexafs-browse-active-filters";
import { NexafsBrowseRefineDialog } from "@/components/browse/nexafs-browse-refine-dialog";
import { NexafsMoleculeFilterDropdown } from "@/components/browse/nexafs-molecule-filter-dropdown";
import { NexafsEdgeFilterDropdown } from "@/components/browse/nexafs-edge-filter-dropdown";
import { AddNexafsCard } from "@/components/contribute";
import { Button, Label } from "@heroui/react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { Pagination } from "@heroui/pagination";
import {
  EXPERIMENT_TYPE_LABELS,
  SORT_OPTIONS,
  parseSortParam,
  parseExperimentTypeParam,
  type NexafsBrowseSortKey,
} from "./nexafs-browse-experiment-utils";
import { mapNexafsBrowseGroupToCard } from "./nexafs-browse-map-group";

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
  const [sortBy, setSortBy] = useState<NexafsBrowseSortKey>("engagement");
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
  const [refineOpen, setRefineOpen] = useState(false);
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
    if (sortBy !== "engagement") params.set("sort", sortBy);
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

  const refineInstruments = useMemo(
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

  const activeRefineCount = (instrumentId ? 1 : 0) + (experimentType ? 1 : 0);

  const sortLabelCurrent =
    SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? sortBy;

  const handleClearFilters = () => {
    if (!lockedMoleculeId) setMoleculeId(undefined);
    setEdgeId(undefined);
    setInstrumentId(undefined);
    setExperimentType(undefined);
  };

  const pageSubtitle = hasSearchQuery
    ? `Search results for "${debouncedQuery}"`
    : "Pick a molecule and edge in the header, search the catalog, or open More filters for instrument and acquisition mode.";

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
        {!hasSearchQuery && (
          <>
            <div className="shrink-0">
              <Dropdown>
                <DropdownTrigger>
                  <button
                    type="button"
                    className="border-border bg-surface text-muted focus-visible:ring-accent hover:bg-default flex h-12 min-h-12 shrink-0 items-center gap-2 rounded-lg border px-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    aria-label={`Sort datasets; current order is ${sortLabelCurrent}`}
                  >
                    <ArrowsUpDownIcon
                      className="h-5 w-5 shrink-0 stroke-[1.5]"
                      aria-hidden
                    />
                    <span className="text-sm font-medium">Sort</span>
                  </button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="Sort order"
                  className="border-border bg-default max-h-[min(320px,50vh)] w-[min(100vw-2rem,280px)] overflow-y-auto rounded-lg border"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <DropdownItem
                      key={opt.key}
                      textValue={opt.label}
                      onPress={() => setSortBy(opt.key)}
                    >
                      <Label>{opt.label}</Label>
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>
            </div>
            <Button
              variant="secondary"
              className="min-h-12 shrink-0"
              onPress={() => setRefineOpen(true)}
            >
              <FunnelIcon className="h-4 w-4 shrink-0" aria-hidden />
              <span>More filters</span>
              {activeRefineCount > 0 ? (
                <span className="bg-accent text-accent-foreground ml-1 inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums">
                  {activeRefineCount}
                </span>
              ) : null}
            </Button>
          </>
        )}
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

      <NexafsBrowseRefineDialog
        isOpen={refineOpen}
        onClose={() => setRefineOpen(false)}
        instrumentId={instrumentId}
        experimentType={experimentType}
        experimentTypeLabels={EXPERIMENT_TYPE_LABELS}
        instruments={refineInstruments}
        onApply={(next) => {
          setInstrumentId(next.instrumentId);
          setExperimentType(next.experimentType);
        }}
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
                <Pagination
                  total={totalPages}
                  page={currentPage}
                  onChange={setCurrentPage}
                  showControls
                  size="sm"
                  classNames={{
                    base: "gap-2",
                    item: "rounded-lg border border-border bg-surface text-foreground",
                    cursor: "bg-accent text-accent-foreground border-accent",
                    prev: "rounded-lg border border-border bg-surface",
                    next: "rounded-lg border border-border bg-surface",
                  }}
                />
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
