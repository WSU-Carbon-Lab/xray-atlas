"use client";

import {
  useMemo,
  useCallback,
  useState,
  useRef,
  useEffect,
  useId,
} from "react";
import { useTheme } from "next-themes";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import type { TraceData } from "../types";
import type {
  SpectrumPlotProps,
  SpectrumSelection,
  SpectrumYAxisQuantity,
} from "../types";
import { spectrumYAxisPresentation } from "../utils/yAxisScientific";
import { useSpectrumData } from "../hooks/useSpectrumData";
import { useReferenceData } from "../hooks/useReferenceData";
import { useDataExtents } from "../hooks/useDataExtents";
import { usePeakVisualization } from "../hooks/usePeakVisualization";
import { findClosestPoint } from "../utils/find-closest-point";
import { eventToPlotCoords } from "../utils/svgPlotPointer";
import { PLOT_CONFIG, useChartThemeFromCSS } from "../config";
import { useSubplotLayout } from "./useSubplotLayout";
import { useOpticalLinkSplitLayout } from "./useOpticalLinkSplitLayout";
import { useTraceStackSplitLayout } from "./useTraceStackSplitLayout";
import {
  OpticalLinkSplitSpectrumBody,
  yAxisQuantityForOpticalRole,
} from "./OpticalLinkSplitSpectrumBody";
import { TraceStackSplitSpectrumBody } from "./TraceStackSplitSpectrumBody";
import {
  absorptionExtentFromTraces,
  filterTracesForOpticalLinkSplitRole,
} from "../utils/optical-link-split-utils";
import { ChartAxes } from "./ChartAxes";
import { ChartGrid } from "./ChartGrid";
import { ChartSpectrumLines } from "./ChartSpectrumLines";
import { PlotToolbar } from "./PlotToolbar";
import { PlotSpectrumGeometryLegend } from "./PlotSpectrumGeometryLegend";
import { useLinkedOpticalTraces } from "../hooks/useLinkedOpticalTraces";
import { buildLinkedOpticalAreaBands } from "../utils/linked-optical-area-bands";
import {
  buildSingleSpectrumGeometryLegendRows,
  spectrumChannelGlyphForQuantity,
} from "./spectrum-geometry-legend-types";
import { ExportPlotModal } from "./ExportPlotModal";
import { ChartCrosshairAndDots } from "./ChartCrosshairAndDots";
import {
  getValueAtEnergy,
  getTraceLabel,
  getTraceColor,
} from "./utils";
import { PeakPlotAnnotations } from "./PeakPlotAnnotations";
import { InspectPinLayer } from "./InspectPinLayer";
import { useInspectPins } from "../hooks/useInspectPins";
import { NormalizationBrush } from "../visx/NormalizationBrush";
import { NormalizationRegionHandles } from "../visx/NormalizationRegionHandles";
import { PeakIndicators } from "../visx/PeakIndicators";
import { PeakCurves } from "../visx/PeakCurves";
import { PeakOverlayLayer } from "../visx/PeakOverlayLayer";
import { BrushZoom } from "../visx/BrushZoom";
import type { ZoomMode } from "../visx/BrushZoom";
import { NORMALIZATION_COLORS } from "../constants";
import { PlotToolRail } from "./PlotToolRail";
import { findClosestTraceIndex } from "../utils/find-closest-trace";
import {
  copySpectrumCsvOnCopyEvent,
  resolveSpectrumGeometryCsvRowForTrace,
  spectrumCsvClipboardText,
  spectrumGeometryCsvRowsFromTree,
} from "~/components/nexafs/nexafs-spectrum-csv-shared";
import { NexafsSpectrumPlotContextMenu } from "~/components/nexafs/nexafs-spectrum-plot-context-menu";
import {
  clampSpectrumAxisDomain,
  panAxisDomain,
  spectrumAxisMinZoomSpan,
  wheelZoomAxisDomain,
} from "../utils/spectrum-axis-zoom";

type SpectrumPlotInnerProps = SpectrumPlotProps & {
  width: number;
  height: number;
  cursorMode?: "pan" | "zoom" | "select" | "peak" | "inspect";
  onCursorModeChange?: (
    mode: "pan" | "zoom" | "select" | "peak" | "inspect",
  ) => void;
};

function traceVisibilityId(trace: TraceData, index: number): string {
  if (typeof trace.legendId === "string" && trace.legendId.length > 0) {
    return trace.legendId;
  }
  return typeof trace.name === "string" ? trace.name : `trace-${index}`;
}

function buildTraceIds(traces: TraceData[]): string[] {
  return traces.map((t, i) => traceVisibilityId(t, i));
}

function isBareAtomTraceName(trace: TraceData): boolean {
  return typeof trace.name === "string" && /bare\s*atom/i.test(trace.name);
}

function firstNonBareTrace(traces: TraceData[]): TraceData | undefined {
  for (const t of traces) {
    if (!isBareAtomTraceName(t)) {
      return t;
    }
  }
  return traces[0];
}

