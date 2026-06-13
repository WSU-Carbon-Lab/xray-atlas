"use client";

import Link from "next/link";
import { memo, useEffect, useMemo, useState, useCallback } from "react";
import {
  Button,
  Label,
  Spinner,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { ArrowLeft, LayoutGrid, LineChart } from "lucide-react";
import { useTheme } from "next-themes";
import { SpectrumPlot } from "~/components/plots/spectrum-plot";
import type { CursorMode } from "~/components/plots/spectrum/ModeBar";
import {
  plotToolbarIconToolClass,
  PlotToolbarRichHint,
} from "~/components/plots/toolbars";
import { downloadSpectrumCsv } from "~/components/nexafs/nexafs-spectrum-csv-shared";
import { trpc } from "~/trpc/client";
import {
  geometryKeySetsEqual,
  reconcileGeometryKeysAfterSpectraLoad,
} from "./geometry-selection";
import { plotViewerGroupMatchesFacilityFacet } from "./plot-viewer-facility-key";
import { PlotViewerChannelSelect } from "./plot-viewer-channel-select";
import { buildPlotViewerExperimentStyleItems } from "./plot-viewer-experiment-styles";
import {
  buildPlotViewerLegendRows,
  resolvePlotViewerLegendDescriptorFields,
} from "./plot-viewer-legend";
import { mapPlotViewerLegendToDescriptorConfig } from "./plot-viewer-descriptor-legend-map";
import { filterPlotViewerTracesByHiddenIds } from "./plot-viewer-hidden-traces";
import { PlotViewerLegendPlacementToggle } from "./plot-viewer-legend-placement";
import { PlotViewerPopoutLegend } from "./plot-viewer-popout-legend";
import { PlotViewerCompactLegend } from "./plot-viewer-compact-legend";
import {
  buildPlotViewerTraceOverrideRows,
} from "./plot-viewer-style-mapping-utils";
import {
  readPlotViewerStyleOverrides,
  writePlotViewerExperimentColorMode,
  writePlotViewerExperimentLineDashOverride,
  writePlotViewerExperimentLineWidthOverride,
  writePlotViewerExperimentMarkerEveryOverride,
  writePlotViewerExperimentMarkerOverride,
  writePlotViewerExperimentMarkerSizeOverride,
  writePlotViewerLineDashOverride,
  writePlotViewerMarkerOverride,
  writePlotViewerTraceStyleOverride,
  type PlotViewerExperimentColorMode,
  type PlotViewerTraceStyleOverride,
} from "./plot-viewer-style-overrides";
import { PlotViewerStyleAccordion } from "./plot-viewer-style-accordion";
import { PlotViewerPanelToggle } from "./plot-viewer-panel-toggle";
import { PlotViewerSelectionPanel } from "./plot-viewer-selection-panel";
import { partitionPlotViewerTracesByGeometry } from "./plot-viewer-subplot-partition";
import { PlotViewerSubplotGrid } from "./plot-viewer-subplot-grid";
import {
  catalogMetaFallback,
  catalogMetaFromBrowseGroup,
  plotViewerExperimentGroupLabel,
} from "./plot-viewer-catalog-meta";
import {
  buildPlotViewerStyledTraces,
  type PlotViewerCatalogMeta,
} from "./plot-viewer-styled-traces";
import { usePlotViewerSelectedGroupIndex } from "./use-plot-viewer-selected-group-index";
import type {
  PlotViewerLineDash,
  PlotViewerMarkerSymbol,
} from "./plot-viewer-trace-styles";
import { useDashboardPlotSpectra } from "./use-dashboard-plot-spectra";
import { usePlotViewerUrlState } from "./use-plot-viewer-url-state";
import type { SpectrumPlotProps } from "~/components/plots/types";

type DashboardPlotOverlayProps = Pick<
  SpectrumPlotProps,
  | "points"
  | "yAxisQuantity"
  | "companionSpectra"
  | "primaryTraceLabel"
  | "primaryTraceColor"
  | "primaryTraceLineDash"
  | "primaryTraceLineWidth"
  | "primaryTraceMarkerSymbol"
  | "primaryTraceMarkerEvery"
  | "primaryTraceMarkerSize"
  | "primaryTraceLegendId"
  | "descriptorTraceLegend"
  | "channelLegendGlyph"
  | "energyStats"
  | "plotTopRailDataActions"
  | "emptyStateMessage"
> & {
  cursorMode: CursorMode;
  onCursorModeChange: (mode: CursorMode) => void;
  useInPlotLegend: boolean;
};

const DashboardPlotOverlay = memo(function DashboardPlotOverlay({
  points,
  yAxisQuantity,
  companionSpectra,
  primaryTraceLabel,
  primaryTraceColor,
  primaryTraceLineDash,
  primaryTraceLineWidth,
  primaryTraceMarkerSymbol,
  primaryTraceMarkerEvery,
  primaryTraceMarkerSize,
  primaryTraceLegendId,
  descriptorTraceLegend,
  channelLegendGlyph,
  energyStats,
  plotTopRailDataActions,
  emptyStateMessage,
  cursorMode,
  onCursorModeChange,
  useInPlotLegend,
}: DashboardPlotOverlayProps) {
  return (
    <SpectrumPlot
      points={points}
      yAxisQuantity={yAxisQuantity}
      companionSpectra={companionSpectra}
      primaryTraceLabel={primaryTraceLabel}
      primaryTraceColor={primaryTraceColor}
      primaryTraceLineDash={primaryTraceLineDash}
      primaryTraceLineWidth={primaryTraceLineWidth}
      primaryTraceMarkerSymbol={primaryTraceMarkerSymbol}
      primaryTraceMarkerEvery={primaryTraceMarkerEvery}
      primaryTraceMarkerSize={primaryTraceMarkerSize}
      primaryTraceLegendId={primaryTraceLegendId}
      hideGeometryLegend
      suppressInPlotLegend={!useInPlotLegend}
      descriptorTraceLegend={descriptorTraceLegend}
      channelLegendGlyph={channelLegendGlyph}
      energyStats={energyStats}
      cursorMode={cursorMode}
      onCursorModeChange={onCursorModeChange}
      plotContext={{ kind: "explore" }}
      plotTopRailDataActions={plotTopRailDataActions}
      suppressAnalysisRailLeadingGrip
      emptyStateMessage={emptyStateMessage}
    />
  );
});

/**
 * Dashboard unified plot viewer: faceted catalog picker plus multi-trace spectrum overlay.
 */
export function DashboardPlotViewerPage() {
  const urlState = usePlotViewerUrlState();
  const {
    state,
    query,
    debouncedQuery,
    urlSynced,
    setGeometryKeys,
    setPanelOpen,
    setViewMode,
    toggleDescriptorField,
    setPaletteId,
    setColorBy,
    setLineStyleBy,
    setMarkerBy,
    setLegendPlacement,
    setLegendDock,
    setLegendTrayOpen,
    toggleHiddenTrace,
    setChannel,
    onQueryFocus,
    onQueryBlur,
    ...urlActions
  } = urlState;
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [cursorMode, setCursorMode] = useState<CursorMode>("inspect");
  const [styleOverrides, setStyleOverrides] = useState(() =>
    typeof window === "undefined"
      ? {
          lineDash: {},
          marker: {},
          experimentLineDash: {},
          experimentLineWidth: {},
          experimentMarker: {},
          experimentMarkerSize: {},
          experimentMarkerEvery: {},
          experimentColorMode: {},
          experimentFixedColor: {},
          traceOverrides: {},
        }
      : readPlotViewerStyleOverrides(),
  );

  const datasetSelectionKey = state.datasets.join(",");
  useEffect(() => {
    setStyleOverrides(readPlotViewerStyleOverrides());
  }, [datasetSelectionKey]);

  const handleLineDashOverrideChange = useCallback(
    (fieldValue: string, lineDash: PlotViewerLineDash) => {
      setStyleOverrides(writePlotViewerLineDashOverride(fieldValue, lineDash));
    },
    [],
  );

  const handleMarkerOverrideChange = useCallback(
    (fieldValue: string, markerSymbol: PlotViewerMarkerSymbol) => {
      setStyleOverrides(writePlotViewerMarkerOverride(fieldValue, markerSymbol));
    },
    [],
  );

  const handleExperimentColorModeChange = useCallback(
    (
      experimentId: string,
      mode: PlotViewerExperimentColorMode,
      fixedColor: string | null,
    ) => {
      setStyleOverrides(
        writePlotViewerExperimentColorMode(experimentId, mode, fixedColor),
      );
    },
    [],
  );

  const handleExperimentLineDashChange = useCallback(
    (experimentId: string, lineDash: PlotViewerLineDash | null) => {
      setStyleOverrides(
        writePlotViewerExperimentLineDashOverride(experimentId, lineDash),
      );
    },
    [],
  );

  const handleExperimentLineWidthChange = useCallback(
    (experimentId: string, lineWidth: number | null) => {
      setStyleOverrides(
        writePlotViewerExperimentLineWidthOverride(experimentId, lineWidth),
      );
    },
    [],
  );

  const handleExperimentMarkerChange = useCallback(
    (experimentId: string, marker: PlotViewerMarkerSymbol | null) => {
      setStyleOverrides(
        writePlotViewerExperimentMarkerOverride(experimentId, marker),
      );
    },
    [],
  );

  const handleExperimentMarkerSizeChange = useCallback(
    (experimentId: string, markerSize: number | null) => {
      setStyleOverrides(
        writePlotViewerExperimentMarkerSizeOverride(experimentId, markerSize),
      );
    },
    [],
  );

  const handleExperimentMarkerEveryChange = useCallback(
    (experimentId: string, markerEvery: number | null) => {
      setStyleOverrides(
        writePlotViewerExperimentMarkerEveryOverride(experimentId, markerEvery),
      );
    },
    [],
  );

  const handleTraceStyleOverrideChange = useCallback(
    (
      traceKey: string,
      patch: Partial<PlotViewerTraceStyleOverride>,
      clearKeys: readonly (keyof PlotViewerTraceStyleOverride)[] = [],
    ) => {
      setStyleOverrides(
        writePlotViewerTraceStyleOverride(traceKey, patch, clearKeys),
      );
    },
    [],
  );

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
    { enabled: urlSynced && debouncedQuery.length > 0, staleTime: 30_000, gcTime: 300_000 },
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
    { enabled: urlSynced && debouncedQuery.length === 0, staleTime: 30_000, gcTime: 300_000 },
  );

  const catalogGroups = useMemo(() => {
    const groups =
      debouncedQuery.length > 0
        ? (browseSearchQuery.data?.groups ?? [])
        : (browseListQuery.data?.groups ?? []);
    return groups.filter((group) =>
      plotViewerGroupMatchesFacilityFacet(
        group.instrument.facilityName,
        state.facets.facility,
      ),
    );
  }, [
    browseListQuery.data?.groups,
    browseSearchQuery.data?.groups,
    debouncedQuery.length,
    state.facets.facility,
  ]);

  const groupById = usePlotViewerSelectedGroupIndex({
    urlSynced,
    selectedExperimentIds: state.datasets,
    catalogGroups,
  });

  const catalogMetaByExperimentId = useMemo(() => {
    const map = new Map<string, PlotViewerCatalogMeta>();
    for (const experimentId of state.datasets) {
      const group = groupById.get(experimentId);
      map.set(
        experimentId,
        group ? catalogMetaFromBrowseGroup(group) : catalogMetaFallback(experimentId),
      );
    }
    return map;
  }, [groupById, state.datasets]);

  const catalogSelections = useMemo(
    () =>
      state.datasets.map((experimentId) => {
        const group = groupById.get(experimentId);
        return {
          experimentId,
          label: group
            ? plotViewerExperimentGroupLabel(group)
            : experimentId,
          chemicalFormula: group?.molecule.chemicalformula ?? null,
        };
      }),
    [groupById, state.datasets],
  );

  const { datasets, spectraByExperimentId, isLoading, errorMessage } =
    useDashboardPlotSpectra(catalogSelections, {
      enabled: state.datasets.length > 0,
    });

  useEffect(() => {
    if (!urlSynced || state.datasets.length === 0) {
      return;
    }
    const nextGeometryKeys = reconcileGeometryKeysAfterSpectraLoad(
      state.datasets,
      state.geometryKeys,
      spectraByExperimentId,
    );
    if (!geometryKeySetsEqual(nextGeometryKeys, state.geometryKeys)) {
      setGeometryKeys(nextGeometryKeys);
    }
  }, [
    spectraByExperimentId,
    state.datasets,
    state.geometryKeys,
    setGeometryKeys,
    urlSynced,
  ]);

  const styledPlot = useMemo(
    () =>
      buildPlotViewerStyledTraces({
        datasets,
        catalogMetaByExperimentId,
        channelId: state.channel,
        selectedGeometryKeys: state.geometryKeys,
        paletteId: state.paletteId,
        colorBy: state.colorBy,
        lineStyleBy: state.lineStyleBy,
        markerBy: state.markerBy,
        isDark: isDark ?? true,
        experimentColorMode: styleOverrides.experimentColorMode,
        experimentFixedColor: styleOverrides.experimentFixedColor,
        lineDashOverrides: styleOverrides.lineDash,
        markerOverrides: styleOverrides.marker,
        experimentLineDashOverrides: styleOverrides.experimentLineDash,
        experimentLineWidthOverrides: styleOverrides.experimentLineWidth,
        experimentMarkerOverrides: styleOverrides.experimentMarker,
        experimentMarkerSizeOverrides: styleOverrides.experimentMarkerSize,
        experimentMarkerEveryOverrides: styleOverrides.experimentMarkerEvery,
        traceOverrides: styleOverrides.traceOverrides,
      }),
    [
      catalogMetaByExperimentId,
      datasets,
      isDark,
      state.channel,
      state.colorBy,
      state.geometryKeys,
      state.lineStyleBy,
      state.markerBy,
      state.paletteId,
      styleOverrides.experimentColorMode,
      styleOverrides.experimentFixedColor,
      styleOverrides.experimentLineDash,
      styleOverrides.experimentLineWidth,
      styleOverrides.experimentMarker,
      styleOverrides.experimentMarkerSize,
      styleOverrides.experimentMarkerEvery,
      styleOverrides.lineDash,
      styleOverrides.marker,
      styleOverrides.traceOverrides,
    ],
  );

  const experimentStyleItems = useMemo(
    () =>
      buildPlotViewerExperimentStyleItems({
        experimentIds: state.datasets,
        catalogMetaByExperimentId,
        traces: styledPlot.traces,
        paletteId: state.paletteId,
        colorBy: state.colorBy,
        lineStyleBy: state.lineStyleBy,
        markerBy: state.markerBy,
        isDark: isDark ?? true,
        experimentColorMode: styleOverrides.experimentColorMode,
        experimentFixedColor: styleOverrides.experimentFixedColor,
        lineDashOverrides: styleOverrides.lineDash,
        markerOverrides: styleOverrides.marker,
        experimentLineDashOverrides: styleOverrides.experimentLineDash,
        experimentLineWidthOverrides: styleOverrides.experimentLineWidth,
        experimentMarkerOverrides: styleOverrides.experimentMarker,
        experimentMarkerSizeOverrides: styleOverrides.experimentMarkerSize,
        experimentMarkerEveryOverrides: styleOverrides.experimentMarkerEvery,
        traceOverrides: styleOverrides.traceOverrides,
      }),
    [
      catalogMetaByExperimentId,
      isDark,
      state.colorBy,
      state.datasets,
      state.lineStyleBy,
      state.markerBy,
      state.paletteId,
      styleOverrides.experimentColorMode,
      styleOverrides.experimentFixedColor,
      styleOverrides.experimentLineDash,
      styleOverrides.experimentLineWidth,
      styleOverrides.experimentMarker,
      styleOverrides.experimentMarkerSize,
      styleOverrides.experimentMarkerEvery,
      styleOverrides.lineDash,
      styleOverrides.marker,
      styleOverrides.traceOverrides,
      styledPlot.traces,
    ],
  );

  const lineOverrideRows = useMemo(() => {
    if (state.lineStyleBy === "none") {
      return [];
    }
    return buildPlotViewerTraceOverrideRows({
      traces: styledPlot.traces,
      encodingField: state.lineStyleBy,
    });
  }, [state.lineStyleBy, styledPlot.traces]);

  const markerOverrideRows = useMemo(
    () =>
      buildPlotViewerTraceOverrideRows({
        traces: styledPlot.traces,
        encodingField: state.markerBy,
      }),
    [state.markerBy, styledPlot.traces],
  );

  const visibleTraces = useMemo(
    () =>
      filterPlotViewerTracesByHiddenIds(
        styledPlot.traces,
        state.hiddenTraceIds,
      ),
    [state.hiddenTraceIds, styledPlot.traces],
  );

  const legendDescriptorFields = useMemo(
    () =>
      resolvePlotViewerLegendDescriptorFields(
        state.descriptorFields,
        styledPlot.traces.map((trace) => trace.geometryKey),
      ),
    [state.descriptorFields, styledPlot.traces],
  );

  const legendRows = useMemo(
    () =>
      buildPlotViewerLegendRows(
        styledPlot.traces.map((trace) => ({
          traceKey: trace.traceKey,
          geometryKey: trace.geometryKey,
          geometrySortKey: trace.geometrySortKey,
          datasetOrder: trace.datasetOrder,
          channelGlyph: trace.channelGlyph,
          color: trace.color,
          lineDash: trace.lineDash,
          markerSymbol: trace.markerSymbol,
          descriptors: trace.descriptors,
        })),
        legendDescriptorFields,
      ),
    [legendDescriptorFields, styledPlot.traces],
  );

  const subplotPanels = useMemo(
    () => partitionPlotViewerTracesByGeometry(visibleTraces),
    [visibleTraces],
  );

  const overlayModel = useMemo(() => {
    const [primary, ...rest] = visibleTraces;
    if (!primary) {
      return null;
    }
    return {
      primary,
      companions: rest.map((trace) => ({
        label: trace.label,
        preferred: false,
        points: trace.points,
        color: trace.color,
        lineDash: trace.lineDash,
        lineWidth: trace.lineWidth,
        markerSymbol: trace.markerSymbol,
        markerEvery: trace.markerEvery,
        markerSize: trace.markerSize,
        legendId: trace.legendId,
      })),
    };
  }, [visibleTraces]);

  const sharedEnergyStats = useMemo(() => {
    let min: number | null = null;
    let max: number | null = null;
    for (const trace of visibleTraces) {
      for (const point of trace.points) {
        if (!Number.isFinite(point.energy)) {
          continue;
        }
        min = min == null ? point.energy : Math.min(min, point.energy);
        max = max == null ? point.energy : Math.max(max, point.energy);
      }
    }
    return { min, max };
  }, [visibleTraces]);

  const traceCount = visibleTraces.length;
  const showPlotControls =
    traceCount > 0 &&
    !isLoading &&
    state.datasets.length > 0 &&
    !styledPlot.isEmpty;
  const useInPlotLegend =
    state.viewMode === "overlay" && state.legendPlacement === "inplot";
  const usePopoutLegend =
    state.viewMode === "overlay" &&
    state.legendPlacement === "panel" &&
    showPlotControls;

  const descriptorTraceLegend = useMemo(() => {
    if (!useInPlotLegend) {
      return undefined;
    }
    return mapPlotViewerLegendToDescriptorConfig({
      rows: legendRows,
      descriptorFields: state.descriptorFields,
      channelColumnTitle: styledPlot.channelGlyph,
      hiddenTraceIds: state.hiddenTraceIds,
      onToggleTrace: toggleHiddenTrace,
    });
  }, [
    legendRows,
    state.descriptorFields,
    state.hiddenTraceIds,
    styledPlot.channelGlyph,
    toggleHiddenTrace,
    useInPlotLegend,
  ]);

  const plotCsvPoints = useMemo(() => {
    if (styledPlot.isEmpty) {
      return [];
    }
    return visibleTraces.flatMap((trace) => trace.points);
  }, [styledPlot.isEmpty, visibleTraces]);

  const plotTopRailDataActions = useMemo(() => {
    if (plotCsvPoints.length === 0) {
      return undefined;
    }
    return (
      <PlotToolbarRichHint
        title="Download CSV"
        description="Export persisted spectrum columns for all visible overlay traces."
      >
        <Button
          type="button"
          isIconOnly
          aria-label="Download overlay spectrum CSV"
          className={plotToolbarIconToolClass}
          onPress={() => {
            void downloadSpectrumCsv(
              plotCsvPoints,
              "dashboard-plot-overlay",
              { includeBareAtom: false },
            );
          }}
        >
          <ArrowDownTrayIcon className="h-5 w-5" aria-hidden />
        </Button>
      </PlotToolbarRichHint>
    );
  }, [plotCsvPoints]);

  const plotIdentityKey = useMemo(
    () => `${state.datasets.join(",")}:${state.channel}`,
    [state.channel, state.datasets],
  );

  const emptyMessage =
    state.datasets.length === 0
      ? "Select one or more catalog datasets from the left panel to compare spectra."
      : isLoading
        ? "Loading spectrum points..."
        : (errorMessage ??
          "No plottable points for the selected channel and geometries.");

  return (
    <div className="flex w-full min-h-[calc(100dvh-10rem)] flex-1 flex-col gap-3">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-3">
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

      <div className="flex min-h-[calc(100dvh-14rem)] w-full min-w-0 flex-1 gap-3">
        {state.panelOpen ? (
          <PlotViewerSelectionPanel
            state={state}
            query={query}
            debouncedQuery={debouncedQuery}
            urlSynced={urlSynced}
            spectraByExperimentId={spectraByExperimentId}
            onQueryChange={urlActions.setQuery}
            onQueryFocus={onQueryFocus}
            onQueryBlur={onQueryBlur}
            onToggleDataset={urlActions.toggleDataset}
            onToggleFacet={urlActions.toggleFacet}
            onClearFacets={urlActions.clearFacets}
          />
        ) : null}

        <section className="border-border bg-surface flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border">
          <div className="border-border bg-surface/95 sticky top-0 z-20 shrink-0 rounded-t-lg border-b backdrop-blur-sm">
            <div className="flex flex-wrap items-end justify-between gap-3 px-3 py-2.5">
              <div className="flex min-w-0 items-start gap-2">
                <PlotViewerPanelToggle
                  panelOpen={state.panelOpen}
                  onPanelOpenChange={setPanelOpen}
                />
                <div>
                  <p className="text-foreground text-sm font-medium">Spectrum plot</p>
                  <p className="text-muted text-xs">
                    {state.datasets.length} dataset
                    {state.datasets.length === 1 ? "" : "s"}
                    {traceCount > 0
                      ? ` · ${traceCount} trace${traceCount === 1 ? "" : "s"}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-muted text-[10px] font-medium uppercase tracking-wide">
                    Layout
                  </Label>
                  <ToggleButtonGroup
                    selectionMode="single"
                    selectedKeys={[state.viewMode]}
                    onSelectionChange={(keys) => {
                      const key = [...keys][0];
                      if (key === "overlay" || key === "subplots") {
                        setViewMode(key);
                      }
                    }}
                    aria-label="Plot layout mode"
                  >
                    <ToggleButton id="overlay" size="sm">
                      Overlay
                    </ToggleButton>
                    <ToggleButton id="subplots" size="sm">
                      <LayoutGrid className="me-1 inline h-3.5 w-3.5" aria-hidden />
                      Subplots
                    </ToggleButton>
                  </ToggleButtonGroup>
                </div>

                {state.viewMode === "overlay" ? (
                  <PlotViewerLegendPlacementToggle
                    placement={state.legendPlacement}
                    onPlacementChange={setLegendPlacement}
                    disabled={isLoading}
                  />
                ) : null}

                <PlotViewerChannelSelect
                  channel={state.channel}
                  onChannelChange={setChannel}
                  disabled={isLoading}
                />

                {isLoading ? <Spinner size="sm" aria-label="Loading spectra" /> : null}
              </div>
            </div>
          </div>

          {showPlotControls ? (
            <div className="border-border max-h-[30vh] shrink-0 overflow-y-auto border-b px-2 py-1.5">
              <PlotViewerStyleAccordion
                experimentItems={experimentStyleItems}
                paletteId={state.paletteId}
                isDark={isDark ?? false}
                colorBy={state.colorBy}
                lineStyleBy={state.lineStyleBy}
                markerBy={state.markerBy}
                descriptorFields={state.descriptorFields}
                lineOverrideRows={
                  state.lineStyleBy === "none" ? [] : lineOverrideRows
                }
                markerOverrideRows={markerOverrideRows}
                lineDashOverrides={styleOverrides.lineDash}
                markerOverrides={styleOverrides.marker}
                onPaletteChange={setPaletteId}
                onColorByChange={setColorBy}
                onLineStyleByChange={setLineStyleBy}
                onMarkerByChange={setMarkerBy}
                onToggleDescriptorField={toggleDescriptorField}
                onLineDashOverrideChange={handleLineDashOverrideChange}
                onMarkerOverrideChange={handleMarkerOverrideChange}
                onExperimentColorModeChange={handleExperimentColorModeChange}
                onExperimentLineDashChange={handleExperimentLineDashChange}
                onExperimentLineWidthChange={handleExperimentLineWidthChange}
                onExperimentMarkerChange={handleExperimentMarkerChange}
                onExperimentMarkerSizeChange={handleExperimentMarkerSizeChange}
                onExperimentMarkerEveryChange={handleExperimentMarkerEveryChange}
                onTraceStyleOverrideChange={handleTraceStyleOverrideChange}
              />
            </div>
          ) : null}

          <div className="flex min-h-[min(55vh,720px)] flex-1 flex-col overflow-hidden rounded-b-lg p-2">
            {state.datasets.length === 0 ? (
              <div className="border-border bg-default/20 text-muted flex min-h-[420px] flex-1 items-center justify-center rounded-lg border border-dashed px-6 text-center text-sm">
                {state.panelOpen
                  ? "Select catalog datasets from the left panel to begin comparing spectra on this canvas."
                  : "Open the dataset picker to add catalog datasets for comparison."}
              </div>
            ) : isLoading ? (
              <div className="border-border bg-default/20 text-muted flex min-h-[420px] flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 text-center text-sm">
                <Spinner size="md" aria-label="Loading spectrum points" />
                <span>Loading spectrum points for selected datasets...</span>
              </div>
            ) : styledPlot.isEmpty ? (
              <div className="border-border bg-default/20 text-muted flex min-h-[420px] flex-1 items-center justify-center rounded-lg border border-dashed px-6 text-center text-sm">
                {emptyMessage}
              </div>
            ) : state.viewMode === "subplots" ? (
              <div className="min-h-0 flex-1 overflow-auto">
                <PlotViewerSubplotGrid
                  panels={subplotPanels}
                  yAxisQuantity={styledPlot.yAxisQuantity}
                  channelGlyph={styledPlot.channelGlyph}
                  sharedEnergyStats={sharedEnergyStats}
                  cursorMode={cursorMode}
                  onCursorModeChange={setCursorMode}
                  emptyStateMessage={emptyMessage}
                />
              </div>
            ) : overlayModel ? (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-hidden">
                <div
                  className={cn(
                    "flex min-h-0 min-w-0 flex-1 items-stretch gap-0.5 overflow-hidden",
                    state.legendDock === "top" || state.legendDock === "bottom"
                      ? "flex-col"
                      : "flex-row",
                  )}
                >
                  {usePopoutLegend &&
                  (state.legendDock === "top" || state.legendDock === "left") ? (
                    <PlotViewerPopoutLegend
                      rows={legendRows}
                      descriptorFields={state.descriptorFields}
                      channelColumnTitle={styledPlot.channelGlyph}
                      dock={state.legendDock}
                      trayOpen={state.legendTrayOpen}
                      onTrayOpenChange={setLegendTrayOpen}
                      onLegendDockChange={setLegendDock}
                      hiddenTraceIds={state.hiddenTraceIds}
                      onToggleTrace={toggleHiddenTrace}
                    />
                  ) : null}
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col self-stretch">
                    <DashboardPlotOverlay
                      key={plotIdentityKey}
                      points={overlayModel.primary.points}
                      yAxisQuantity={styledPlot.yAxisQuantity}
                      companionSpectra={overlayModel.companions}
                      primaryTraceLabel={overlayModel.primary.label}
                      primaryTraceColor={overlayModel.primary.color}
                      primaryTraceLineDash={overlayModel.primary.lineDash}
                      primaryTraceLineWidth={overlayModel.primary.lineWidth}
                      primaryTraceMarkerSymbol={
                        overlayModel.primary.markerSymbol === "none"
                          ? undefined
                          : overlayModel.primary.markerSymbol
                      }
                      primaryTraceMarkerEvery={overlayModel.primary.markerEvery}
                      primaryTraceMarkerSize={overlayModel.primary.markerSize}
                      primaryTraceLegendId={overlayModel.primary.legendId}
                      descriptorTraceLegend={descriptorTraceLegend}
                      channelLegendGlyph={styledPlot.channelGlyph}
                      energyStats={sharedEnergyStats}
                      cursorMode={cursorMode}
                      onCursorModeChange={setCursorMode}
                      useInPlotLegend={useInPlotLegend}
                      plotTopRailDataActions={plotTopRailDataActions}
                      emptyStateMessage={emptyMessage}
                    />
                  </div>
                  {usePopoutLegend &&
                  (state.legendDock === "right" ||
                    state.legendDock === "bottom") ? (
                    <PlotViewerPopoutLegend
                      rows={legendRows}
                      descriptorFields={state.descriptorFields}
                      channelColumnTitle={styledPlot.channelGlyph}
                      dock={state.legendDock}
                      trayOpen={state.legendTrayOpen}
                      onTrayOpenChange={setLegendTrayOpen}
                      onLegendDockChange={setLegendDock}
                      hiddenTraceIds={state.hiddenTraceIds}
                      onToggleTrace={toggleHiddenTrace}
                    />
                  ) : null}
                </div>
                {usePopoutLegend ? (
                  <div className="sm:hidden">
                    <PlotViewerCompactLegend
                      rows={legendRows}
                      descriptorFields={state.descriptorFields}
                      channelColumnTitle={styledPlot.channelGlyph}
                      hiddenTraceIds={state.hiddenTraceIds}
                      onToggleTrace={toggleHiddenTrace}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
