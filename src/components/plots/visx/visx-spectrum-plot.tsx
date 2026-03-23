/**
 * Main visx spectrum plot component.
 * @deprecated Use the new spectrum implementation via SpectrumPlot from spectrum-plot.tsx instead.
 * This file is kept for reference and for any direct imports until fully migrated.
 */

"use client";

import { useMemo, useCallback, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { ParentSize } from "@visx/responsive";
import type {
  PlotContext,
  SpectrumPlotProps,
  SpectrumSelection,
  TraceData,
} from "../types";
import {
  DEFAULT_PLOT_HEIGHT,
  FILL_CONTAINER_MIN_HEIGHT,
  NORMALIZATION_COLORS,
  PLOT_FRAME_RADIUS,
  OVERVIEW_HEIGHT,
  OVERVIEW_GAP,
} from "../constants";
import { useChartTheme, type ChartThemeColors } from "../hooks/useChartTheme";
import { useSpectrumData } from "../hooks/useSpectrumData";
import { useReferenceData } from "../hooks/useReferenceData";
import { useDataExtents } from "../hooks/useDataExtents";
import { useVisxSubplotLayout } from "../hooks/useVisxSubplotLayout";
import { VisxAxes } from "./VisxAxes";
import { VisxGrid } from "./VisxGrid";
import { SpectrumLines } from "./SpectrumLines";
import { VisxTooltip, useSpectrumTooltip } from "./VisxTooltip";
import { PeakIndicators } from "./PeakIndicators";
import { PeakCurves } from "./PeakCurves";
import { InteractivePeak } from "./InteractivePeak";
import { BrushZoom, type ZoomMode } from "./BrushZoom";
import { BrushOverview } from "./BrushOverview";
import type { CursorMode } from "./CursorModeSelector";
import { useVisxPeakInteractions } from "../hooks/useVisxPeakInteractions";
import { usePeakVisualization } from "../hooks/usePeakVisualization";
import { findClosestPoint } from "../utils/find-closest-point";
import { peakStableId } from "../utils/peakStableId";

/** @deprecated Use SpectrumPlot from spectrum-plot.tsx (new spectrum/ implementation) */
export function VisxSpectrumPlot({
  points,
  height = DEFAULT_PLOT_HEIGHT,
  graphStyle = "line",
  energyStats,
  absorptionStats,
  referenceCurves = [],
  normalizationRegions,
  plotContext,
  onSelectionChange,
  peaks = [],
  selectedPeakId,
  onPeakUpdate,
  onPeakSelect,
  onPeakDelete,
  onPeakAdd,
  differenceSpectra = [],
  showThetaData = false,
  showPhiData = false,
  selectedGeometry = null,
  cursorMode: externalCursorMode,
  onCursorModeChange,
}: SpectrumPlotProps & {
  cursorMode?: CursorMode;
  onCursorModeChange?: (mode: CursorMode) => void;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const themeColors = useChartTheme();

  const selectionTarget: "pre" | "post" | null =
    plotContext?.kind === "normalize" ? plotContext.target : null;
  const isManualPeakMode = plotContext?.kind === "peak-edit";

  // Process spectrum data
  const groupedTraces = useSpectrumData(
    points,
    showThetaData,
    showPhiData,
    differenceSpectra,
    isDark,
  );

  // Process reference and difference data
  const referenceData = useReferenceData(referenceCurves, differenceSpectra, isDark);

  // Process peak visualization
  const peakViz = usePeakVisualization(
    points,
    peaks,
    selectedPeakId ?? null,
    selectedGeometry,
  );

  // Calculate data extents
  const extents = useDataExtents(points, differenceSpectra);

  // Combine all traces for tooltip finding
  const allTraces = useMemo(() => {
    return [
      ...groupedTraces.traces,
      ...referenceData.referenceTraces,
      ...referenceData.differenceTraces,
    ];
  }, [
    groupedTraces.traces,
    referenceData.referenceTraces,
    referenceData.differenceTraces,
  ]);

  // Empty state
  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--surface-1)] p-6 text-sm text-[var(--text-secondary)]">
        Upload a spectrum CSV to preview data.
      </div>
    );
  }

  const fillContainer = height == null;
  const wrapperClass = fillContainer
    ? "min-h-0 w-full flex-1 flex flex-col min-w-0 self-stretch"
    : undefined;
  const wrapperStyle = fillContainer
    ? { minHeight: FILL_CONTAINER_MIN_HEIGHT }
    : undefined;
  const sizeWrapperClass = fillContainer
    ? "flex-1 min-h-0 w-full self-stretch"
    : undefined;
  const content = (
    <ParentSize>
      {({ width, height: sizeHeight }) => {
        const rawHeight = sizeHeight ?? 0;
        const effectiveHeight =
          height ??
          (rawHeight > 0
            ? Math.max(rawHeight, FILL_CONTAINER_MIN_HEIGHT)
            : FILL_CONTAINER_MIN_HEIGHT);
        if (width === 0 || effectiveHeight === 0) return null;
        return (
          <VisxSpectrumPlotWithWidth
            width={width}
            height={effectiveHeight}
            graphStyle={graphStyle}
            extents={extents}
            peakViz={peakViz}
            energyStats={energyStats}
            absorptionStats={absorptionStats}
            groupedTraces={groupedTraces.traces}
            referenceTraces={referenceData.referenceTraces}
            differenceTraces={referenceData.differenceTraces}
            allTraces={allTraces}
            isDark={isDark}
            themeColors={themeColors}
            peaks={peaks}
            selectedPeakId={selectedPeakId}
            normalizationRegions={normalizationRegions}
            selectionTarget={selectionTarget}
            onSelectionChange={onSelectionChange}
            onPeakUpdate={onPeakUpdate}
            onPeakSelect={onPeakSelect}
            onPeakDelete={onPeakDelete}
            onPeakAdd={onPeakAdd}
            isManualPeakMode={isManualPeakMode}
            cursorMode={externalCursorMode}
            onCursorModeChange={onCursorModeChange}
          />
        );
      }}
    </ParentSize>
  );
  return fillContainer ? (
    <div className={wrapperClass} style={wrapperStyle}>
      <div
        className={sizeWrapperClass}
        style={{ minHeight: FILL_CONTAINER_MIN_HEIGHT }}
      >
        {content}
      </div>
    </div>
  ) : (
    content
  );
}

