"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ExperimentType } from "@prisma/client";
import { trpc } from "~/trpc/client";
import { ErrorState } from "@/components/feedback/error-state";
import { BrowseTabs } from "@/components/layout/browse-tabs";
import { ArrowsUpDownIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { BrowseHeader } from "@/components/browse/browse-header";
import { BrowsePageLayout } from "@/components/browse/browse-page-layout";
import { BrowseEmptyState } from "@/components/browse/browse-empty-state";
import { ItemsPerPageSelect } from "@/components/browse/items-per-page-select";
import { NexafsDatasetCardCompact } from "@/components/browse/nexafs-dataset-card";
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

const EXPERIMENT_TYPE_LABELS: Record<ExperimentType, string> = {
  TOTAL_ELECTRON_YIELD: "Total electron yield",
  PARTIAL_ELECTRON_YIELD: "Partial electron yield",
  FLUORESCENT_YIELD: "Fluorescence yield",
  TRANSMISSION: "Transmission",
};

const SORT_OPTIONS: {
  key: "newest" | "upload" | "molecule" | "edge" | "instrument";
  label: string;
}[] = [
  { key: "newest", label: "Newest (upload)" },
  { key: "upload", label: "Upload date" },
  { key: "molecule", label: "Molecule name" },
  { key: "edge", label: "Edge (atom)" },
  { key: "instrument", label: "Instrument" },
];

function formatExperimentType(
  value: ExperimentType | null | undefined,
): string | null {
  if (!value) return null;
  return EXPERIMENT_TYPE_LABELS[value] ?? null;
}

function parseSortParam(
  raw: string | null,
): "newest" | "upload" | "molecule" | "edge" | "instrument" {
  if (raw === "measurement") return "upload";
  if (
    raw === "upload" ||
    raw === "molecule" ||
    raw === "edge" ||
    raw === "instrument"
  ) {
    return raw;
  }
  return "newest";
}

function parseExperimentTypeParam(
  raw: string | null,
): ExperimentType | undefined {
  if (!raw) return undefined;
  const values = Object.values(ExperimentType) as string[];
  return values.includes(raw) ? (raw as ExperimentType) : undefined;
}

type BrowseExperiment = {
  id: string;
  createdat: string;
  experimenttype: ExperimentType | null;
  samples: {
    identifier: string | null;
    molecules: {
      id: string;
      iupacname: string;
      chemicalformula: string;
    };
  };
  edges: { targetatom: string; corestate: string };
  instruments: {
    name: string;
    facilities: { name: string } | null;
  };
  _count: { spectrumpoints: number };
};

function mapExperimentToCard(exp: BrowseExperiment) {
  const molecule = exp.samples.molecules;
  const edgeLabel = `${exp.edges.targetatom} ${exp.edges.corestate}`;
  const uploadedAtLabel = new Date(exp.createdat).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return {
    key: exp.id,
    props: {
      href: `/molecules/${molecule.id}`,
      moleculeName: molecule.iupacname,
      moleculeFormula: molecule.chemicalformula,
      sampleIdentifier: exp.samples.identifier,
      edgeLabel,
      instrumentName: exp.instruments.name,
      facilityName: exp.instruments.facilities?.name ?? null,
      uploadedAtLabel,
      pointCount: exp._count.spectrumpoints,
      experimentTypeLabel: formatExperimentType(exp.experimenttype),
    },
  };
}

function NexafsBrowseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [sortBy, setSortBy] = useState(() =>
    parseSortParam(searchParams.get("sort")),
  );
  const [moleculeId, setMoleculeId] = useState<string | undefined>(
    searchParams.get("molecule") ?? undefined,
  );
  const [edgeId, setEdgeId] = useState<string | undefined>(
    searchParams.get("edge") ?? undefined,
  );
  const [instrumentId, setInstrumentId] = useState<string | undefined>(
    searchParams.get("instrument") ?? undefined,
  );
  const [experimentType, setExperimentType] = useState<
    ExperimentType | undefined
  >(() => parseExperimentTypeParam(searchParams.get("type")));
  const [currentPage, setCurrentPage] = useState(() => {
    const p = searchParams.get("page");
    const n = p ? parseInt(p, 10) : 1;
    return Number.isFinite(n) && n > 0 ? n : 1;
  });
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [refineOpen, setRefineOpen] = useState(false);

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
  ]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (currentPage > 1) params.set("page", currentPage.toString());
    if (sortBy !== "newest") params.set("sort", sortBy);
    if (moleculeId) params.set("molecule", moleculeId);
    if (edgeId) params.set("edge", edgeId);
    if (instrumentId) params.set("instrument", instrumentId);
    if (experimentType) params.set("type", experimentType);
    const qs = params.toString();
    router.replace(`/browse/nexafs${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [
    debouncedQuery,
    currentPage,
    sortBy,
    moleculeId,
    edgeId,
    instrumentId,
    experimentType,
    router,
  ]);

  const hasSearchQuery = debouncedQuery.trim().length > 0;

  const searchData = trpc.experiments.browseSearch.useQuery(
    {
      query: debouncedQuery.trim(),
      limit: itemsPerPage,
      moleculeId,
      edgeId,
      instrumentId,
      experimentType,
    },
    {
      enabled: hasSearchQuery,
      staleTime: 30000,
    },
  );

  const allData = trpc.experiments.browseList.useQuery(
    {
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
      sortBy,
      moleculeId,
      edgeId,
      instrumentId,
      experimentType,
    },
    {
      enabled: !hasSearchQuery,
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
    { enabled: !!moleculeId, staleTime: 60_000 },
  );

  const data = hasSearchQuery
    ? {
        experiments: (searchData.data?.experiments ?? []) as BrowseExperiment[],
        total: searchData.data?.experiments.length ?? 0,
      }
    : {
        experiments: (allData.data?.experiments ?? []) as BrowseExperiment[],
        total: allData.data?.total ?? 0,
      };

  const isLoading = hasSearchQuery ? searchData.isLoading : allData.isLoading;
  const isError = hasSearchQuery ? searchData.isError : allData.isError;
  const error = hasSearchQuery ? searchData.error : allData.error;

  const totalPages = Math.max(
    1,
    Math.ceil((data.total ?? 0) / itemsPerPage),
  );

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

  const activeMoleculeLabel = moleculeId
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

  const activeRefineCount =
    (instrumentId ? 1 : 0) + (experimentType ? 1 : 0);

  const sortLabelCurrent =
    SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? sortBy;

  const subtitle = hasSearchQuery
    ? `Search results for "${debouncedQuery}"`
    : "Pick a molecule and edge in the header, search the catalog, or open More filters for instrument and acquisition mode.";

  return (
    <BrowsePageLayout title="Browse NEXAFS datasets" subtitle={subtitle}>
      <BrowseTabs />

      <div className="space-y-6">
        <BrowseHeader
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search catalog…"
        >
          <div className="shrink-0">
            <NexafsMoleculeFilterDropdown
              moleculeId={moleculeId}
              onMoleculeChange={setMoleculeId}
            />
          </div>
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
                      className="border-border bg-surface text-muted focus-visible:ring-accent flex h-12 min-h-12 shrink-0 items-center gap-2 rounded-lg border px-3 transition-colors hover:bg-default focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
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
          onClearAll={() => {
            setMoleculeId(undefined);
            setEdgeId(undefined);
            setInstrumentId(undefined);
            setExperimentType(undefined);
          }}
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
                "An error occurred while loading search results."
              }
              onRetry={() => window.location.reload()}
            />
          )}

          {!isLoading && !isError && (
            <>
              {data.experiments.length === 0 ? (
                <BrowseEmptyState
                  message={
                    hasSearchQuery
                      ? `No NEXAFS datasets found for "${debouncedQuery}".`
                      : "No NEXAFS datasets in the database yet."
                  }
                  hasSearchQuery={hasSearchQuery}
                  browseAllHref="/browse/nexafs"
                  onClearSearch={() => {
                    setQuery("");
                    setDebouncedQuery("");
                  }}
                >
                  <AddNexafsCard
                    href="/contribute/nexafs"
                    className="min-h-[140px] w-full"
                  />
                </BrowseEmptyState>
              ) : (
                <div className="space-y-3">
                  <AddNexafsCard
                    href="/contribute/nexafs"
                    className="min-h-[140px] w-full"
                  />
                  {data.experiments.map((exp) => {
                    const { key, props } = mapExperimentToCard(exp);
                    return (
                      <NexafsDatasetCardCompact key={key} {...props} />
                    );
                  })}
                </div>
              )}

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <ItemsPerPageSelect
                  value={itemsPerPage}
                  onChange={setItemsPerPage}
                  labelId="nexafs-items-per-page"
                />
                {!hasSearchQuery && totalPages > 1 ? (
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
    </BrowsePageLayout>
  );
}

export default function NexafsBrowsePage() {
  return (
    <Suspense
      fallback={
        <BrowsePageLayout
          title="Browse NEXAFS datasets"
          subtitle="Loading…"
        >
          <BrowseTabs />
        </BrowsePageLayout>
      }
    >
      <NexafsBrowseContent />
    </Suspense>
  );
}
