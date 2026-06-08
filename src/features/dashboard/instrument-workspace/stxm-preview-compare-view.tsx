"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@heroui/styles";
import { useTheme } from "next-themes";
import { SpectrumPlot } from "~/components/plots/spectrum-plot";
import type { CursorMode } from "~/components/plots/spectrum/ModeBar";
import type { ReferenceCurve } from "~/components/plots/types";
import type {
  DashboardIngestionResult,
  DashboardPreviewAtlasEntry,
  DashboardPreviewRegionSpectrum,
  DashboardPreviewSpectrumEntry,
} from "~/lib/dashboard-processing-session";
import type { DashboardPlotDatasetInput } from "~/features/dashboard/plot-viewer/build-dashboard-plot-model";
import type { PlotViewerCatalogMeta } from "~/features/dashboard/plot-viewer/plot-viewer-styled-traces";
import { filterPlotViewerTracesByHiddenIds } from "~/features/dashboard/plot-viewer/plot-viewer-hidden-traces";
import {
  buildPlotViewerLegendRows,
  resolvePlotViewerLegendDescriptorFields,
  type PlotViewerDescriptorField,
} from "~/features/dashboard/plot-viewer/plot-viewer-legend";
import { mapPlotViewerLegendToDescriptorConfig } from "~/features/dashboard/plot-viewer/plot-viewer-descriptor-legend-map";
import { PlotViewerCompactLegend } from "~/features/dashboard/plot-viewer/plot-viewer-compact-legend";
import { PlotViewerLegendPlacementToggle } from "~/features/dashboard/plot-viewer/plot-viewer-legend-placement";
import { PlotViewerPopoutLegend } from "~/features/dashboard/plot-viewer/plot-viewer-popout-legend";
import {
  buildPlotViewerTraceOverrideRows,
} from "~/features/dashboard/plot-viewer/plot-viewer-style-mapping-utils";
import {
  readStxmPreviewStyleOverrides,
  writeStxmPreviewExperimentColorMode,
  writeStxmPreviewExperimentLineDashOverride,
  writeStxmPreviewExperimentLineWidthOverride,
  writeStxmPreviewExperimentMarkerEveryOverride,
  writeStxmPreviewExperimentMarkerOverride,
  writeStxmPreviewExperimentMarkerSizeOverride,
  writeStxmPreviewLineDashOverride,
  writeStxmPreviewMarkerOverride,
  writeStxmPreviewTraceStyleOverride,
  type PlotViewerStyleOverrides,
} from "~/features/dashboard/plot-viewer/plot-viewer-style-overrides";
import { PlotViewerStyleAccordion } from "~/features/dashboard/plot-viewer/plot-viewer-style-accordion";
import { buildPlotViewerExperimentStyleItems } from "~/features/dashboard/plot-viewer/plot-viewer-experiment-styles";
import {
  type PlotViewerPaletteId,
} from "~/features/dashboard/plot-viewer/plot-viewer-palette-catalog";
import type {
  PlotViewerLegendDock,
  PlotViewerLegendPlacement,
} from "~/features/dashboard/plot-viewer/plot-viewer-url-state";
import type {
  PlotViewerLineDash,
  PlotViewerLineStyleBy,
  PlotViewerMarkerSymbol,
  PlotViewerStyleMappingField,
} from "~/features/dashboard/plot-viewer/plot-viewer-trace-styles";
import { channelDefinitionById } from "~/components/plots/data-rail";
import { STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION } from "~/lib/stxm/stxm-ingestion-plot-data-rail-config";
import { StxmPreviewChannelSelect } from "./stxm-preview-channel-select";
import {
  StxmPreviewSelectionPanelHeader,
} from "./stxm-preview-selection-panel";
import {
  buildPreviewCompareStyledTraces,
  DEFAULT_STXM_PREVIEW_COLOR_BY,
  DEFAULT_STXM_PREVIEW_DESCRIPTOR_FIELDS,
  DEFAULT_STXM_PREVIEW_LINE_STYLE_BY,
  DEFAULT_STXM_PREVIEW_MARKER_BY,
  listAtlasPreviewTraceCandidates,
  listStxmPreviewTraceCandidates,
  type StxmPreviewCompareChannel,
} from "./stxm-preview-styled-traces";
import {
  buildPreviewCompareBareAtomReferenceCurve,
  resolvePreviewCompareBareAtomContext,
} from "./stxm-preview-bare-atom";
import { StxmPreviewBareAtomToggle } from "./stxm-preview-bare-atom-toggle";
import { warmBareAtomCacheForFormula } from "~/features/process-nexafs/utils/bareAtomCalculation";