/**
 * Inner component that can call hooks - receives width as prop
 */
function VisxSpectrumPlotWithWidth({
  width,
  height,
  graphStyle,
  extents,
  peakViz,
  energyStats,
  absorptionStats,
  groupedTraces,
  referenceTraces,
  differenceTraces,
  allTraces,
  isDark,
  themeColors,
  peaks,
  selectedPeakId,
  normalizationRegions,
  selectionTarget,
  onSelectionChange,
  onPeakUpdate,
  onPeakSelect,
  onPeakDelete,
  onPeakAdd,
  isManualPeakMode,
  cursorMode,
  onCursorModeChange,
}: {
  width: number;
  height: number;
  graphStyle: "line" | "scatter" | "area";
  extents: ReturnType<typeof useDataExtents>;
  peakViz: ReturnType<typeof usePeakVisualization>;
  energyStats?: Parameters<typeof VisxSpectrumPlot>[0]["energyStats"];
  absorptionStats?: Parameters<typeof VisxSpectrumPlot>[0]["absorptionStats"];
  groupedTraces: TraceData[];
  referenceTraces: TraceData[];
  differenceTraces: TraceData[];
  allTraces: TraceData[];
  isDark: boolean;
  themeColors: ChartThemeColors;
  peaks: Parameters<typeof usePeakVisualization>[1];
  selectedPeakId?: string | null;
  normalizationRegions?: Parameters<
    typeof VisxSpectrumPlot
  >[0]["normalizationRegions"];
  selectionTarget?: "pre" | "post" | null;
  onSelectionChange?:
    | ((selection: SpectrumSelection | null) => void)
    | undefined;
  onPeakUpdate?: (peakId: string, energy: number) => void;
  onPeakSelect?: (peakId: string | null) => void;
  onPeakDelete?: (peakId: string) => void;
  onPeakAdd?: (energy: number) => void;
  isManualPeakMode?: boolean;
  cursorMode?: CursorMode;
  onCursorModeChange?: (mode: CursorMode) => void;
}) {
  const contentHeight = height - OVERVIEW_HEIGHT - OVERVIEW_GAP;
  const subplotLayout = useVisxSubplotLayout(
    width,
    contentHeight,
    extents,
    peakViz.hasPeakVisualization,
    peakViz.selectedGeometryPoints,
    energyStats,
    absorptionStats,
  );

  return (
    <VisxSpectrumPlotInner
      subplotLayout={subplotLayout}
      extents={extents}
      fullHeight={height}
      contentHeight={contentHeight}
      overviewHeight={OVERVIEW_HEIGHT}
      overviewGap={OVERVIEW_GAP}
      graphStyle={graphStyle}
      groupedTraces={groupedTraces}
      referenceTraces={referenceTraces}
      differenceTraces={differenceTraces}
      allTraces={allTraces}
      isDark={isDark}
      themeColors={themeColors}
      peaks={peaks}
      selectedPeakId={selectedPeakId}
      peakViz={peakViz}
      normalizationRegions={normalizationRegions}
      selectionTarget={selectionTarget}
      onSelectionChange={onSelectionChange}
      onPeakUpdate={onPeakUpdate}
      onPeakSelect={onPeakSelect}
      onPeakDelete={onPeakDelete}
      onPeakAdd={onPeakAdd}
      isManualPeakMode={isManualPeakMode}
      energyStats={energyStats}
      absorptionStats={absorptionStats}
      cursorMode={cursorMode}
      onCursorModeChange={onCursorModeChange}
    />
  );
}