export function SpectrumPlotInner({
  width,
  height,
  points,
  graphStyle = "line",
  energyStats,
  absorptionStats,
  yAxisQuantity,
  referenceCurves = [],
  normalizationRegions,
  plotContext,
  onSelectionChange,
  peaks = [],
  selectedPeakId,
  onPeakUpdate,
  onPeakPatch,
  onPeakSelect,
  onPeakDelete,
  onPeakAdd,
  differenceSpectra = [],
  companionSpectra = [],
  opticalLink,
  opticalLinkSplitView = false,
  traceStackSplitView = false,
  traceStackPanels,
  betaDeltaLink: betaDeltaLinkLegacy,
  showThetaData = false,
  showPhiData = false,
  selectedGeometry = null,
  headerRight,
  headerAnalysis,
  plotBottomTools,
  plotTopRailDataActions,
  plotTopRailTrailingActions,
  suppressAnalysisRailLeadingGrip = false,
  showNormalizationShading = false,
  normalizationEdgeHandlesEnabled = false,
  onNormalizationEdgeEnergyChange,
  cursorMode: externalCursorMode,
  onCursorModeChange,
  spectrumCsvContextMenu,
  primaryTraceLabel,
}: SpectrumPlotInnerProps) {
  const opticalLinkConfig = opticalLink ?? betaDeltaLinkLegacy;
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const themeColors = useChartThemeFromCSS();
  const svgRef = useRef<SVGSVGElement>(null);
  const plotCopySurfaceRef = useRef<HTMLDivElement>(null);
  const hiddenCsvTextareaRef = useRef<HTMLTextAreaElement>(null);
  const hoveredTraceIndexRef = useRef<number | null>(null);
  const spectrumCsvContextMenuRef = useRef(spectrumCsvContextMenu);
  spectrumCsvContextMenuRef.current = spectrumCsvContextMenu;

  const groupedTraces = useSpectrumData(
    points,
    showThetaData,
    showPhiData,
    differenceSpectra,
    isDark,
    primaryTraceLabel,
  );
  const linkedOptical = useLinkedOpticalTraces(
    groupedTraces.traces,
    groupedTraces.keys,
    opticalLinkConfig,
    showThetaData,
    showPhiData,
  );
  const effectiveCompanionSpectra = useMemo(
    () => (opticalLinkConfig ? [] : companionSpectra),
    [opticalLinkConfig, companionSpectra],
  );
  const extentsCompanionSpectra = useMemo(() => {
    if (!opticalLinkConfig) {
      return effectiveCompanionSpectra;
    }
    return [
      {
        label: "Linked companion",
        points: [...opticalLinkConfig.companionPoints],
      },
    ];
  }, [opticalLinkConfig, effectiveCompanionSpectra]);
  const referenceData = useReferenceData(
    referenceCurves,
    differenceSpectra,
    isDark,
    effectiveCompanionSpectra,
  );
  const peakViz = usePeakVisualization(
    points,
    peaks,
    selectedPeakId ?? null,
    selectedGeometry,
  );
  const extents = useDataExtents(
    points,
    differenceSpectra,
    referenceCurves,
    extentsCompanionSpectra,
  );

  const singleGeometryLegend = useMemo(() => {
    if (linkedOptical.active) {
      return { rows: [], angleColumnTitle: "" };
    }
    return buildSingleSpectrumGeometryLegendRows({
      traces: groupedTraces.traces,
      geometryKeys: groupedTraces.keys,
      groups: groupedTraces.groups,
      showThetaData,
      showPhiData,
    });
  }, [
    linkedOptical.active,
    groupedTraces.traces,
    groupedTraces.keys,
    groupedTraces.groups,
    showThetaData,
    showPhiData,
  ]);

  const taggedSingleTraces = useMemo(() => {
    if (linkedOptical.active) {
      return groupedTraces.traces;
    }
    return groupedTraces.traces.map((trace, index) => {
      const key = groupedTraces.keys[index] ?? `idx-${index}`;
      return {
        ...trace,
        legendId: `geometry-${key}`,
        showlegend: false,
      };
    });
  }, [linkedOptical.active, groupedTraces.traces, groupedTraces.keys]);

  const primarySpectrumTraces = linkedOptical.active
    ? linkedOptical.primaryTraces
    : taggedSingleTraces;

  const opticalSplitActive =
    opticalLinkSplitView && linkedOptical.active && opticalLinkConfig != null;

  const traceStackSplitActive =
    traceStackSplitView != null &&
    traceStackSplitView &&
    (traceStackPanels?.length ?? 0) >= 2 &&
    !opticalSplitActive;

  const linkedOpticalAreaBands = useMemo(() => {
    if (!linkedOptical.active || graphStyle !== "area" || opticalSplitActive) {
      return undefined;
    }
    const bands = buildLinkedOpticalAreaBands(
      linkedOptical.primaryTraces,
      linkedOptical.companionTraces,
    );
    return bands.length > 0 ? bands : undefined;
  }, [
    linkedOptical.active,
    linkedOptical.primaryTraces,
    linkedOptical.companionTraces,
    graphStyle,
    opticalSplitActive,
  ]);

  const allTraces = useMemo(
    () => [
      ...referenceData.referenceTraces,
      ...primarySpectrumTraces,
      ...(linkedOptical.active
        ? linkedOptical.companionTraces
        : referenceData.companionTraces),
      ...referenceData.differenceTraces,
    ],
    [
      primarySpectrumTraces,
      linkedOptical.active,
      linkedOptical.companionTraces,
      referenceData.referenceTraces,
      referenceData.companionTraces,
      referenceData.differenceTraces,
    ],
  );

  const allTraceIds = useMemo(() => buildTraceIds(allTraces), [allTraces]);
  const [visibleTraceIds, setVisibleTraceIds] = useState<Set<string>>(
    () => new Set(),
  );

  const visibleTraces = useMemo(() => {
    if (visibleTraceIds.size === 0) return allTraces;
    return allTraces.filter((t, i) => {
      const id = traceVisibilityId(t, i);
      if (isBareAtomTraceName(t)) return true;
      return visibleTraceIds.has(id);
    });
  }, [allTraces, visibleTraceIds]);

  const visibleLinkedOpticalAreaBands = useMemo(() => {
    if (!linkedOpticalAreaBands) {
      return undefined;
    }
    if (visibleTraceIds.size === 0) {
      return linkedOpticalAreaBands;
    }
    return linkedOpticalAreaBands.filter((band) => {
      const row = linkedOptical.legendRows.find(
        (r) => r.geometryKey === band.geometryKey,
      );
      if (!row) {
        return true;
      }
      return (
        visibleTraceIds.has(row.imaginaryTraceId) &&
        visibleTraceIds.has(row.realTraceId)
      );
    });
  }, [
    linkedOpticalAreaBands,
    linkedOptical.legendRows,
    visibleTraceIds,
  ]);

  const toggleGeometryLegend = useCallback(
    (geometryKey: string) => {
      if (linkedOptical.active) {
        const row = linkedOptical.legendRows.find(
          (r) => r.geometryKey === geometryKey,
        );
        if (!row) {
          return;
        }
        setVisibleTraceIds((prev) => {
          const next = new Set(prev.size === 0 ? allTraceIds : prev);
          const pairVisible =
            next.has(row.imaginaryTraceId) && next.has(row.realTraceId);
          if (pairVisible) {
            next.delete(row.imaginaryTraceId);
            next.delete(row.realTraceId);
          } else {
            next.add(row.imaginaryTraceId);
            next.add(row.realTraceId);
          }
          return next;
        });
        return;
      }
      const row = singleGeometryLegend.rows.find(
        (r) => r.geometryKey === geometryKey,
      );
      if (!row) {
        return;
      }
      setVisibleTraceIds((prev) => {
        const next = new Set(prev.size === 0 ? allTraceIds : prev);
        if (next.has(row.traceId)) {
          next.delete(row.traceId);
        } else {
          next.add(row.traceId);
        }
        return next;
      });
    },
    [
      allTraceIds,
      linkedOptical.active,
      linkedOptical.legendRows,
      singleGeometryLegend.rows,
    ],
  );

  const geometryLegendAngleTitle = linkedOptical.active
    ? linkedOptical.angleColumnTitle
    : singleGeometryLegend.angleColumnTitle;

  const showGeometryLegend =
    linkedOptical.active && opticalLinkConfig
      ? linkedOptical.legendRows.length > 0
      : singleGeometryLegend.rows.length > 0;

  const channelLegendGlyph = spectrumChannelGlyphForQuantity(
    yAxisQuantity ?? "intensity",
  );

  const contentHeight = height;

  const traceStackPanelExtents = useMemo(() => {
    if (!traceStackSplitActive || traceStackPanels == null) {
      return [];
    }
    return traceStackPanels.map((panel) => {
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      for (const point of panel.points) {
        if (Number.isFinite(point.absorption)) {
          min = Math.min(min, point.absorption);
          max = Math.max(max, point.absorption);
        }
      }
      return {
        label: panel.label,
        min: min === Number.POSITIVE_INFINITY ? 0 : min,
        max: max === Number.NEGATIVE_INFINITY ? 1 : max,
        yAxisQuantity: panel.yAxisQuantity,
      };
    });
  }, [traceStackPanels, traceStackSplitActive]);

  const traceStackSplitLayout = useTraceStackSplitLayout(
    width,
    contentHeight,
    extents,
    traceStackPanelExtents,
    energyStats,
  );

  const splitImaginaryTraces = useMemo(
    () =>
      opticalSplitActive
        ? filterTracesForOpticalLinkSplitRole(
            visibleTraces,
            "imaginary",
            opticalLinkConfig,
          )
        : [],
    [opticalSplitActive, visibleTraces, opticalLinkConfig],
  );

  const splitRealTraces = useMemo(
    () =>
      opticalSplitActive
        ? filterTracesForOpticalLinkSplitRole(
            visibleTraces,
            "real",
            opticalLinkConfig,
          )
        : [],
    [opticalSplitActive, visibleTraces, opticalLinkConfig],
  );

  const imaginaryYAxisQuantity = useMemo(
    () =>
      opticalLinkConfig
        ? yAxisQuantityForOpticalRole(opticalLinkConfig.imaginaryRole)
        : (yAxisQuantity ?? "intensity"),
    [opticalLinkConfig, yAxisQuantity],
  );

  const realYAxisQuantity = useMemo(
    () =>
      opticalLinkConfig
        ? yAxisQuantityForOpticalRole(opticalLinkConfig.realRole)
        : (yAxisQuantity ?? "intensity"),
    [opticalLinkConfig, yAxisQuantity],
  );

  const opticalSplitLayout = useOpticalLinkSplitLayout(
    width,
    contentHeight,
    extents,
    opticalSplitActive
      ? absorptionExtentFromTraces(splitImaginaryTraces)
      : null,
    opticalSplitActive ? absorptionExtentFromTraces(splitRealTraces) : null,
    energyStats,
    imaginaryYAxisQuantity,
    realYAxisQuantity,
  );

  const subplotLayout = useSubplotLayout(
    width,
    contentHeight,
    extents,
    peakViz.hasPeakVisualization && !opticalSplitActive && !traceStackSplitActive,
    peakViz.selectedGeometryPoints,
    energyStats,
    absorptionStats,
    yAxisQuantity,
  );

  const { mainPlot, peakPlot, hasSubplot } = subplotLayout;
  const interactionPlot = opticalSplitActive
    ? opticalSplitLayout.imaginaryPlot
    : traceStackSplitActive && traceStackSplitLayout.panels[0] != null
      ? traceStackSplitLayout.panels[0]
      : mainPlot;
  const dataXBounds = useMemo((): [number, number] => {
    if (extents.energyExtent) {
      const { min, max } = extents.energyExtent;
      return [min, max];
    }
    const d = interactionPlot.xScale.domain();
    return [d[0] ?? 0, d[1] ?? 1000];
  }, [extents.energyExtent, interactionPlot.xScale]);

  const autoYDomain = useMemo(
    () => interactionPlot.yScale.domain() as [number, number],
    [interactionPlot.yScale],
  );

  const dataYBounds = useMemo((): [number, number] => {
    const lo = autoYDomain[0] ?? 0;
    const hi = autoYDomain[1] ?? 0;
    return [Math.min(lo, hi), Math.max(lo, hi)];
  }, [autoYDomain]);

  const yAxisZoomPanEnabled = !opticalSplitActive && !traceStackSplitActive;

  const [zoomedXDomain, setZoomedXDomain] = useState<[number, number] | null>(
    null,
  );
  const [zoomedYDomain, setZoomedYDomain] = useState<[number, number] | null>(
    null,
  );

  useEffect(() => {
    setZoomedYDomain(null);
  }, [yAxisQuantity]);

  const visibleYDomain = useMemo((): [number, number] => {
    const raw =
      zoomedYDomain ?? (interactionPlot.yScale.domain() as [number, number]);
    const a = raw[0] ?? 0;
    const b = raw[1] ?? 0;
    return [Math.min(a, b), Math.max(a, b)];
  }, [zoomedYDomain, interactionPlot.yScale]);

  const yAxisPrimary = useMemo(() => {
    const q: SpectrumYAxisQuantity = yAxisQuantity ?? "intensity";
    return spectrumYAxisPresentation(q, visibleYDomain[0], visibleYDomain[1]);
  }, [yAxisQuantity, visibleYDomain]);

  const zoomedXScale = useMemo(() => {
    const domain =
      zoomedXDomain ?? (interactionPlot.xScale.domain() as [number, number]);
    return interactionPlot.xScale.copy().domain(domain);
  }, [interactionPlot.xScale, zoomedXDomain]);

  const zoomedYScale = useMemo(() => {
    const domain =
      zoomedYDomain ?? (interactionPlot.yScale.domain() as [number, number]);
    return interactionPlot.yScale.copy().domain(domain);
  }, [interactionPlot.yScale, zoomedYDomain]);

  const splitImaginaryYScale = useMemo(() => {
    const domain = opticalSplitLayout.imaginaryPlot.yScale.domain() as [
      number,
      number,
    ];
    return opticalSplitLayout.imaginaryPlot.yScale.copy().domain(domain);
  }, [opticalSplitLayout.imaginaryPlot.yScale]);

  const splitRealYScale = useMemo(() => {
    const domain = opticalSplitLayout.realPlot.yScale.domain() as [
      number,
      number,
    ];
    return opticalSplitLayout.realPlot.yScale.copy().domain(domain);
  }, [opticalSplitLayout.realPlot.yScale]);

  const mainPlotScales = useMemo(
    () => ({
      xScale: zoomedXScale,
      yScale: zoomedYScale,
      xInvert: (pixel: number) => zoomedXScale.invert(pixel),
      yInvert: (pixel: number) => zoomedYScale.invert(pixel),
    }),
    [zoomedXScale, zoomedYScale],
  );

  const fullXSpan = dataXBounds[1] - dataXBounds[0];
  const minZoomSpan = Math.max(fullXSpan * 0.02, 1);
  const minYZoomSpan = spectrumAxisMinZoomSpan(dataYBounds, 0.02, 1e-9);

  const clampXDomainToMinSpan = useCallback(
    (domain: [number, number]): [number, number] =>
      clampSpectrumAxisDomain(domain, dataXBounds, minZoomSpan),
    [dataXBounds, minZoomSpan],
  );

  const clampYDomainToMinSpan = useCallback(
    (domain: [number, number]): [number, number] =>
      clampSpectrumAxisDomain(domain, dataYBounds, minYZoomSpan),
    [dataYBounds, minYZoomSpan],
  );

  const handleZoomIn = useCallback(() => {
    const [xMin, xMax] = zoomedXDomain ?? dataXBounds;
    const center = (xMin + xMax) / 2;
    const half = Math.max(minZoomSpan / 2, ((xMax - xMin) / 2) * 0.9);
    const newMin = Math.max(dataXBounds[0], center - half);
    const newMax = Math.min(dataXBounds[1], center + half);
    if (newMax - newMin >= minZoomSpan) setZoomedXDomain([newMin, newMax]);
  }, [zoomedXDomain, dataXBounds, minZoomSpan]);

  const handleZoomOut = useCallback(() => {
    const [xMin, xMax] = zoomedXDomain ?? dataXBounds;
    const center = (xMin + xMax) / 2;
    const half = Math.min(
      (dataXBounds[1] - dataXBounds[0]) / 2,
      Math.max(minZoomSpan / 2, ((xMax - xMin) / 2) * 1.25),
    );
    const newMin = Math.max(dataXBounds[0], center - half);
    const newMax = Math.min(dataXBounds[1], center + half);
    setZoomedXDomain(
      newMax - newMin >= dataXBounds[1] - dataXBounds[0] - 1e-6
        ? null
        : [newMin, newMax],
    );
  }, [zoomedXDomain, dataXBounds, minZoomSpan]);

  const handleMarqueeZoom = useCallback(
    (xDomain: [number, number], yDomain: [number, number]) => {
      const currentX = zoomedXDomain ?? dataXBounds;
      const currentY = zoomedYDomain ?? dataYBounds;
      const nextXSpan = Math.abs(xDomain[1] - xDomain[0]);
      const nextYSpan = Math.abs(yDomain[1] - yDomain[0]);
      const curXSpan = Math.abs(currentX[1] - currentX[0]);
      const curYSpan = Math.abs(currentY[1] - currentY[0]);

      if (nextXSpan >= minZoomSpan && Math.abs(nextXSpan - curXSpan) > 1e-9) {
        setZoomedXDomain(clampXDomainToMinSpan(xDomain));
      }
      if (
        yAxisZoomPanEnabled &&
        nextYSpan >= minYZoomSpan &&
        Math.abs(nextYSpan - curYSpan) > 1e-12
      ) {
        setZoomedYDomain(clampYDomainToMinSpan(yDomain));
      }
    },
    [
      clampXDomainToMinSpan,
      clampYDomainToMinSpan,
      dataXBounds,
      dataYBounds,
      minYZoomSpan,
      minZoomSpan,
      yAxisZoomPanEnabled,
      zoomedXDomain,
      zoomedYDomain,
    ],
  );

  const [geometryLegendPositionResetKey, setGeometryLegendPositionResetKey] =
    useState(0);

  const handleResetZoom = useCallback(() => {
    setZoomedXDomain(null);
    setZoomedYDomain(null);
    setGeometryLegendPositionResetKey((key) => key + 1);
  }, []);

  const selectionTarget =
    plotContext?.kind === "normalize" ? plotContext.target : null;
  const isManualPeakMode = plotContext?.kind === "peak-edit";

  const cursorMode = externalCursorMode ?? "inspect";
  const isAxisZoomed =
    zoomedXDomain != null || (yAxisZoomPanEnabled && zoomedYDomain != null);

  const effectiveCursorMode =
    selectionTarget != null
      ? "select"
      : cursorMode === "pan" && !isAxisZoomed
        ? "inspect"
        : cursorMode;

  const handleCursorModeChange = useCallback(
    (mode: "pan" | "zoom" | "select" | "peak" | "inspect") => {
      onCursorModeChange?.(mode);
    },
    [onCursorModeChange],
  );

  const {
    pins: inspectPins,
    selectedPinId: selectedInspectPinId,
    addPin: addInspectPin,
    removePin: removeInspectPin,
    updatePinEnergy: updateInspectPinEnergy,
    selectPin: selectInspectPin,
  } = useInspectPins();

  const [plotCsvContextMenu, setPlotCsvContextMenu] = useState<{
    top: number;
    left: number;
    geometryRow: ReturnType<typeof resolveSpectrumGeometryCsvRowForTrace>;
  } | null>(null);

  const closePlotCsvContextMenu = useCallback(() => {
    setPlotCsvContextMenu(null);
  }, []);

  const tooltip = useTooltip<{
    energy: number;
    rows: Array<{ label: string; value: number | null; color: string }>;
  }>();
  const { containerRef } = useTooltipInPortal({
    detectBounds: true,
    scroll: true,
  });

  const thresholdFraction = PLOT_CONFIG.tooltipSnapThresholdFraction;
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (selectionTarget != null || effectiveCursorMode === "zoom") {
        tooltip.hideTooltip();
        return;
      }
      if (effectiveCursorMode !== "inspect") return;
      const svgRect = e.currentTarget.getBoundingClientRect();
      const x =
        e.clientX - svgRect.left - interactionPlot.dimensions.margins.left;
      const plotWidth =
        interactionPlot.dimensions.width -
        interactionPlot.dimensions.margins.left -
        interactionPlot.dimensions.margins.right;
      if (x < 0 || x > plotWidth) {
        tooltip.hideTooltip();
        return;
      }
      const energy = zoomedXScale.invert(x);
      const domain = zoomedXScale.domain();
      const range = (domain[1] ?? 0) - (domain[0] ?? 0);
      const threshold = range * thresholdFraction;
      if (isManualPeakMode) {
        const rows = visibleTraces.map((trace, i) => {
          const label = getTraceLabel(trace, i);
          const value = getValueAtEnergy(trace, energy, threshold);
          const color = getTraceColor(trace, themeColors.text);
          return { label, value, color };
        });
        tooltip.showTooltip({
          tooltipData: { energy, rows },
          tooltipLeft: e.clientX,
          tooltipTop: e.clientY,
        });
        return;
      }
      const tracesForSnap = visibleTraces.filter((t) => !isBareAtomTraceName(t));
      const snapTraces =
        tracesForSnap.length > 0 ? tracesForSnap : visibleTraces;
      const closestTraceIndex = findClosestTraceIndex(
        energy,
        snapTraces,
        threshold,
      );
      if (closestTraceIndex != null) {
        const snapTrace = snapTraces[closestTraceIndex];
        const globalIndex =
          snapTrace != null ? visibleTraces.indexOf(snapTrace) : -1;
        hoveredTraceIndexRef.current =
          globalIndex >= 0 ? globalIndex : closestTraceIndex;
      } else {
        hoveredTraceIndexRef.current = null;
      }
      const closest = findClosestPoint(energy, snapTraces, threshold);
      const snapEnergy = closest?.energy ?? energy;
      const rows = visibleTraces.map((trace, i) => {
        const label = getTraceLabel(trace, i);
        const value = getValueAtEnergy(trace, snapEnergy, threshold);
        const color = getTraceColor(trace, themeColors.text);
        return { label, value, color };
      });
      tooltip.showTooltip({
        tooltipData: { energy: snapEnergy, rows },
        tooltipLeft: e.clientX,
        tooltipTop: e.clientY,
      });
    },
    [
      selectionTarget,
      effectiveCursorMode,
      isManualPeakMode,
      visibleTraces,
      zoomedXScale,
      thresholdFraction,
      themeColors.text,
      tooltip,
      interactionPlot.dimensions.margins.left,
      interactionPlot.dimensions.width,
      interactionPlot.dimensions.margins.right,
    ],
  );

  const handleMouseLeave = useCallback(() => {
    tooltip.hideTooltip();
    hoveredTraceIndexRef.current = null;
  }, [tooltip]);

  const spectrumCsvCopyListenerActive =
    spectrumCsvContextMenu != null &&
    !spectrumCsvContextMenu.disabled &&
    spectrumCsvContextMenu.sortedAllPoints.length > 0;

  const syncHiddenCsvTextareaSelection = useCallback(() => {
    const menu = spectrumCsvContextMenuRef.current;
    const textarea = hiddenCsvTextareaRef.current;
    if (
      !menu ||
      menu.disabled ||
      menu.sortedAllPoints.length === 0 ||
      !textarea
    ) {
      return;
    }
    void spectrumCsvClipboardText(menu.sortedAllPoints, {
      stoichiometryFormula: menu.stoichiometryFormula,
    }).then((csv) => {
      if (hiddenCsvTextareaRef.current === textarea) {
        textarea.value = csv;
        textarea.focus({ preventScroll: true });
        textarea.select();
      }
    });
  }, []);

  const handlePlotCopySurfaceContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!spectrumCsvCopyListenerActive) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const menu = spectrumCsvContextMenuRef.current;
      if (!menu) {
        return;
      }
      const geometryRows = spectrumGeometryCsvRowsFromTree(menu.groupedTree);
      const traceIndex = hoveredTraceIndexRef.current;
      const trace =
        traceIndex != null && traceIndex >= 0
          ? (visibleTraces[traceIndex] ?? null)
          : null;
      const geometryRow = resolveSpectrumGeometryCsvRowForTrace(
        trace,
        geometryRows,
      );
      setPlotCsvContextMenu({
        top: event.clientY,
        left: event.clientX,
        geometryRow,
      });
      event.currentTarget.focus({ preventScroll: true });
      syncHiddenCsvTextareaSelection();
    },
    [
      spectrumCsvCopyListenerActive,
      syncHiddenCsvTextareaSelection,
      visibleTraces,
    ],
  );

  const handlePlotCopySurfaceMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!spectrumCsvCopyListenerActive || event.button !== 0) {
        return;
      }
      event.currentTarget.focus({ preventScroll: true });
    },
    [spectrumCsvCopyListenerActive],
  );

  useEffect(() => {
    if (!spectrumCsvCopyListenerActive) {
      return;
    }
    const onCopy = (event: ClipboardEvent) => {
      const host = plotCopySurfaceRef.current;
      const menu = spectrumCsvContextMenuRef.current;
      if (
        !host ||
        !menu ||
        menu.disabled ||
        menu.sortedAllPoints.length === 0
      ) {
        return;
      }
      const target = event.target;
      const active = document.activeElement;
      const textarea = hiddenCsvTextareaRef.current;
      const inPlot =
        (target instanceof Node && host.contains(target)) ||
        (active instanceof Node && host.contains(active)) ||
        active === textarea;
      if (!inPlot) {
        return;
      }
      copySpectrumCsvOnCopyEvent(event, menu.sortedAllPoints, {
        stoichiometryFormula: menu.stoichiometryFormula,
      });
    };
    document.addEventListener("copy", onCopy, true);
    return () => document.removeEventListener("copy", onCopy, true);
  }, [spectrumCsvCopyListenerActive]);

  const getYValueAtEnergy = useCallback(
    (energy: number): number => {
      const trace = firstNonBareTrace(visibleTraces);
      if (trace) {
        const domain = zoomedXScale.domain() as [number, number];
        const span = Math.abs((domain[1] ?? 1) - (domain[0] ?? 0)) || 1;
        const v = getValueAtEnergy(trace, energy, span);
        if (v != null && Number.isFinite(v)) return v;
      }
      let bestY = points[0]?.absorption ?? 0;
      let bestD = Infinity;
      for (const p of points) {
        const d = Math.abs(p.energy - energy);
        if (d < bestD) {
          bestD = d;
          bestY = p.absorption;
        }
      }
      return bestY;
    },
    [visibleTraces, zoomedXScale, points],
  );

  const handlePeakEnergyUpdate = useCallback(
    (peakId: string, energy: number) => {
      if (onPeakPatch) {
        onPeakPatch(peakId, { energy });
      } else {
        onPeakUpdate?.(peakId, energy);
      }
    },
    [onPeakPatch, onPeakUpdate],
  );

  const handlePlotAreaClick = useCallback(
    (event: React.MouseEvent<SVGGElement>) => {
      if (effectiveCursorMode !== "inspect") return;
      if (isManualPeakMode) return;
      if (selectionTarget != null) return;
      const svg = svgRef.current;
      if (!svg) return;
      const pt = eventToPlotCoords(
        event.nativeEvent,
        svg,
        interactionPlot.dimensions.margins.left,
        interactionPlot.dimensions.margins.top,
      );
      if (!pt) return;
      const localX = pt.x;
      const plotInnerWidth =
        interactionPlot.dimensions.width -
        interactionPlot.dimensions.margins.left -
        interactionPlot.dimensions.margins.right;
      if (localX < 0 || localX > plotInnerWidth) return;
      const rawEnergy = zoomedXScale.invert(localX);
      const rounded = Math.round(rawEnergy * 1000) / 1000;
      addInspectPin(rounded);
      tooltip.hideTooltip();
    },
    [
      effectiveCursorMode,
      isManualPeakMode,
      selectionTarget,
      interactionPlot.dimensions,
      zoomedXScale,
      addInspectPin,
      tooltip,
    ],
  );

  const inspectPlotHitSurfaceActive =
    effectiveCursorMode === "inspect" &&
    !isManualPeakMode &&
    selectionTarget == null;

  const energyRange = useMemo(() => {
    if (!peakViz.selectedGeometryPoints?.length) return [];
    const energies = peakViz.selectedGeometryPoints
      .map((p) => p.energy)
      .sort((a, b) => a - b);
    const minE = energies[0] ?? 0;
    const maxE = energies[energies.length - 1] ?? 0;
    const n = Math.max(200, peakViz.selectedGeometryPoints.length);
    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push(minE + (maxE - minE) * (i / (n - 1)));
    return out;
  }, [peakViz.selectedGeometryPoints]);

  const mainPlotHeight =
    interactionPlot.dimensions.height -
    interactionPlot.dimensions.margins.top -
    interactionPlot.dimensions.margins.bottom;

  const mainPlotWidth =
    interactionPlot.dimensions.width -
    interactionPlot.dimensions.margins.left -
    interactionPlot.dimensions.margins.right;

  const plotCanvasWidth = width;
  const plotCanvasHeight = contentHeight;

  const railInsets = useMemo(() => {
    if (opticalSplitActive) {
      const imag = opticalSplitLayout.imaginaryPlot.dimensions.margins;
      const real = opticalSplitLayout.realPlot.dimensions.margins;
      return {
        left: Math.max(imag.left, real.left),
        right: Math.max(imag.right, real.right),
        top: imag.top,
        bottom: Math.max(imag.bottom, real.bottom),
      };
    }
    if (traceStackSplitActive && traceStackSplitLayout.panels.length > 0) {
      const first = traceStackSplitLayout.panels[0]!.dimensions.margins;
      const last =
        traceStackSplitLayout.panels.at(-1)!.dimensions.margins;
      return {
        left: first.left,
        right: first.right,
        top: first.top,
        bottom: last.bottom,
      };
    }
    if (hasSubplot && peakPlot) {
      const mainMargins = mainPlot.dimensions.margins;
      const peakMargins = peakPlot.dimensions.margins;
      return {
        left: mainMargins.left,
        right: mainMargins.right,
        top: mainMargins.top,
        bottom: peakMargins.bottom,
      };
    }
    const m = mainPlot.dimensions.margins;
    return { left: m.left, right: m.right, top: m.top, bottom: m.bottom };
  }, [
    opticalSplitActive,
    opticalSplitLayout,
    traceStackSplitActive,
    traceStackSplitLayout.panels,
    hasSubplot,
    peakPlot,
    mainPlot.dimensions.margins,
  ]);

  const [isPanDragging, setIsPanDragging] = useState(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const panStartXDomainRef = useRef<[number, number] | null>(null);
  const panStartYDomainRef = useRef<[number, number] | null>(null);
  const panGroupRef = useRef<SVGGElement | null>(null);
  const panOverlayRef = useRef<SVGGElement | null>(null);
  const plotClipId = useId();

  const PAN_DRAG_CLASS = "spectrum-plot-pan-dragging";

  const clearPanDragCursor = useCallback(() => {
    svgRef.current?.classList.remove(PAN_DRAG_CLASS);
    document.body.classList.remove(PAN_DRAG_CLASS);
    if (panOverlayRef.current) panOverlayRef.current.style.cursor = "grab";
  }, []);

  const handlePanStart = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      if (effectiveCursorMode !== "pan" || !isAxisZoomed) return;
      if (e.button !== 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x >= 0 && x <= mainPlotWidth && y >= 0 && y <= mainPlotHeight) {
        panStartRef.current = { x, y };
        panStartXDomainRef.current = zoomedXDomain;
        panStartYDomainRef.current =
          yAxisZoomPanEnabled && zoomedYDomain != null ? zoomedYDomain : null;
        setIsPanDragging(true);
        e.currentTarget.style.cursor = "grabbing";
        svgRef.current?.classList.add(PAN_DRAG_CLASS);
        document.body.classList.add(PAN_DRAG_CLASS);
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    },
    [
      effectiveCursorMode,
      isAxisZoomed,
      mainPlotHeight,
      mainPlotWidth,
      yAxisZoomPanEnabled,
      zoomedXDomain,
      zoomedYDomain,
    ],
  );

  const applyPanFromDelta = useCallback(
    (totalDeltaX: number, totalDeltaY: number) => {
      const startXDomain = panStartXDomainRef.current;
      if (startXDomain != null) {
        const nextX = panAxisDomain(
          startXDomain,
          dataXBounds,
          totalDeltaX,
          mainPlotWidth,
        );
        if (nextX != null) {
          setZoomedXDomain(nextX);
        }
      }
      const startYDomain = panStartYDomainRef.current;
      if (startYDomain != null && yAxisZoomPanEnabled) {
        const nextY = panAxisDomain(
          startYDomain,
          dataYBounds,
          totalDeltaY,
          mainPlotHeight,
        );
        if (nextY != null) {
          setZoomedYDomain(nextY);
        }
      }
    },
    [
      dataXBounds,
      dataYBounds,
      mainPlotHeight,
      mainPlotWidth,
      yAxisZoomPanEnabled,
    ],
  );

  const handlePanMove = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      if (!panStartRef.current) return;
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const plotX = e.clientX - rect.left;
      const plotY = e.clientY - rect.top;
      const totalDeltaX = plotX - panStartRef.current.x;
      const totalDeltaY = plotY - panStartRef.current.y;
      applyPanFromDelta(totalDeltaX, totalDeltaY);
    },
    [applyPanFromDelta],
  );

  const handlePanEnd = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore if already released
      }
      clearPanDragCursor();
      panStartRef.current = null;
      panStartXDomainRef.current = null;
      panStartYDomainRef.current = null;
      setIsPanDragging(false);
    },
    [clearPanDragCursor],
  );

  useEffect(() => {
    if (!isPanDragging) return;
    const svg = svgRef.current;
    if (!svg) return;
    const onMove = (e: PointerEvent) => {
      if (!panStartRef.current) return;
      const rect = svg.getBoundingClientRect();
      const plotX =
        e.clientX - rect.left - interactionPlot.dimensions.margins.left;
      const plotY =
        e.clientY - rect.top - interactionPlot.dimensions.margins.top;
      const totalDeltaX = plotX - panStartRef.current.x;
      const totalDeltaY = plotY - panStartRef.current.y;
      applyPanFromDelta(totalDeltaX, totalDeltaY);
    };
    const onUp = () => {
      clearPanDragCursor();
      panStartRef.current = null;
      panStartXDomainRef.current = null;
      panStartYDomainRef.current = null;
      setIsPanDragging(false);
    };
    window.addEventListener("pointermove", onMove, { capture: true });
    window.addEventListener("pointerup", onUp, { capture: true });
    window.addEventListener("pointercancel", onUp, { capture: true });
    return () => {
      window.removeEventListener("pointermove", onMove, { capture: true });
      window.removeEventListener("pointerup", onUp, { capture: true });
      window.removeEventListener("pointercancel", onUp, { capture: true });
      clearPanDragCursor();
    };
  }, [
    isPanDragging,
    applyPanFromDelta,
    interactionPlot.dimensions.margins.left,
    interactionPlot.dimensions.margins.top,
    clearPanDragCursor,
  ]);

  const handlePlotWheel = useCallback(
    (event: React.WheelEvent<SVGSVGElement>) => {
      if (!yAxisZoomPanEnabled || !event.shiftKey) {
        return;
      }
      event.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const plotX =
        event.clientX - rect.left - interactionPlot.dimensions.margins.left;
      const plotY =
        event.clientY - rect.top - interactionPlot.dimensions.margins.top;
      if (
        plotX < 0 ||
        plotX > mainPlotWidth ||
        plotY < 0 ||
        plotY > mainPlotHeight
      ) {
        return;
      }
      const currentY = zoomedYDomain ?? dataYBounds;
      const anchor = zoomedYScale.invert(plotY);
      const nextY = wheelZoomAxisDomain(
        currentY,
        dataYBounds,
        minYZoomSpan,
        anchor,
        event.deltaY,
      );
      if (nextY == null) {
        setZoomedYDomain(null);
        return;
      }
      setZoomedYDomain(clampYDomainToMinSpan(nextY));
    },
    [
      clampYDomainToMinSpan,
      dataYBounds,
      interactionPlot.dimensions.margins.left,
      interactionPlot.dimensions.margins.top,
      mainPlotHeight,
      mainPlotWidth,
      minYZoomSpan,
      yAxisZoomPanEnabled,
      zoomedYDomain,
      zoomedYScale,
    ],
  );

  const tooltipData = tooltip.tooltipData;
  const crosshairDots = useMemo(() => {
    if (!tooltipData || effectiveCursorMode !== "inspect") return [];
    return tooltipData.rows
      .filter(
        (r): r is { label: string; value: number; color: string } =>
          r.value !== null,
      )
      .map((r) => ({ value: r.value, color: r.color }));
  }, [tooltipData, effectiveCursorMode]);

  const zoomMode: ZoomMode = "horizontal";

  const [exportModalOpen, setExportModalOpen] = useState(false);

  return (
    <div
      className="flex min-h-0 w-full flex-col gap-2 overflow-visible rounded-xl"
      style={{ width, height }}
      ref={containerRef}
    >
      <div
        ref={plotCopySurfaceRef}
        className="relative min-h-0 min-w-0 flex-1 outline-none"
        tabIndex={spectrumCsvCopyListenerActive ? -1 : undefined}
        onContextMenu={handlePlotCopySurfaceContextMenu}
        onMouseDown={handlePlotCopySurfaceMouseDown}
      >
        {spectrumCsvCopyListenerActive ? (
          <textarea
            ref={hiddenCsvTextareaRef}
            readOnly
            aria-hidden
            tabIndex={-1}
            className="pointer-events-none fixed left-0 top-0 m-0 h-px w-px overflow-hidden border-0 p-0 opacity-0"
          />
        ) : null}
        {spectrumCsvCopyListenerActive && spectrumCsvContextMenu ? (
          <NexafsSpectrumPlotContextMenu
            open={plotCsvContextMenu != null}
            anchor={
              plotCsvContextMenu ?? { top: 0, left: 0 }
            }
            onClose={closePlotCsvContextMenu}
            filenameBase={spectrumCsvContextMenu.filenameBase}
            sortedAllPoints={spectrumCsvContextMenu.sortedAllPoints}
            geometryRow={plotCsvContextMenu?.geometryRow ?? null}
            csvExportOptions={{
              stoichiometryFormula: spectrumCsvContextMenu.stoichiometryFormula,
            }}
          />
        ) : null}
        <svg
          ref={svgRef}
          width={width}
          height={contentHeight}
          className="overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onWheel={handlePlotWheel}
        >
          {opticalSplitActive && opticalLinkConfig ? (
            <OpticalLinkSplitSpectrumBody
              layout={opticalSplitLayout}
              width={width}
              contentHeight={contentHeight}
              imaginaryTraces={splitImaginaryTraces}
              realTraces={splitRealTraces}
              zoomedXScale={zoomedXScale}
              imaginaryYScale={splitImaginaryYScale}
              realYScale={splitRealYScale}
              themeColors={themeColors}
              graphStyle={graphStyle}
              opticalLinkConfig={opticalLinkConfig}
              legendRows={linkedOptical.legendRows}
              visibleTraceIds={visibleTraceIds}
              onToggleGeometry={toggleGeometryLegend}
              geometryLegendAngleTitle={geometryLegendAngleTitle}
              geometryLegendPositionResetKey={geometryLegendPositionResetKey}
              imaginaryYAxisQuantity={imaginaryYAxisQuantity}
              realYAxisQuantity={realYAxisQuantity}
              pins={inspectPins}
              selectedPinId={selectedInspectPinId}
              onSelectPin={selectInspectPin}
              onRemovePin={removeInspectPin}
              onUpdatePinEnergy={updateInspectPinEnergy}
              plotSvgRef={svgRef}
              showThetaData={showThetaData}
              showPhiData={showPhiData}
              tooltipEnergy={
                tooltipData && effectiveCursorMode === "inspect"
                  ? tooltipData.energy
                  : null
              }
              crosshairRows={tooltipData?.rows ?? []}
              allVisibleTraces={visibleTraces}
              effectiveCursorMode={effectiveCursorMode}
              normalizationRegions={normalizationRegions}
              selectionTarget={selectionTarget}
              showNormalizationShading={showNormalizationShading}
              normalizationEdgeHandlesEnabled={normalizationEdgeHandlesEnabled}
              onNormalizationEdgeEnergyChange={onNormalizationEdgeEnergyChange}
              onSelectionChange={
                onSelectionChange as (s: SpectrumSelection | null) => void
              }
              isDark={isDark}
              dataXBounds={dataXBounds}
              zoomedXDomain={zoomedXDomain}
              onMarqueeZoom={handleMarqueeZoom}
              onResetZoom={handleResetZoom}
              peaks={peaks}
              selectedPeakId={selectedPeakId ?? null}
              isManualPeakMode={isManualPeakMode}
              onPeakSelect={onPeakSelect}
              onPeakAdd={onPeakAdd}
              onPeakDelete={onPeakDelete}
              onPeakUpdate={onPeakUpdate}
              onPeakEnergyUpdate={handlePeakEnergyUpdate}
              getYValueAtEnergy={getYValueAtEnergy}
              inspectPlotHitSurfaceActive={inspectPlotHitSurfaceActive}
              onPlotAreaClick={handlePlotAreaClick}
              onPanStart={handlePanStart}
              onPanMove={handlePanMove}
              onPanEnd={handlePanEnd}
              panGroupRef={panGroupRef}
              panOverlayRef={panOverlayRef}
            />
          ) : traceStackSplitActive && traceStackPanels != null ? (
            <TraceStackSplitSpectrumBody
              layout={traceStackSplitLayout}
              panels={traceStackPanels}
              zoomedXScale={zoomedXScale}
              themeColors={themeColors}
              graphStyle={graphStyle}
              isDark={isDark}
              width={width}
              contentHeight={contentHeight}
            />
          ) : (
          <>
          <defs>
            <clipPath id={plotClipId}>
              <rect x={0} y={0} width={mainPlotWidth} height={mainPlotHeight} />
            </clipPath>
          </defs>
          <g>
            <rect
              data-export-plot-background
              x={mainPlot.dimensions.margins.left}
              y={mainPlot.dimensions.margins.top}
              width={
                mainPlot.dimensions.width -
                mainPlot.dimensions.margins.left -
                mainPlot.dimensions.margins.right
              }
              height={mainPlotHeight}
              fill={themeColors.plot}
            />
            <g
              transform={`translate(${mainPlot.dimensions.margins.left}, ${mainPlot.dimensions.margins.top})`}
            >
              <ChartGrid
                scales={mainPlotScales}
                dimensions={mainPlot.dimensions}
                themeColors={themeColors}
              />
            </g>
            {normalizationRegions &&
              (selectionTarget !== null || showNormalizationShading) && (
              <>
                {normalizationRegions.pre && (
                  <rect
                    x={
                      mainPlotScales.xScale(normalizationRegions.pre[0]) +
                      mainPlot.dimensions.margins.left
                    }
                    y={mainPlot.dimensions.margins.top}
                    width={
                      mainPlotScales.xScale(normalizationRegions.pre[1]) -
                      mainPlotScales.xScale(normalizationRegions.pre[0])
                    }
                    height={mainPlotHeight}
                    fill={NORMALIZATION_COLORS.pre}
                    opacity={0.12}
                    pointerEvents="none"
                  />
                )}
                {normalizationRegions.post && (
                  <rect
                    x={
                      mainPlotScales.xScale(normalizationRegions.post[0]) +
                      mainPlot.dimensions.margins.left
                    }
                    y={mainPlot.dimensions.margins.top}
                    width={
                      mainPlotScales.xScale(normalizationRegions.post[1]) -
                      mainPlotScales.xScale(normalizationRegions.post[0])
                    }
                    height={mainPlotHeight}
                    fill={NORMALIZATION_COLORS.post}
                    opacity={0.12}
                    pointerEvents="none"
                  />
                )}
              </>
            )}
            <g
              ref={panGroupRef}
              transform={`translate(${mainPlot.dimensions.margins.left}, ${mainPlot.dimensions.margins.top})`}
              style={{
                cursor: isManualPeakMode
                  ? "crosshair"
                  : selectionTarget === "pre"
                    ? "w-resize"
                    : selectionTarget === "post"
                      ? "e-resize"
                      : effectiveCursorMode === "zoom"
                        ? "crosshair"
                        : effectiveCursorMode === "pan"
                          ? "grab"
                          : "default",
              }}
              onPointerDown={handlePanStart}
              onPointerMove={handlePanMove}
              onPointerUp={handlePanEnd}
              onPointerLeave={handlePanEnd}
              onClick={handlePlotAreaClick}
            >
              <g clipPath={`url(#${plotClipId})`}>
                <rect
                  width={mainPlotWidth}
                  height={mainPlotHeight}
                  fill="transparent"
                  style={{
                    pointerEvents: inspectPlotHitSurfaceActive ? "all" : "none",
                  }}
                />
                {yAxisQuantity === "delta" && (
                  <line
                    x1={0}
                    x2={mainPlotWidth}
                    y1={mainPlotScales.yScale(0)}
                    y2={mainPlotScales.yScale(0)}
                    stroke={themeColors.axis}
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                  />
                )}
                <ChartSpectrumLines
                  traces={visibleTraces}
                  scales={mainPlotScales}
                  graphStyle={graphStyle}
                  idPrefix="main"
                  linkedOpticalAreaBands={visibleLinkedOpticalAreaBands}
                />
                <PeakIndicators
                  peaks={peaks}
                  scales={mainPlotScales}
                  dimensions={mainPlot.dimensions}
                  selectedPeakId={selectedPeakId ?? null}
                  variant={isManualPeakMode ? "peak-edit" : "default"}
                />
                {isManualPeakMode && (
                  <PeakOverlayLayer
                    isActive
                    peaks={peaks}
                    scales={mainPlotScales}
                    dimensions={mainPlot.dimensions}
                    selectedPeakId={selectedPeakId}
                    isManualPeakMode
                    onPeakSelect={onPeakSelect}
                    onPeakAdd={onPeakAdd}
                    onPeakDelete={onPeakDelete}
                    onPeakUpdate={onPeakUpdate}
                    onPeakEnergyUpdate={handlePeakEnergyUpdate}
                    plotRef={svgRef}
                    getYValueAtEnergy={getYValueAtEnergy}
                  />
                )}
                <InspectPinLayer
                  slot="svg"
                  pins={inspectPins}
                  selectedPinId={selectedInspectPinId}
                  visibleTraces={visibleTraces}
                  scales={mainPlotScales}
                  dimensions={mainPlot.dimensions}
                  themeColors={themeColors}
                  plotSvgRef={svgRef}
                  onSelectPin={selectInspectPin}
                  onRemovePin={removeInspectPin}
                  onUpdatePinEnergy={updateInspectPinEnergy}
                  overlayWidth={width}
                  overlayHeight={contentHeight}
                  yAxisQuantity={yAxisQuantity}
                  showThetaData={showThetaData}
                  showPhiData={showPhiData}
                  linkedImaginaryGlyph={opticalLinkConfig?.imaginaryGlyph}
                  linkedRealGlyph={opticalLinkConfig?.realGlyph}
                />
              </g>
            </g>
            {selectionTarget && (
              <NormalizationBrush
                xScale={mainPlotScales.xScale}
                yScale={mainPlotScales.yScale}
                dimensions={mainPlot.dimensions}
                selectionTarget={selectionTarget}
                onSelectionChange={
                  onSelectionChange as (s: SpectrumSelection | null) => void
                }
                isDark={isDark}
                themeColors={themeColors}
              />
            )}
            {normalizationRegions &&
              normalizationEdgeHandlesEnabled &&
              onNormalizationEdgeEnergyChange &&
              (selectionTarget !== null || showNormalizationShading) && (
                <g
                  style={{ pointerEvents: "auto" }}
                  transform={`translate(${mainPlot.dimensions.margins.left}, ${mainPlot.dimensions.margins.top})`}
                >
                  <NormalizationRegionHandles
                    normalizationRegions={normalizationRegions}
                    xScale={mainPlotScales.xScale}
                    dimensions={mainPlot.dimensions}
                    plotSvgRef={svgRef}
                    energyDomain={dataXBounds}
                    onEdgeEnergyChange={onNormalizationEdgeEnergyChange}
                  />
                </g>
              )}
            {effectiveCursorMode === "zoom" && !selectionTarget && (
              <BrushZoom
                xScale={mainPlotScales.xScale}
                yScale={mainPlotScales.yScale}
                dimensions={mainPlot.dimensions}
                isDark={isDark}
                themeColors={themeColors}
                zoomMode={zoomMode}
                onZoom={handleMarqueeZoom}
                onReset={handleResetZoom}
                allowPlotInteractionsBelow={zoomedXDomain != null}
                enableVerticalMarqueeWithShift={yAxisZoomPanEnabled}
              />
            )}
            {effectiveCursorMode === "pan" && isAxisZoomed && (
              <g
                ref={panOverlayRef}
                transform={`translate(${mainPlot.dimensions.margins.left}, ${mainPlot.dimensions.margins.top})`}
                style={{ cursor: "grab" }}
                onPointerDown={handlePanStart}
                onPointerMove={handlePanMove}
                onPointerUp={handlePanEnd}
                onPointerLeave={handlePanEnd}
              >
                <rect
                  width={mainPlotWidth}
                  height={mainPlotHeight}
                  fill="transparent"
                  pointerEvents="all"
                />
              </g>
            )}
            <ChartAxes
              scales={mainPlotScales}
              dimensions={mainPlot.dimensions}
              themeColors={themeColors}
              showXAxisLabel={!hasSubplot}
              yAxisLabel={yAxisPrimary.label}
              yTickFormat={(v) => yAxisPrimary.tickFormat(Number(v))}
            />
            {tooltipData && effectiveCursorMode === "inspect" && (
              <ChartCrosshairAndDots
                energy={tooltipData.energy}
                dots={crosshairDots}
                xScale={mainPlotScales.xScale}
                yScale={mainPlotScales.yScale}
                dimensions={mainPlot.dimensions}
                themeColors={themeColors}
              />
            )}
            <g
              transform={`translate(${mainPlot.dimensions.margins.left}, ${mainPlot.dimensions.margins.top})`}
            >
              {showGeometryLegend ? (
                linkedOptical.active && opticalLinkConfig ? (
                  <PlotSpectrumGeometryLegend
                    mode="linked"
                    rows={linkedOptical.legendRows}
                    visibleTraceIds={visibleTraceIds}
                    onToggleGeometry={toggleGeometryLegend}
                    themeColors={themeColors}
                    plotWidth={mainPlotWidth}
                    plotHeight={mainPlotHeight}
                    plotSvgRef={svgRef}
                    plotMarginLeft={mainPlot.dimensions.margins.left}
                    plotMarginTop={mainPlot.dimensions.margins.top}
                    positionResetKey={geometryLegendPositionResetKey}
                    graphStyle={graphStyle}
                    imaginaryColumnGlyph={opticalLinkConfig.imaginaryGlyph}
                    realColumnGlyph={opticalLinkConfig.realGlyph}
                    angleColumnTitle={geometryLegendAngleTitle}
                  />
                ) : (
                  <PlotSpectrumGeometryLegend
                    mode="single"
                    rows={singleGeometryLegend.rows}
                    visibleTraceIds={visibleTraceIds}
                    onToggleGeometry={toggleGeometryLegend}
                    themeColors={themeColors}
                    plotWidth={mainPlotWidth}
                    plotHeight={mainPlotHeight}
                    plotSvgRef={svgRef}
                    plotMarginLeft={mainPlot.dimensions.margins.left}
                    plotMarginTop={mainPlot.dimensions.margins.top}
                    positionResetKey={geometryLegendPositionResetKey}
                    graphStyle={graphStyle}
                    channelColumnGlyph={channelLegendGlyph}
                    angleColumnTitle={geometryLegendAngleTitle}
                  />
                )
              ) : null}
            </g>
          </g>

          {hasSubplot && peakPlot && (
            <g transform={`translate(0, ${interactionPlot.dimensions.height})`}>
              <rect
                x={peakPlot.dimensions.margins.left}
                y={peakPlot.dimensions.margins.top}
                width={
                  peakPlot.dimensions.width -
                  peakPlot.dimensions.margins.left -
                  peakPlot.dimensions.margins.right
                }
                height={
                  peakPlot.dimensions.height -
                  peakPlot.dimensions.margins.top -
                  peakPlot.dimensions.margins.bottom
                }
                fill={themeColors.plot}
              />
              <ChartGrid
                scales={{ xScale: peakPlot.xScale, yScale: peakPlot.yScale }}
                dimensions={peakPlot.dimensions}
                themeColors={themeColors}
              />
              <ChartAxes
                scales={{ xScale: peakPlot.xScale, yScale: peakPlot.yScale }}
                dimensions={peakPlot.dimensions}
                themeColors={themeColors}
                showXAxisLabel
              />
              {peakViz.selectedGeometryTrace && (
                <g
                  transform={`translate(${peakPlot.dimensions.margins.left}, ${peakPlot.dimensions.margins.top})`}
                >
                  <ChartSpectrumLines
                    traces={[peakViz.selectedGeometryTrace]}
                    scales={{
                      xScale: peakPlot.xScale,
                      yScale: peakPlot.yScale,
                    }}
                    graphStyle={graphStyle}
                    idPrefix="peak"
                  />
                </g>
              )}
              {peakViz.hasPeakVisualization && energyRange.length > 0 && (
                <g
                  transform={`translate(${peakPlot.dimensions.margins.left}, ${peakPlot.dimensions.margins.top})`}
                >
                  <PeakCurves
                    peaks={peaks}
                    scales={{
                      xScale: peakPlot.xScale,
                      yScale: peakPlot.yScale,
                      xInvert: (p: number) => peakPlot.xScale.invert(p),
                      yInvert: (p: number) => peakPlot.yScale.invert(p),
                    }}
                    selectedPeakId={selectedPeakId ?? null}
                    energyRange={energyRange}
                  />
                </g>
              )}
            </g>
          )}
          </>
          )}
        </svg>
        <PeakPlotAnnotations
          peaks={peaks}
          selectedPeakId={selectedPeakId ?? null}
          scales={mainPlotScales}
          dimensions={mainPlot.dimensions}
          getYValueAtEnergy={getYValueAtEnergy}
          onPeakSelect={onPeakSelect}
          onPeakPatch={onPeakPatch}
          onPeakUpdate={onPeakUpdate}
          visible={isManualPeakMode}
          overlayWidth={width}
          overlayHeight={contentHeight}
        />
        <InspectPinLayer
          slot="overlay"
          pins={inspectPins}
          selectedPinId={selectedInspectPinId}
          visibleTraces={visibleTraces}
          scales={mainPlotScales}
          dimensions={interactionPlot.dimensions}
          themeColors={themeColors}
          plotSvgRef={svgRef}
          onSelectPin={selectInspectPin}
          onRemovePin={removeInspectPin}
          onUpdatePinEnergy={updateInspectPinEnergy}
          overlayWidth={width}
          overlayHeight={contentHeight}
          yAxisQuantity={yAxisQuantity}
          showThetaData={showThetaData}
          showPhiData={showPhiData}
          linkedImaginaryGlyph={opticalLinkConfig?.imaginaryGlyph}
          linkedRealGlyph={opticalLinkConfig?.realGlyph}
        />
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{ width: plotCanvasWidth, height: plotCanvasHeight }}
        >
          <PlotToolRail
            plotWidth={plotCanvasWidth}
            plotHeight={plotCanvasHeight}
            railInsets={railInsets}
            currentMode={effectiveCursorMode}
            isCursorDisabled={plotContext?.kind === "normalize"}
            isPanDisabled={!isAxisZoomed}
            onCursorModeChange={handleCursorModeChange}
            onResetZoom={handleResetZoom}
            onExportClick={
              plotTopRailDataActions
                ? undefined
                : () => setExportModalOpen(true)
            }
            topRailLeadingExtras={plotTopRailDataActions}
            topRailTrailingExtras={plotTopRailTrailingActions}
            dataViewTabs={headerRight}
            analysisTools={headerAnalysis}
            bottomTools={plotBottomTools}
            suppressAnalysisRailLeadingGrip={suppressAnalysisRailLeadingGrip}
          />
        </div>
      </div>

      <div className="hidden">
        <PlotToolbar
          currentMode={effectiveCursorMode}
          onModeChange={handleCursorModeChange}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          themeColors={themeColors}
        />
      </div>

      {(zoomedXDomain != null || zoomedYDomain != null) && (
        <div className="hidden">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleResetZoom}
              className="rounded-md border border-[var(--border-default)] bg-[var(--surface-1)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              Reset Zoom
            </button>
          </div>
        </div>
      )}

      <ExportPlotModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        svgRef={svgRef}
        plotWidth={width}
        plotHeight={contentHeight}
        plotArea={{
          left: mainPlot.dimensions.margins.left,
          top: mainPlot.dimensions.margins.top,
          width: mainPlotWidth,
          height: mainPlotHeight,
        }}
        visibleTraceExportInfo={visibleTraces.map((trace) => {
          const idx = allTraces.indexOf(trace);
          const id = allTraceIds[idx] ?? `trace-${idx}`;
          return { id, label: getTraceLabel(trace, idx) };
        })}
      />
    </div>
  );
}
