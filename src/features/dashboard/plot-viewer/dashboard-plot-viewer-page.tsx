"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Spinner } from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import { ArrowLeft, LineChart } from "lucide-react";
import { SpectrumPlot } from "~/components/plots/spectrum-plot";
import type { NexafsBrowseGroup } from "~/components/browse/nexafs-browse-map-group";
import { trpc } from "~/trpc/client";
import { buildDashboardPlotModel } from "./build-dashboard-plot-model";
import { PlotViewerSelectionPanel } from "./plot-viewer-selection-panel";
import { useDashboardPlotSpectra } from "./use-dashboard-plot-spectra";
import { usePlotViewerUrlState } from "./use-plot-viewer-url-state";

function groupLabel(group: NexafsBrowseGroup): string {
  const edge = `${group.edge.targetatom} ${group.edge.corestate}`;
  return `${group.molecule.displayName} · ${edge}`;
}

/**
 * Dashboard unified plot viewer: faceted catalog picker plus multi-trace spectrum overlay.
 */
export function DashboardPlotViewerPage() {
  const urlState = usePlotViewerUrlState();
  const { state, debouncedQuery, urlSynced } = urlState;

  const browseSearchQuery = trpc.experiments.browseSearch.useQuery(
    {
      query: debouncedQuery,
      limit: 50,
      offset: 0,
      sortBy: "favorites",
      moleculeIds: state.facets.mol.length > 0 ? state.facets.mol : undefined,
      edgeIds: state.facets.edge.length > 0 ? state.facets.edge : undefined,
      instrumentIds:
        state.facets.instrument.length > 0 ? state.facets.instrument : undefined,
    },
    { enabled: urlSynced && debouncedQuery.length > 0, staleTime: 30_000 },
  );
  const browseListQuery = trpc.experiments.browseList.useQuery(
    {
      limit: 50,
      offset: 0,
      sortBy: "favorites",
      moleculeIds: state.facets.mol.length > 0 ? state.facets.mol : undefined,
      edgeIds: state.facets.edge.length > 0 ? state.facets.edge : undefined,
      instrumentIds:
        state.facets.instrument.length > 0 ? state.facets.instrument : undefined,
    },
    { enabled: urlSynced && debouncedQuery.length === 0, staleTime: 30_000 },
  );

  const catalogGroups = useMemo(() => {
    const groups =
      debouncedQuery.length > 0
        ? (browseSearchQuery.data?.groups ?? [])
        : (browseListQuery.data?.groups ?? []);
    if (state.facets.facility.length === 0) {
      return groups;
    }
    const allowed = new Set(state.facets.facility);
    return groups.filter((group) =>
      allowed.has(
        (group.instrument.facilityName?.trim() ?? "unknown facility").toLowerCase(),
      ),
    );
  }, [
    browseListQuery.data?.groups,
    browseSearchQuery.data?.groups,
    debouncedQuery.length,
    state.facets.facility,
  ]);

  const groupById = useMemo(() => {
    const map = new Map<string, NexafsBrowseGroup>();
    for (const group of catalogGroups) {
      map.set(group.experimentId, group);
    }
    return map;
  }, [catalogGroups]);

  const catalogSelections = useMemo(
    () =>
      state.datasets.map((experimentId) => {
        const group = groupById.get(experimentId);
        return {
          experimentId,
          label: group ? groupLabel(group) : experimentId,
          chemicalFormula: group?.molecule.chemicalformula ?? null,
        };
      }),
    [groupById, state.datasets],
  );

  const { datasets, spectraByExperimentId, isLoading, errorMessage } =
    useDashboardPlotSpectra(catalogSelections);

  const plotModel = useMemo(
    () =>
      buildDashboardPlotModel({
        datasets,
        channelId: state.channel,
        selectedGeometryKeys: state.geometryKeys,
      }),
    [datasets, state.channel, state.geometryKeys],
  );

  const emptyMessage =
    state.datasets.length === 0
      ? "Select one or more catalog datasets from the left panel to compare spectra."
      : isLoading
        ? "Loading spectrum points..."
        : errorMessage ?? "No plottable points for the selected channel and geometries.";

  return (
    <div className="flex w-full flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <Link
            href="/dashboard"
            className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <LineChart className="text-accent h-5 w-5 shrink-0" aria-hidden />
            <h1 className="text-foreground text-2xl font-semibold tracking-tight">
              Compare spectra
            </h1>
          </div>
          <p className="text-muted max-w-2xl text-sm leading-relaxed">
            Overlay published NEXAFS datasets from the Atlas catalog. Local STXM
            processing remains in the beamline workspace.
          </p>
        </div>
        <Link
          href="/browse/nexafs"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          Open full browse
        </Link>
      </header>

      <div className="flex min-h-[70vh] w-full min-w-0 gap-4">
        <PlotViewerSelectionPanel
          state={state}
          debouncedQuery={debouncedQuery}
          urlSynced={urlSynced}
          spectraByExperimentId={spectraByExperimentId}
          onQueryChange={urlState.setQuery}
          onChannelChange={urlState.setChannel}
          onToggleDataset={urlState.toggleDataset}
          onToggleFacet={urlState.toggleFacet}
          onToggleGeometryKey={urlState.toggleGeometryKey}
          onClearFacets={urlState.clearFacets}
        />

        <section className="border-border bg-surface flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border">
          <div className="border-border flex items-center justify-between gap-2 border-b px-4 py-3">
            <div>
              <p className="text-foreground text-sm font-medium">Spectrum plot</p>
              <p className="text-muted text-xs">
                {state.datasets.length} dataset
                {state.datasets.length === 1 ? "" : "s"} selected
              </p>
            </div>
            {isLoading ? <Spinner size="sm" /> : null}
          </div>
          <div className="min-h-0 flex-1 p-4">
            {plotModel.isEmpty ? (
              <div className="border-border bg-default/20 text-muted flex h-full min-h-[420px] items-center justify-center rounded-lg border border-dashed px-6 text-center text-sm">
                {emptyMessage}
              </div>
            ) : (
              <SpectrumPlot
                points={plotModel.points}
                height={560}
                yAxisQuantity={plotModel.yAxisQuantity}
                companionSpectra={plotModel.companionSpectra}
                primaryTraceLabel={plotModel.primaryTraceLabel}
                hideGeometryLegend={plotModel.companionSpectra.length > 0}
                emptyStateMessage={emptyMessage}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