export type StxmPreviewCompareViewProps = {
  entries: readonly DashboardPreviewSpectrumEntry[];
  atlasEntries: readonly DashboardPreviewAtlasEntry[];
  atlasDatasets: readonly DashboardPlotDatasetInput[];
  atlasGeometryByExperimentId: Readonly<
    Record<string, readonly string[] | undefined>
  >;
  catalogMetaByExperimentId: ReadonlyMap<string, PlotViewerCatalogMeta>;
  ingestionByScanId: Readonly<
    Record<string, DashboardIngestionResult | undefined>
  >;
  regionSpectraByScanId: Readonly<
    Record<string, readonly DashboardPreviewRegionSpectrum[] | undefined>
  >;
  selectedTraceKeys: readonly string[];
  panelOpen: boolean;
  onPanelOpenChange: (open: boolean) => void;
};

const StxmPreviewPlotOverlay = memo(function StxmPreviewPlotOverlay(props: {
  points: Parameters<typeof SpectrumPlot>[0]["points"];
  yAxisQuantity: Parameters<typeof SpectrumPlot>[0]["yAxisQuantity"];
  companionSpectra: Parameters<typeof SpectrumPlot>[0]["companionSpectra"];
  primaryTraceLabel?: string;
  primaryTraceColor?: string;
  primaryTraceLineDash?: PlotViewerLineDash;
  primaryTraceLineWidth?: number;
  primaryTraceMarkerSymbol?: PlotViewerMarkerSymbol;
  primaryTraceMarkerEvery?: number;
  primaryTraceMarkerSize?: number;
  primaryTraceLegendId?: string;
  descriptorTraceLegend?: Parameters<
    typeof SpectrumPlot
  >[0]["descriptorTraceLegend"];
  channelLegendGlyph?: string;
  referenceCurves?: ReferenceCurve[];
  cursorMode: CursorMode;
  onCursorModeChange: (mode: CursorMode) => void;
  useInPlotLegend: boolean;
  emptyStateMessage: string;
}) {
  const primaryMarker =
    props.primaryTraceMarkerSymbol === "none"
      ? undefined
      : props.primaryTraceMarkerSymbol;
  return (
    <SpectrumPlot
      points={props.points}
      yAxisQuantity={props.yAxisQuantity}
      companionSpectra={props.companionSpectra}
      primaryTraceLabel={props.primaryTraceLabel}
      primaryTraceColor={props.primaryTraceColor}
      primaryTraceLineDash={props.primaryTraceLineDash}
      primaryTraceLineWidth={props.primaryTraceLineWidth}
      primaryTraceMarkerSymbol={primaryMarker}
      primaryTraceMarkerEvery={props.primaryTraceMarkerEvery}
      primaryTraceMarkerSize={props.primaryTraceMarkerSize}
      primaryTraceLegendId={props.primaryTraceLegendId}
      hideGeometryLegend
      suppressInPlotLegend={!props.useInPlotLegend}
      descriptorTraceLegend={props.descriptorTraceLegend}
      channelLegendGlyph={props.channelLegendGlyph}
      referenceCurves={props.referenceCurves}
      cursorMode={props.cursorMode}
      onCursorModeChange={props.onCursorModeChange}
      plotContext={{ kind: "explore" }}
      suppressAnalysisRailLeadingGrip
      emptyStateMessage={props.emptyStateMessage}
    />
  );
});

/**
 * Dashboard-style overlay compare plot for cached STXM preview traces.
 */