function VisxSpectrumPlotInner({
  subplotLayout,
  extents,
  fullHeight,
  contentHeight,
  overviewHeight,
  overviewGap,
  graphStyle,
  groupedTraces,
  referenceTraces,
  differenceTraces,
  allTraces,
  isDark,
  themeColors,
  peaks,
  selectedPeakId,
  peakViz,
  normalizationRegions,
  selectionTarget,
  onSelectionChange: _onSelectionChange,
  onPeakUpdate,
  onPeakSelect,
  onPeakDelete,
  onPeakAdd,
  isManualPeakMode,
  energyStats: _energyStats,
  absorptionStats: _absorptionStats,
  cursorMode: externalCursorMode,
  onCursorModeChange,
}: {
  subplotLayout: ReturnType<typeof useVisxSubplotLayout>;
  extents: ReturnType<typeof useDataExtents>;
  fullHeight: number;
  contentHeight: number;
  overviewHeight: number;
  overviewGap: number;
  graphStyle: "line" | "scatter" | "area";
  groupedTraces: TraceData[];
  referenceTraces: TraceData[];
  differenceTraces: TraceData[];
  allTraces: TraceData[];
  isDark: boolean;
  themeColors: ChartThemeColors;
  peaks: Parameters<typeof usePeakVisualization>[1];
  selectedPeakId?: string | null;
  peakViz: ReturnType<typeof usePeakVisualization>;
  normalizationRegions?: Parameters<
    typeof VisxSpectrumPlot
  >[0]["normalizationRegions"];
  selectionTarget?: "pre" | "post" | null;
  onSelectionChange?:
    | ((selection: SpectrumSelection | null) => void)
    | undefined;
  onPeakUpdate?: (peakId: string, energy: number) => void;
  onPeakSelect?: (peakId: string | null) => void;
  onPeakDelete?: (peakId: string) => void;
  onPeakAdd?: (energy: number) => void;
  isManualPeakMode?: boolean;
  energyStats?: Parameters<typeof VisxSpectrumPlot>[0]["energyStats"];
  absorptionStats?: Parameters<typeof VisxSpectrumPlot>[0]["absorptionStats"];
  cursorMode?: CursorMode;
  onCursorModeChange?: (mode: CursorMode) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    showTooltip,
    hideTooltip,
    TooltipInPortal,
    containerRef: tooltipContainerRef,
  } = useSpectrumTooltip();

  // Cursor mode state management - default to inspect mode
  const [internalCursorMode, setInternalCursorMode] =
    useState<CursorMode>("inspect");
  const cursorMode = externalCursorMode ?? internalCursorMode;

  // Default to inspect mode when not explicitly set to pan or zoom
  const effectiveCursorMode = useMemo(() => {
    if (selectionTarget) return "select";
    if (isManualPeakMode) return "peak";
    return cursorMode === "pan" || cursorMode === "zoom"
      ? cursorMode
      : "inspect";
  }, [cursorMode, selectionTarget, isManualPeakMode]);
  const handleCursorModeChange = useCallback(
    (mode: CursorMode) => {
      if (onCursorModeChange) {
        onCursorModeChange(mode);
      } else {
        setInternalCursorMode(mode);
      }
    },
    [onCursorModeChange],
  );

  // Domain-based zoom state (instead of transform-based)
  const [zoomMode, _setZoomMode] = useState<ZoomMode>("default");

  // Reset zoom handler - also clears brush
  const handleResetZoom = useCallback(() => {
    setZoomedXDomain(null);
    setZoomedYDomain(null);
  }, []);
  const [zoomedXDomain, setZoomedXDomain] = useState<[number, number] | null>(
    null,
  );
  const [zoomedYDomain, setZoomedYDomain] = useState<[number, number] | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragCurrentRef = useRef<{ x: number; y: number } | null>(null);

  const { mainPlot, peakPlot, hasSubplot } = subplotLayout;

  const totalWidth = mainPlot.dimensions.width;
  const totalHeight = fullHeight;

  const originalXDomain = useMemo(
    () => mainPlot.xScale.domain() as [number, number],
    [mainPlot.xScale],
  );
  const dataXBounds = useMemo((): [number, number] => {
    if (extents.energyExtent) {
      const { min, max } = extents.energyExtent;
      const span = Math.max(max - min, 1);
      return [min, max];
    }
    return originalXDomain;
  }, [extents.energyExtent, originalXDomain]);
  const originalYDomain = useMemo(
    () => mainPlot.yScale.domain() as [number, number],
    [mainPlot.yScale],
  );

  // Create zoomed scales based on current zoom state
  const zoomedXScale = useMemo(() => {
    const domain = zoomedXDomain ?? originalXDomain;
    return mainPlot.xScale.copy().domain(domain);
  }, [mainPlot.xScale, zoomedXDomain, originalXDomain]);

  const zoomedYScale = useMemo(() => {
    const domain = zoomedYDomain ?? originalYDomain;
    return mainPlot.yScale.copy().domain(domain);
  }, [mainPlot.yScale, zoomedYDomain, originalYDomain]);

  // Convert main plot scales to VisxScales format with zoomed domains
  const mainPlotScales = useMemo(
    () => ({
      xScale: zoomedXScale,
      yScale: zoomedYScale,
      xInvert: (pixel: number) => zoomedXScale.invert(pixel),
      yInvert: (pixel: number) => zoomedYScale.invert(pixel),
    }),
    [zoomedXScale, zoomedYScale],
  );

  const getYValueAtEnergy = useCallback(
    (energy: number) => {
      const trace = groupedTraces[0];
      if (!trace?.x?.length || !trace.y?.length) return 1;
      const xs = trace.x;
      const ys = trace.y;
      let bestY = ys[0] ?? 1;
      let bestD = Infinity;
      for (let i = 0; i < xs.length; i++) {
        const xi = xs[i];
        if (xi === undefined) continue;
        const d = Math.abs(xi - energy);
        if (d < bestD) {
          bestD = d;
          bestY = ys[i] ?? bestY;
        }
      }
      return bestY;
    },
    [groupedTraces],
  );

  const isZoomed = zoomedXDomain !== null || zoomedYDomain !== null;

  // Convert peak plot scales if subplot exists
  const peakPlotScales = useMemo(() => {
    if (!peakPlot) return null;
    return {
      xScale: peakPlot.xScale,
      yScale: peakPlot.yScale,
      xInvert: (pixel: number) => peakPlot.xScale.invert(pixel),
      yInvert: (pixel: number) => peakPlot.yScale.invert(pixel),
    };
  }, [peakPlot]);

  // Calculate energy range for peak curves
  const energyRange = useMemo(() => {
    if (
      !peakViz.selectedGeometryPoints ||
      peakViz.selectedGeometryPoints.length === 0
    ) {
      return [];
    }
    const energies = peakViz.selectedGeometryPoints
      .map((p) => p.energy)
      .sort((a, b) => a - b);
    const minEnergy = energies[0] ?? 0;
    const maxEnergy = energies[energies.length - 1] ?? 0;
    const numPoints = Math.max(200, peakViz.selectedGeometryPoints.length);
    const range: number[] = [];
    for (let i = 0; i < numPoints; i++) {
      range.push(minEnergy + (maxEnergy - minEnergy) * (i / (numPoints - 1)));
    }
    return range;
  }, [peakViz.selectedGeometryPoints]);

  // Handle mouse move for tooltip (works for both main plot and subplot)
  // Default to inspect mode - show tooltip unless in zoom mode
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      // Don't show tooltip when in normalization selection mode
      if (selectionTarget) {
        hideTooltip();
        return;
      }
      // Show tooltip in inspect mode (default) or when in pan mode
      // Don't show in zoom mode (brush selection active)
      if (effectiveCursorMode === "zoom") {
        hideTooltip();
        return;
      }
      const svgRect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - svgRect.left;
      const y = event.clientY - svgRect.top;

      // Determine which plot area the mouse is in
      const mainPlotTop = mainPlot.dimensions.margins.top;
      const mainPlotBottom =
        mainPlotTop +
        (mainPlot.dimensions.height -
          mainPlot.dimensions.margins.top -
          mainPlot.dimensions.margins.bottom);
      const isInMainPlot = y >= mainPlotTop && y <= mainPlotBottom;

      let currentScales = mainPlotScales;
      let currentDimensions = mainPlot.dimensions;
      let adjustedY = y - mainPlot.dimensions.margins.top;
      let adjustedX = x - currentDimensions.margins.left;

      // No need to account for zoom transform - scales already have zoomed domains

      if (!isInMainPlot && peakPlot && hasSubplot) {
        const peakPlotTop = mainPlot.dimensions.height;
        const peakPlotBottom =
          peakPlotTop +
          (peakPlot.dimensions.height -
            peakPlot.dimensions.margins.top -
            peakPlot.dimensions.margins.bottom);
        const isInPeakPlot = y >= peakPlotTop && y <= peakPlotBottom;

        if (isInPeakPlot && peakPlotScales) {
          currentScales = peakPlotScales;
          currentDimensions = peakPlot.dimensions;
          adjustedY = y - peakPlotTop - peakPlot.dimensions.margins.top;
          adjustedX = x - currentDimensions.margins.left;
        } else {
          hideTooltip();
          return;
        }
      }

      const plotWidth =
        currentDimensions.width -
        currentDimensions.margins.left -
        currentDimensions.margins.right;
      const plotHeight =
        currentDimensions.height -
        currentDimensions.margins.top -
        currentDimensions.margins.bottom;

      // Check if within plot bounds (accounting for zoom)
      if (
        adjustedX < 0 ||
        adjustedX > plotWidth ||
        adjustedY < 0 ||
        adjustedY > plotHeight
      ) {
        hideTooltip();
        return;
      }

      // Invert to data coordinates using zoomed scales
      const energy = currentScales.xScale.invert(adjustedX);

      // Find closest point across all traces
      const domain = currentScales.xScale.domain();
      if (
        !domain ||
        domain.length < 2 ||
        typeof domain[0] !== "number" ||
        typeof domain[1] !== "number"
      ) {
        hideTooltip();
        return;
      }
      const energyDomainRange = domain[1] - domain[0];
      const threshold = energyDomainRange * 0.02;

      // Use appropriate traces based on which plot we're in
      const tracesToSearch = isInMainPlot
        ? allTraces
        : peakViz.selectedGeometryTrace
          ? [peakViz.selectedGeometryTrace]
          : [];

      const closestPoint = findClosestPoint(energy, tracesToSearch, threshold);

      if (closestPoint) {
        // Use screen coordinates for tooltip positioning
        // TooltipInPortal with detectBounds will handle boundary detection
        showTooltip({
          tooltipData: {
            energy: closestPoint.energy,
            intensity: closestPoint.absorption,
            label: closestPoint.label,
          },
          tooltipLeft: event.clientX,
          tooltipTop: event.clientY,
        });
      } else {
        hideTooltip();
      }
    },
    [
      mainPlot,
      peakPlot,
      hasSubplot,
      mainPlotScales,
      peakPlotScales,
      allTraces,
      peakViz.selectedGeometryTrace,
      showTooltip,
      hideTooltip,
      effectiveCursorMode,
      selectionTarget,
    ],
  );

  const handleMouseLeave = useCallback(() => {
    hideTooltip();
  }, [hideTooltip]);

  // Set up peak interactions for main plot (peaks appear as indicators on main plot)
  const { handleClick: handlePeakClick } = useVisxPeakInteractions({
    peaks,
    scales: mainPlotScales,
    dimensions: mainPlot.dimensions,
    selectedPeakId,
    onPeakSelect,
    onPeakAdd,
    onPeakDelete,
    onPeakUpdate,
    isManualPeakMode,
    plotRef: svgRef,
  });

  // Handler for peak energy updates
  const handlePeakEnergyUpdate = useCallback(
    (peakId: string, energy: number) => {
      onPeakUpdate?.(peakId, energy);
    },
    [onPeakUpdate],
  );

  const mainPlotWidth =
    mainPlot.dimensions.width -
    mainPlot.dimensions.margins.left -
    mainPlot.dimensions.margins.right;
  const mainPlotHeight =
    mainPlot.dimensions.height -
    mainPlot.dimensions.margins.top -
    mainPlot.dimensions.margins.bottom;

  const hoveredValuesMap = useMemo(() => {
    if (!tooltipData || effectiveCursorMode !== "inspect")
      return new Map<string, number>();
    const values = new Map<string, number>();
    const energy = tooltipData.energy;
    const domain = mainPlotScales.xScale.domain();
    const energyDomainRange =
      domain &&
      domain.length >= 2 &&
      typeof domain[1] === "number" &&
      typeof domain[0] === "number"
        ? domain[1] - domain[0]
        : 100;
    const threshold = energyDomainRange * 0.02;
    allTraces.forEach((trace) => {
      const label = typeof trace.name === "string" ? trace.name : "Trace";
      const xValues = trace.x;
      const yValues = trace.y;
      if (
        Array.isArray(xValues) &&
        Array.isArray(yValues) &&
        xValues.length === yValues.length &&
        xValues.length > 0
      ) {
        let closestIndex = 0;
        let minDistance = Math.abs(xValues[0]! - energy);
        for (let i = 0; i < xValues.length; i++) {
          const xVal = xValues[i]!;
          if (typeof xVal === "number") {
            const distance = Math.abs(xVal - energy);
            if (distance < minDistance) {
              minDistance = distance;
              closestIndex = i;
            }
          }
        }
        if (
          minDistance <= threshold &&
          typeof yValues[closestIndex] === "number"
        ) {
          values.set(label, yValues[closestIndex]!);
        }
      }
    });
    return values;
  }, [tooltipData, effectiveCursorMode, allTraces, mainPlotScales]);

  const hoveredPointsWithColor = useMemo(() => {
    if (!tooltipData || effectiveCursorMode !== "inspect") return [];
    const energy = tooltipData.energy;
    const points: Array<{ value: number; color: string }> = [];
    allTraces.forEach((trace) => {
      const label = typeof trace.name === "string" ? trace.name : "Trace";
      const value = hoveredValuesMap.get(label);
      if (value === undefined) return;
      const color =
        trace.line?.color ?? trace.marker?.color ?? themeColors.text;
      points.push({ value, color });
    });
    return points;
  }, [
    tooltipData,
    effectiveCursorMode,
    allTraces,
    hoveredValuesMap,
    themeColors.text,
  ]);

  // Horizontal-only pan handler
  const handlePanStart = useCallback(
    (event: React.MouseEvent<SVGGElement>) => {
      // Don't allow panning when in normalization selection mode
      if (selectionTarget) return;
      // Only allow panning in pan mode
      if (effectiveCursorMode !== "pan") return;

      if (event.button !== 0) return; // Only handle left mouse button
      const svgRect =
        event.currentTarget.ownerSVGElement?.getBoundingClientRect();
      if (!svgRect) return;

      const x = event.clientX - svgRect.left - mainPlot.dimensions.margins.left;
      const y = event.clientY - svgRect.top - mainPlot.dimensions.margins.top;

      // Only allow panning if within plot bounds
      if (x >= 0 && x <= mainPlotWidth && y >= 0 && y <= mainPlotHeight) {
        setIsDragging(true);
        dragStartRef.current = { x, y };
        dragCurrentRef.current = { x, y };
        event.preventDefault(); // Prevent text selection
      }
    },
    [
      mainPlot.dimensions.margins,
      mainPlotWidth,
      mainPlotHeight,
      selectionTarget,
      effectiveCursorMode,
    ],
  );

  const handlePanMove = useCallback(
    (event: React.MouseEvent<SVGGElement>) => {
      if (!isDragging || !dragStartRef.current) return;

      const svgRect =
        event.currentTarget.ownerSVGElement?.getBoundingClientRect();
      if (!svgRect) return;

      const x = event.clientX - svgRect.left - mainPlot.dimensions.margins.left;

      dragCurrentRef.current = { x, y: dragStartRef.current.y ?? 0 };

      // Use a ref to get the current domain without causing re-renders during drag
      // We'll calculate the final domain based on the total delta
      const totalDeltaX = x - (dragStartRef.current.x ?? 0);

      // Convert pixel delta to data domain delta
      const currentXDomain = zoomedXDomain ?? originalXDomain;
      const domainWidth = currentXDomain[1] - currentXDomain[0];
      const pixelToDataRatio = domainWidth / mainPlotWidth;
      const dataDelta = -totalDeltaX * pixelToDataRatio;

      // Update x domain (horizontal pan only)
      const newXMin = currentXDomain[0] + dataDelta;
      const newXMax = currentXDomain[1] + dataDelta;

      const constrainedMin = Math.max(dataXBounds[0], newXMin);
      const constrainedMax = Math.min(dataXBounds[1], newXMax);

      // Only update if we have valid constraints and meaningful change
      if (constrainedMin < constrainedMax && Math.abs(dataDelta) > 0.001) {
        setZoomedXDomain([constrainedMin, constrainedMax]);
      }
    },
    [
      isDragging,
      mainPlotWidth,
      zoomedXDomain,
      originalXDomain,
      dataXBounds,
      mainPlot.dimensions.margins,
    ],
  );

  const handlePanEnd = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
    dragCurrentRef.current = null;
  }, []);

  const handleMarqueeZoom = useCallback(
    (xDomain: [number, number], yDomain: [number, number]) => {
      const xMin = dataXBounds[0];
      const xMax = dataXBounds[1];
      const clampedX0 = Math.max(xMin, Math.min(xMax, xDomain[0]));
      const clampedX1 = Math.max(xMin, Math.min(xMax, xDomain[1]));
      if (clampedX1 > clampedX0) setZoomedXDomain([clampedX0, clampedX1]);
      setZoomedYDomain(yDomain);
    },
    [dataXBounds],
  );

  return (
    <div
      className="relative"
      style={{
        width: totalWidth,
        height: totalHeight,
        overflow: "hidden",
      }}
    >
      <svg
        ref={(node) => {
          // Set both refs - tooltip container and our own ref
          if (
            tooltipContainerRef &&
            typeof tooltipContainerRef === "object" &&
            "current" in tooltipContainerRef
          ) {
            (
              tooltipContainerRef as React.MutableRefObject<SVGSVGElement | null>
            ).current = node;
          }
          if (node) {
            svgRef.current = node;
          }
        }}
        width={totalWidth}
        height={totalHeight}
        onMouseMove={(e) => {
          // Don't handle mouse move for tooltip when in normalization selection mode
          if (selectionTarget) return;
          // Show tooltip in inspect mode (default) or pan mode, but not in zoom mode
          if (!isDragging && effectiveCursorMode !== "zoom") {
            handleMouseMove(e);
          }
        }}
        onMouseLeave={handleMouseLeave}
        style={{
          cursor: selectionTarget ? "crosshair" : undefined,
          display: "block",
        }}
      >
        {/* Background */}
        <rect
          width={totalWidth}
          height={totalHeight}
          fill={themeColors.paper}
          pointerEvents="none"
        />

        {/* ==================== MAIN PLOT ==================== */}
        <g>
          <defs>
            <clipPath id="main-plot-clip">
              <rect
                x={mainPlot.dimensions.margins.left}
                y={mainPlot.dimensions.margins.top}
                width={mainPlotWidth}
                height={mainPlotHeight}
                rx={PLOT_FRAME_RADIUS}
                ry={PLOT_FRAME_RADIUS}
              />
            </clipPath>
          </defs>
          <rect
            x={mainPlot.dimensions.margins.left}
            y={mainPlot.dimensions.margins.top}
            width={mainPlotWidth}
            height={mainPlotHeight}
            rx={PLOT_FRAME_RADIUS}
            ry={PLOT_FRAME_RADIUS}
            fill={themeColors.plot}
            stroke={themeColors.legendBorder ?? themeColors.grid}
            strokeWidth={1}
            strokeOpacity={0.6}
            pointerEvents="none"
          />
          <g clipPath="url(#main-plot-clip)">
            <VisxGrid
              scales={mainPlotScales}
              dimensions={mainPlot.dimensions}
              isDark={isDark}
              themeColors={themeColors}
            />
            {normalizationRegions && (
              <>
                {normalizationRegions.pre &&
                  normalizationRegions.pre[0] !==
                    normalizationRegions.pre[1] && (
                    <rect
                      x={
                        mainPlot.xScale(normalizationRegions.pre[0]) +
                        mainPlot.dimensions.margins.left
                      }
                      y={mainPlot.dimensions.margins.top}
                      width={
                        mainPlot.xScale(normalizationRegions.pre[1]) -
                        mainPlot.xScale(normalizationRegions.pre[0])
                      }
                      height={mainPlotHeight}
                      fill={NORMALIZATION_COLORS.pre}
                      opacity={0.12}
                      pointerEvents="none"
                    />
                  )}
                {normalizationRegions.post &&
                  normalizationRegions.post[0] !==
                    normalizationRegions.post[1] && (
                    <rect
                      x={
                        mainPlot.xScale(normalizationRegions.post[0]) +
                        mainPlot.dimensions.margins.left
                      }
                      y={mainPlot.dimensions.margins.top}
                      width={
                        mainPlot.xScale(normalizationRegions.post[1]) -
                        mainPlot.xScale(normalizationRegions.post[0])
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
              transform={`translate(${mainPlot.dimensions.margins.left}, ${mainPlot.dimensions.margins.top})`}
              onMouseDown={handlePanStart}
              onMouseMove={handlePanMove}
              onMouseUp={handlePanEnd}
              onMouseLeave={handlePanEnd}
              style={{
                cursor: selectionTarget
                  ? "crosshair"
                  : isDragging
                    ? "grabbing"
                    : effectiveCursorMode === "select"
                      ? "crosshair"
                      : effectiveCursorMode === "peak"
                        ? "crosshair"
                        : effectiveCursorMode === "zoom"
                          ? "crosshair"
                          : effectiveCursorMode === "pan"
                            ? "grab"
                            : "default",
              }}
              onClick={(e) => {
                if (!isDragging && effectiveCursorMode === "peak") {
                  handlePeakClick(
                    e as React.MouseEvent<SVGSVGElement, MouseEvent>,
                  );
                }
              }}
            >
              <g>
                <g>
                  <SpectrumLines
                    traces={referenceTraces}
                    scales={mainPlotScales}
                    graphStyle={graphStyle}
                    idPrefix="ref"
                  />
                  <SpectrumLines
                    traces={groupedTraces}
                    scales={mainPlotScales}
                    graphStyle={graphStyle}
                    idPrefix="main"
                  />
                  <SpectrumLines
                    traces={differenceTraces}
                    scales={mainPlotScales}
                    graphStyle={graphStyle}
                    idPrefix="diff"
                  />
                </g>
                <g>
                  <PeakIndicators
                    peaks={peaks}
                    scales={mainPlotScales}
                    dimensions={mainPlot.dimensions}
                    selectedPeakId={selectedPeakId}
                    variant={isManualPeakMode ? "peak-edit" : "default"}
                  />
                </g>
                <g>
                  {peaks.map((peak, peakIndex) => {
                    const peakId = peakStableId(peak, peakIndex);
                    return (
                      <InteractivePeak
                        key={peakId}
                        peak={peak}
                        peakIndex={peakIndex}
                        scales={mainPlotScales}
                        dimensions={mainPlot.dimensions}
                        isSelected={selectedPeakId === peakId}
                        onEnergyUpdate={handlePeakEnergyUpdate}
                        plotSvgRef={svgRef}
                        getYValueAtEnergy={getYValueAtEnergy}
                        handlesOnlyWhenSelected
                      />
                    );
                  })}
                </g>
              </g>
            </g>
          </g>
          {/* Brush zoom (only when in zoom mode and not in normalization selection mode) */}
          {!selectionTarget && effectiveCursorMode === "zoom" && (
            <BrushZoom
              xScale={mainPlotScales.xScale}
              yScale={mainPlotScales.yScale}
              dimensions={mainPlot.dimensions}
              isDark={isDark}
              themeColors={themeColors}
              zoomMode={zoomMode}
              onZoom={handleMarqueeZoom}
              onReset={handleResetZoom}
            />
          )}
          <VisxAxes
            scales={mainPlotScales}
            dimensions={mainPlot.dimensions}
            isDark={isDark}
            themeColors={themeColors}
            showXAxisLabel={!hasSubplot}
          />
        </g>

        {/* ==================== PEAK SUBPLOT ==================== */}
        {hasSubplot && peakPlot && peakPlotScales && (
          <g transform={`translate(0, ${mainPlot.dimensions.height})`}>
            <defs>
              <clipPath id="peak-plot-clip">
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
                  rx={PLOT_FRAME_RADIUS}
                  ry={PLOT_FRAME_RADIUS}
                />
              </clipPath>
            </defs>
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
              rx={PLOT_FRAME_RADIUS}
              ry={PLOT_FRAME_RADIUS}
              fill={themeColors.plot}
              stroke={themeColors.legendBorder ?? themeColors.grid}
              strokeWidth={1}
              strokeOpacity={0.6}
              pointerEvents="none"
            />
            <g clipPath="url(#peak-plot-clip)">
              <VisxGrid
                scales={peakPlotScales}
                dimensions={peakPlot.dimensions}
                isDark={isDark}
                themeColors={themeColors}
              />
            </g>
            <VisxAxes
              scales={peakPlotScales}
              dimensions={peakPlot.dimensions}
              isDark={isDark}
              themeColors={themeColors}
              showXAxisLabel={true}
            />
            {/* Selected geometry spectrum in peak plot */}
            {peakViz.selectedGeometryTrace &&
              peakViz.selectedGeometryPoints && (
                <g
                  transform={`translate(${peakPlot.dimensions.margins.left}, ${peakPlot.dimensions.margins.top})`}
                >
                  <SpectrumLines
                    traces={[peakViz.selectedGeometryTrace]}
                    scales={peakPlotScales}
                    graphStyle={graphStyle}
                    idPrefix="peak"
                  />
                </g>
              )}
            {/* Peak curves in peak plot */}
            {peakViz.hasPeakVisualization && energyRange.length > 0 && (
              <g
                transform={`translate(${peakPlot.dimensions.margins.left}, ${peakPlot.dimensions.margins.top})`}
              >
                <PeakCurves
                  peaks={peaks}
                  scales={peakPlotScales}
                  selectedPeakId={selectedPeakId}
                  energyRange={energyRange}
                />
              </g>
            )}
          </g>
        )}

        {/* Brush overview strip (zoom box below main/peak plot) */}
        <BrushOverview
          width={totalWidth}
          height={overviewHeight}
          top={contentHeight + overviewGap}
          xScale={mainPlot.xScale}
          yScale={mainPlot.yScale}
          traces={groupedTraces}
          xDomain={dataXBounds}
          initialBrushDomain={zoomedXDomain ?? undefined}
          onBrushChange={(x0, x1) => {
            const xMin = dataXBounds[0];
            const xMax = dataXBounds[1];
            const clamped0 = Math.max(xMin, Math.min(xMax, x0));
            const clamped1 = Math.max(xMin, Math.min(xMax, x1));
            if (clamped1 > clamped0) setZoomedXDomain([clamped0, clamped1]);
          }}
          themeColors={themeColors}
          brushKey={zoomedXDomain === null ? "full" : "zoomed"}
        />

        {/* Reset Zoom Button (top right, only when zoomed) */}
        {isZoomed && (
          <g>
            <foreignObject
              x={mainPlot.dimensions.width - 80}
              y={10}
              width={70}
              height={32}
              style={{ overflow: "visible" }}
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleResetZoom();
                }}
                style={{
                  padding: "6px 12px",
                  backgroundColor: themeColors.legendBg,
                  border: `1px solid ${themeColors.legendBorder}`,
                  borderRadius: "6px",
                  color: themeColors.text,
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: 500,
                  fontFamily: "Inter, system-ui, sans-serif",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = themeColors.plot;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = themeColors.legendBg;
                }}
              >
                Reset Zoom
              </button>
            </foreignObject>
          </g>
        )}

        {/* Crosshair and dots on all traces when tooltip is active */}
        {tooltipData && effectiveCursorMode === "inspect" && (
          <g style={{ pointerEvents: "none" }}>
            <line
              x1={
                mainPlotScales.xScale(tooltipData.energy) +
                mainPlot.dimensions.margins.left
              }
              y1={mainPlot.dimensions.margins.top}
              x2={
                mainPlotScales.xScale(tooltipData.energy) +
                mainPlot.dimensions.margins.left
              }
              y2={mainPlot.dimensions.margins.top + mainPlotHeight}
              stroke={themeColors.crosshair ?? themeColors.text}
              strokeWidth={1.5}
              strokeDasharray="4,3"
              opacity={0.55}
              style={{ transition: "opacity 0.2s ease-in-out" }}
            />
            {hoveredPointsWithColor.map(({ value, color }, i) => (
              <circle
                key={i}
                cx={
                  mainPlotScales.xScale(tooltipData.energy) +
                  mainPlot.dimensions.margins.left
                }
                cy={
                  mainPlotScales.yScale(value) + mainPlot.dimensions.margins.top
                }
                r={5}
                fill={color}
                stroke={isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.2)"}
                strokeWidth={1.5}
                opacity={0.95}
              />
            ))}
          </g>
        )}
      </svg>

      {/* Tooltip (rendered in portal for better positioning) */}
      {tooltipData &&
        tooltipLeft !== undefined &&
        tooltipTop !== undefined &&
        TooltipInPortal && (
          <VisxTooltip
            tooltipData={tooltipData}
            tooltipLeft={tooltipLeft}
            tooltipTop={tooltipTop}
            tooltipX={
              tooltipData
                ? mainPlotScales.xScale(tooltipData.energy) +
                  mainPlot.dimensions.margins.left
                : undefined
            }
            tooltipY={
              tooltipData
                ? mainPlotScales.yScale(tooltipData.intensity) +
                  mainPlot.dimensions.margins.top
                : undefined
            }
            isDark={isDark}
            themeColors={themeColors}
            TooltipInPortal={
              TooltipInPortal as React.ComponentType<{
                left: number;
                top: number;
                style?: React.CSSProperties;
                offsetLeft?: number;
                offsetTop?: number;
              }>
            }
            plotDimensions={mainPlot.dimensions}
            scales={mainPlotScales}
          />
        )}
    </div>
  );
}