export function StxmPreviewCompareView({
  entries,
  atlasEntries,
  atlasDatasets,
  atlasGeometryByExperimentId,
  catalogMetaByExperimentId,
  ingestionByScanId,
  regionSpectraByScanId,
  selectedTraceKeys,
  panelOpen,
  onPanelOpenChange,
}: StxmPreviewCompareViewProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [channel, setChannel] = useState<StxmPreviewCompareChannel>("od_normalized");
  const [paletteId, setPaletteId] = useState<PlotViewerPaletteId>("spectrum");
  const [colorBy, setColorBy] = useState<PlotViewerStyleMappingField>(
    DEFAULT_STXM_PREVIEW_COLOR_BY,
  );
  const [lineStyleBy, setLineStyleBy] = useState<PlotViewerLineStyleBy>(
    DEFAULT_STXM_PREVIEW_LINE_STYLE_BY,
  );
  const [markerBy, setMarkerBy] = useState<PlotViewerStyleMappingField>(
    DEFAULT_STXM_PREVIEW_MARKER_BY,
  );
  const [descriptorFields, setDescriptorFields] = useState<
    PlotViewerDescriptorField[]
  >([...DEFAULT_STXM_PREVIEW_DESCRIPTOR_FIELDS]);
  const [legendPlacement, setLegendPlacement] =
    useState<PlotViewerLegendPlacement>("inplot");
  const [legendDock, setLegendDock] = useState<PlotViewerLegendDock>("right");
  const [legendTrayOpen, setLegendTrayOpen] = useState(true);
  const [hiddenTraceIds, setHiddenTraceIds] = useState<string[]>([]);
  const [cursorMode, setCursorMode] = useState<CursorMode>("inspect");
  const [showBareAtomOverlay, setShowBareAtomOverlay] = useState(false);
  const [bareAtomCurve, setBareAtomCurve] = useState<ReferenceCurve | null>(
    null,
  );
  const [styleOverrides, setStyleOverrides] = useState<PlotViewerStyleOverrides>(() =>
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
      : readStxmPreviewStyleOverrides(),
  );

  const allCandidates = useMemo(() => {
    const stxm = listStxmPreviewTraceCandidates({
      entries,
      ingestionByScanId,
      regionSpectraByScanId,
    });
    const atlas = listAtlasPreviewTraceCandidates({
      atlasEntries,
      datasets: atlasDatasets,
      geometryByExperimentId: atlasGeometryByExperimentId,
    });
    return [...stxm, ...atlas];
  }, [
    atlasDatasets,
    atlasEntries,
    atlasGeometryByExperimentId,
    entries,
    ingestionByScanId,
    regionSpectraByScanId,
  ]);

  const styledPlot = useMemo(
    () =>
      buildPreviewCompareStyledTraces({
        entries,
        atlasEntries,
        atlasDatasets,
        atlasGeometryByExperimentId,
        catalogMetaByExperimentId,
        ingestionByScanId,
        regionSpectraByScanId,
        selectedTraceKeys,
        channel,
        paletteId,
        colorBy,
        lineStyleBy,
        markerBy,
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
      atlasDatasets,
      atlasEntries,
      atlasGeometryByExperimentId,
      catalogMetaByExperimentId,
      channel,
      colorBy,
      entries,
      ingestionByScanId,
      isDark,
      lineStyleBy,
      markerBy,
      paletteId,
      regionSpectraByScanId,
      selectedTraceKeys,
      styleOverrides.experimentColorMode,
      styleOverrides.experimentFixedColor,
      styleOverrides.experimentLineDash,
      styleOverrides.experimentLineWidth,
      styleOverrides.experimentMarker,
      styleOverrides.experimentMarkerEvery,
      styleOverrides.experimentMarkerSize,
      styleOverrides.lineDash,
      styleOverrides.marker,
      styleOverrides.traceOverrides,
    ],
  );

  const experimentIds = useMemo(
    () => [...new Set(styledPlot.traces.map((trace) => trace.experimentId))],
    [styledPlot.traces],
  );

  const catalogMetaByExperimentIdForStyles = useMemo(() => {
    const map = new Map(catalogMetaByExperimentId);
    for (const entry of entries) {
      if (!map.has(entry.scanId)) {
        map.set(entry.scanId, {
          experimentId: entry.scanId,
          moleculeName: entry.moleculeName ?? entry.scanLabel,
          edgeLabel: entry.edgeLabel ?? "Edge unknown",
          instrumentName: entry.scanLabel,
          facilityName: "Local cache",
        });
      }
    }
    return map;
  }, [catalogMetaByExperimentId, entries]);

  const experimentStyleItems = useMemo(
    () =>
      buildPlotViewerExperimentStyleItems({
        experimentIds,
        catalogMetaByExperimentId: catalogMetaByExperimentIdForStyles,
        traces: styledPlot.traces,
        paletteId,
        colorBy,
        lineStyleBy,
        markerBy,
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
      catalogMetaByExperimentIdForStyles,
      colorBy,
      experimentIds,
      isDark,
      lineStyleBy,
      markerBy,
      paletteId,
      styleOverrides.experimentColorMode,
      styleOverrides.experimentFixedColor,
      styleOverrides.experimentLineDash,
      styleOverrides.experimentLineWidth,
      styleOverrides.experimentMarker,
      styleOverrides.experimentMarkerEvery,
      styleOverrides.experimentMarkerSize,
      styleOverrides.lineDash,
      styleOverrides.marker,
      styleOverrides.traceOverrides,
      styledPlot.traces,
    ],
  );

  const lineOverrideRows = useMemo(() => {
    if (lineStyleBy === "none") {
      return [];
    }
    return buildPlotViewerTraceOverrideRows({
      traces: styledPlot.traces,
      encodingField: lineStyleBy,
    });
  }, [lineStyleBy, styledPlot.traces]);

  const markerOverrideRows = useMemo(
    () =>
      buildPlotViewerTraceOverrideRows({
        traces: styledPlot.traces,
        encodingField: markerBy,
      }),
    [markerBy, styledPlot.traces],
  );

  const visibleTraces = useMemo(
    () =>
      filterPlotViewerTracesByHiddenIds(styledPlot.traces, hiddenTraceIds),
    [hiddenTraceIds, styledPlot.traces],
  );

  const legendDescriptorFields = useMemo(
    () =>
      resolvePlotViewerLegendDescriptorFields(
        descriptorFields,
        styledPlot.traces.map((trace) => trace.geometryKey),
      ),
    [descriptorFields, styledPlot.traces],
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

  const toggleHiddenTrace = useCallback((traceKey: string) => {
    setHiddenTraceIds((current) =>
      current.includes(traceKey)
        ? current.filter((id) => id !== traceKey)
        : [...current, traceKey],
    );
  }, []);

  const toggleDescriptorField = useCallback((field: PlotViewerDescriptorField) => {
    setDescriptorFields((current) =>
      current.includes(field)
        ? current.filter((value) => value !== field)
        : [...current, field],
    );
  }, []);

  const overlayModel = useMemo(() => {
    const [primary, ...rest] = visibleTraces;
    if (!primary) {
      return null;
    }
    return { primary, companions: rest };
  }, [visibleTraces]);

  const bareAtomContext = useMemo(
    () =>
      resolvePreviewCompareBareAtomContext({
        channel,
        visibleTraceKeys: visibleTraces.map((trace) => trace.traceKey),
        visiblePoints: visibleTraces.flatMap((trace) => trace.points),
        ingestionByScanId,
        atlasDatasets,
      }),
    [atlasDatasets, channel, ingestionByScanId, visibleTraces],
  );

  useEffect(() => {
    if (bareAtomContext.disabled && showBareAtomOverlay) {
      setShowBareAtomOverlay(false);
    }
  }, [bareAtomContext.disabled, showBareAtomOverlay]);

  useEffect(() => {
    if (!bareAtomContext.formula) {
      return;
    }
    void warmBareAtomCacheForFormula(bareAtomContext.formula).catch(
      () => undefined,
    );
  }, [bareAtomContext.formula]);

  useEffect(() => {
    if (
      !showBareAtomOverlay ||
      !bareAtomContext.formula ||
      bareAtomContext.energyEv.length < 2
    ) {
      setBareAtomCurve(null);
      return;
    }
    let cancelled = false;
    void buildPreviewCompareBareAtomReferenceCurve({
      chemicalFormula: bareAtomContext.formula,
      energyEv: bareAtomContext.energyEv,
      channel,
      isDark: isDark ?? true,
    }).then((curve) => {
      if (!cancelled) {
        setBareAtomCurve(curve);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    bareAtomContext.energyEv,
    bareAtomContext.formula,
    channel,
    isDark,
    showBareAtomOverlay,
  ]);

  const referenceCurves = useMemo((): ReferenceCurve[] => {
    if (!showBareAtomOverlay || !bareAtomCurve) {
      return [];
    }
    return [bareAtomCurve];
  }, [bareAtomCurve, showBareAtomOverlay]);

  const useInPlotLegend = legendPlacement === "inplot";
  const usePopoutLegend = legendPlacement === "panel" && visibleTraces.length > 0;

  const descriptorTraceLegend = useMemo(() => {
    if (!useInPlotLegend) {
      return undefined;
    }
    return mapPlotViewerLegendToDescriptorConfig({
      rows: legendRows,
      descriptorFields,
      channelColumnTitle: styledPlot.channelGlyph,
      hiddenTraceIds,
      onToggleTrace: toggleHiddenTrace,
    });
  }, [
    descriptorFields,
    hiddenTraceIds,
    legendRows,
    styledPlot.channelGlyph,
    toggleHiddenTrace,
    useInPlotLegend,
  ]);

  const yAxisQuantity = channelDefinitionById(
    STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION,
    channel,
  ).yAxisQuantity;

  const emptyMessage =
    selectedTraceKeys.length === 0
      ? "Select traces from cached line scans or Atlas datasets."
      : styledPlot.isEmpty
        ? "Selected traces have no finite points for this channel."
        : "No plottable preview traces.";

  return (
    <section className="border-border bg-surface flex min-h-[28rem] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border">
      <div className="border-border bg-surface/95 sticky top-0 z-20 shrink-0 rounded-t-lg border-b backdrop-blur-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 px-3 py-2.5">
          <StxmPreviewSelectionPanelHeader
            panelOpen={panelOpen}
            onPanelOpenChange={onPanelOpenChange}
            traceCount={allCandidates.length}
            selectedTraceCount={visibleTraces.length}
          />
          <div className="flex flex-wrap items-end gap-2">
            <StxmPreviewChannelSelect
              channel={channel}
              onChannelChange={setChannel}
              disabled={styledPlot.isEmpty}
            />
            <StxmPreviewBareAtomToggle
              showBareAtomOverlay={showBareAtomOverlay}
              onShowBareAtomOverlayChange={setShowBareAtomOverlay}
              disabled={bareAtomContext.disabled}
              disabledReason={bareAtomContext.disabledReason}
            />
            <PlotViewerLegendPlacementToggle
              placement={legendPlacement}
              onPlacementChange={setLegendPlacement}
              disabled={styledPlot.traces.length === 0}
            />
          </div>
        </div>
        {experimentStyleItems.length > 0 ? (
          <div className="border-border border-t px-3 py-2">
            <PlotViewerStyleAccordion
              paletteId={paletteId}
              isDark={isDark ?? true}
              colorBy={colorBy}
              lineStyleBy={lineStyleBy}
              markerBy={markerBy}
              descriptorFields={descriptorFields}
              lineOverrideRows={lineOverrideRows}
              markerOverrideRows={markerOverrideRows}
              lineDashOverrides={styleOverrides.lineDash}
              markerOverrides={styleOverrides.marker}
              experimentItems={experimentStyleItems}
              onPaletteChange={setPaletteId}
              onColorByChange={setColorBy}
              onLineStyleByChange={setLineStyleBy}
              onMarkerByChange={setMarkerBy}
              onToggleDescriptorField={toggleDescriptorField}
              onLineDashOverrideChange={(fieldValue, lineDash) => {
                setStyleOverrides(
                  writeStxmPreviewLineDashOverride(fieldValue, lineDash),
                );
              }}
              onMarkerOverrideChange={(fieldValue, marker) => {
                setStyleOverrides(
                  writeStxmPreviewMarkerOverride(fieldValue, marker),
                );
              }}
              onExperimentColorModeChange={(experimentId, mode, fixedColor) => {
                setStyleOverrides(
                  writeStxmPreviewExperimentColorMode(
                    experimentId,
                    mode,
                    fixedColor,
                  ),
                );
              }}
              onExperimentLineDashChange={(experimentId, lineDash) => {
                setStyleOverrides(
                  writeStxmPreviewExperimentLineDashOverride(
                    experimentId,
                    lineDash,
                  ),
                );
              }}
              onExperimentLineWidthChange={(experimentId, lineWidth) => {
                setStyleOverrides(
                  writeStxmPreviewExperimentLineWidthOverride(
                    experimentId,
                    lineWidth,
                  ),
                );
              }}
              onExperimentMarkerChange={(experimentId, marker) => {
                setStyleOverrides(
                  writeStxmPreviewExperimentMarkerOverride(experimentId, marker),
                );
              }}
              onExperimentMarkerSizeChange={(experimentId, markerSize) => {
                setStyleOverrides(
                  writeStxmPreviewExperimentMarkerSizeOverride(
                    experimentId,
                    markerSize,
                  ),
                );
              }}
              onExperimentMarkerEveryChange={(experimentId, markerEvery) => {
                setStyleOverrides(
                  writeStxmPreviewExperimentMarkerEveryOverride(
                    experimentId,
                    markerEvery,
                  ),
                );
              }}
              onTraceStyleOverrideChange={(traceKey, patch, clearKeys) => {
                setStyleOverrides(
                  writeStxmPreviewTraceStyleOverride(traceKey, patch, clearKeys),
                );
              }}
            />
          </div>
        ) : null}
      </div>

      <div className="flex min-h-[min(55vh,720px)] flex-1 flex-col overflow-hidden p-2">
        {overlayModel ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-hidden">
            <div
              className={cn(
                "flex min-h-0 min-w-0 flex-1 items-stretch gap-0.5 overflow-hidden",
                legendDock === "top" || legendDock === "bottom"
                  ? "flex-col"
                  : "flex-row",
              )}
            >
              {usePopoutLegend &&
              (legendDock === "top" || legendDock === "left") ? (
                <PlotViewerPopoutLegend
                  rows={legendRows}
                  descriptorFields={descriptorFields}
                  channelColumnTitle={styledPlot.channelGlyph}
                  dock={legendDock}
                  trayOpen={legendTrayOpen}
                  onTrayOpenChange={setLegendTrayOpen}
                  onLegendDockChange={setLegendDock}
                  hiddenTraceIds={hiddenTraceIds}
                  onToggleTrace={toggleHiddenTrace}
                />
              ) : null}
              <div className="flex min-h-0 min-w-0 flex-1 flex-col self-stretch">
                <StxmPreviewPlotOverlay
                  points={overlayModel.primary.points}
                  yAxisQuantity={yAxisQuantity}
                  companionSpectra={overlayModel.companions.map((trace) => ({
                    label: trace.label,
                    preferred: false,
                    points: trace.points,
                    color: trace.color,
                    lineDash: trace.lineDash,
                    lineWidth: trace.lineWidth,
                    markerSymbol:
                      trace.markerSymbol === "none"
                        ? undefined
                        : trace.markerSymbol,
                    markerEvery: trace.markerEvery,
                    markerSize: trace.markerSize,
                    legendId: trace.legendId,
                  }))}
                  primaryTraceLabel={overlayModel.primary.label}
                  primaryTraceColor={overlayModel.primary.color}
                  primaryTraceLineDash={overlayModel.primary.lineDash}
                  primaryTraceLineWidth={overlayModel.primary.lineWidth}
                  primaryTraceMarkerSymbol={overlayModel.primary.markerSymbol}
                  primaryTraceMarkerEvery={overlayModel.primary.markerEvery}
                  primaryTraceMarkerSize={overlayModel.primary.markerSize}
                  primaryTraceLegendId={overlayModel.primary.legendId}
                  descriptorTraceLegend={descriptorTraceLegend}
                  channelLegendGlyph={styledPlot.channelGlyph}
                  referenceCurves={referenceCurves}
                  cursorMode={cursorMode}
                  onCursorModeChange={setCursorMode}
                  useInPlotLegend={useInPlotLegend}
                  emptyStateMessage={emptyMessage}
                />
              </div>
              {usePopoutLegend &&
              (legendDock === "right" || legendDock === "bottom") ? (
                <PlotViewerPopoutLegend
                  rows={legendRows}
                  descriptorFields={descriptorFields}
                  channelColumnTitle={styledPlot.channelGlyph}
                  dock={legendDock}
                  trayOpen={legendTrayOpen}
                  onTrayOpenChange={setLegendTrayOpen}
                  onLegendDockChange={setLegendDock}
                  hiddenTraceIds={hiddenTraceIds}
                  onToggleTrace={toggleHiddenTrace}
                />
              ) : null}
            </div>
            {usePopoutLegend ? (
              <div className="sm:hidden">
                <PlotViewerCompactLegend
                  rows={legendRows}
                  descriptorFields={descriptorFields}
                  channelColumnTitle={styledPlot.channelGlyph}
                  hiddenTraceIds={hiddenTraceIds}
                  onToggleTrace={toggleHiddenTrace}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-muted flex min-h-[20rem] flex-1 items-center justify-center px-6 text-center text-sm">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  );
}
