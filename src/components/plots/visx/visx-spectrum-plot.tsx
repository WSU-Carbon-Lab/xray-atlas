/**
 * Main visx spectrum plot component
 */

"use client";

import { useMemo, useCallback, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { ParentSize } from "@visx/responsive";
import type { SpectrumPlotProps, SpectrumSelection, TraceData } from "../types";
import {
  DEFAULT_PLOT_HEIGHT,
  THEME_COLORS,
  NORMALIZATION_COLORS,
} from "../constants";
import { useSpectrumData } from "../hooks/useSpectrumData";
import { useReferenceData } from "../hooks/useReferenceData";
import { useDataExtents } from "../hooks/useDataExtents";
import { useVisxSubplotLayout } from "../hooks/useVisxSubplotLayout";
import { VisxAxes } from "./VisxAxes";
import { VisxGrid } from "./VisxGrid";
import { SpectrumLines } from "./SpectrumLines";
import { VisxTooltip, useSpectrumTooltip } from "./VisxTooltip";
import { DraggableLegend } from "./DraggableLegend";
import { PeakIndicators } from "./PeakIndicators";
import { PeakCurves } from "./PeakCurves";
import { InteractivePeak } from "./InteractivePeak";
import { BrushZoom, type ZoomMode } from "./BrushZoom";
import type { CursorMode } from "./CursorModeSelector";
import { useVisxPeakInteractions } from "../hooks/useVisxPeakInteractions";
import { usePeakVisualization } from "../hooks/usePeakVisualization";
import { findClosestPoint } from "../utils/find-closest-point";

export function VisxSpectrumPlot({
  points,
  height = DEFAULT_PLOT_HEIGHT,
  energyStats,
  absorptionStats,
  referenceCurves = [],
  normalizationRegions,
  selectionTarget,
  onSelectionChange,
  peaks = [],
  selectedPeakId,
  onPeakUpdate,
  onPeakSelect,
  onPeakDelete,
  onPeakAdd,
  isManualPeakMode = false,
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

  // Process spectrum data
  const groupedTraces = useSpectrumData(
    points,
    showThetaData,
    showPhiData,
    differenceSpectra,
  );

  // Process reference and difference data
  const referenceData = useReferenceData(referenceCurves, differenceSpectra);

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
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
        Upload a spectrum CSV to preview data.
      </div>
    );
  }

  return (
    <ParentSize>
      {({ width }) => {
        if (width === 0) return null;

        return (
          <VisxSpectrumPlotWithWidth
            width={width}
            height={height}
            extents={extents}
            peakViz={peakViz}
            energyStats={energyStats}
            absorptionStats={absorptionStats}
            groupedTraces={groupedTraces.traces}
            referenceTraces={referenceData.referenceTraces}
            differenceTraces={referenceData.differenceTraces}
            allTraces={allTraces}
            isDark={isDark}
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
}

/**
 * Inner component that can call hooks - receives width as prop
 */
function VisxSpectrumPlotWithWidth({
  width,
  height,
  extents,
  peakViz,
  energyStats,
  absorptionStats,
  groupedTraces,
  referenceTraces,
  differenceTraces,
  allTraces,
  isDark,
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
  extents: ReturnType<typeof useDataExtents>;
  peakViz: ReturnType<typeof usePeakVisualization>;
  energyStats?: Parameters<typeof VisxSpectrumPlot>[0]["energyStats"];
  absorptionStats?: Parameters<typeof VisxSpectrumPlot>[0]["absorptionStats"];
  groupedTraces: TraceData[];
  referenceTraces: TraceData[];
  differenceTraces: TraceData[];
  allTraces: TraceData[];
  isDark: boolean;
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
  // Use subplot layout hook to calculate dual plot structure
  // Now called at top level of component, so hooks are fine
  const subplotLayout = useVisxSubplotLayout(
    width,
    height,
    extents,
    peakViz.hasPeakVisualization,
    peakViz.selectedGeometryPoints,
    energyStats,
    absorptionStats,
  );

  return (
    <VisxSpectrumPlotInner
      subplotLayout={subplotLayout}
      groupedTraces={groupedTraces}
      referenceTraces={referenceTraces}
      differenceTraces={differenceTraces}
      allTraces={allTraces}
      isDark={isDark}
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
  groupedTraces,
  referenceTraces,
  differenceTraces,
  allTraces,
  isDark,
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
  groupedTraces: TraceData[];
  referenceTraces: TraceData[];
  differenceTraces: TraceData[];
  allTraces: TraceData[];
  isDark: boolean;
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

  // Note: effectiveCursorMode handles selection and peak mode automatically

  const themeColors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;
  const { mainPlot, peakPlot, hasSubplot } = subplotLayout;

  // Calculate total SVG dimensions
  const totalWidth = mainPlot.dimensions.width;
  const totalHeight =
    hasSubplot && peakPlot
      ? mainPlot.dimensions.height + peakPlot.dimensions.height
      : mainPlot.dimensions.height;

  // Get original domains
  const originalXDomain = useMemo(
    () => mainPlot.xScale.domain() as [number, number],
    [mainPlot.xScale],
  );
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

      // Constrain to original domain bounds
      const constrainedMin = Math.max(originalXDomain[0], newXMin);
      const constrainedMax = Math.min(originalXDomain[1], newXMax);

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
      mainPlot.dimensions.margins,
    ],
  );

  const handlePanEnd = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
    dragCurrentRef.current = null;
  }, []);

  // Marquee zoom handler
  const handleMarqueeZoom = useCallback(
    (xDomain: [number, number], yDomain: [number, number]) => {
      setZoomedXDomain(xDomain);
      setZoomedYDomain(yDomain);
    },
    [],
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
          {/* Main plot area background */}
          <rect
            x={mainPlot.dimensions.margins.left}
            y={mainPlot.dimensions.margins.top}
            width={mainPlotWidth}
            height={mainPlotHeight}
            fill={themeColors.plot}
            pointerEvents="none"
          />
          {/* Normalization region backgrounds */}
          {normalizationRegions && (
            <>
              {normalizationRegions.pre &&
                normalizationRegions.pre[0] !== normalizationRegions.pre[1] && (
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
          {/* Plot content container */}
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
              // Only handle peak click if not dragging and in peak mode
              if (!isDragging && effectiveCursorMode === "peak") {
                handlePeakClick(
                  e as React.MouseEvent<SVGSVGElement, MouseEvent>,
                );
              }
            }}
          >
            {/* Main plot grid */}
            <VisxGrid
              scales={mainPlotScales}
              dimensions={mainPlot.dimensions}
              isDark={isDark}
            />
            {/* Plot content - scales already have zoomed domains */}
            <g>
              {/* Main plot lines - render in groups for proper z-ordering */}
              <g>
                {/* Reference traces (background) */}
                <SpectrumLines
                  traces={referenceTraces}
                  scales={mainPlotScales}
                />
                {/* Measurement traces */}
                <SpectrumLines traces={groupedTraces} scales={mainPlotScales} />
                {/* Difference traces (foreground) */}
                <SpectrumLines
                  traces={differenceTraces}
                  scales={mainPlotScales}
                />
              </g>
              {/* Peak indicators (vertical lines on main plot) */}
              <g>
                <PeakIndicators
                  peaks={peaks}
                  scales={mainPlotScales}
                  dimensions={mainPlot.dimensions}
                  selectedPeakId={selectedPeakId}
                />
              </g>
              {/* Interactive peak drag handles (on main plot) */}
              <g>
                {peaks.map((peak, peakIndex) => {
                  const peakId = peak.id ?? `peak-${peakIndex}-${peak.energy}`;
                  return (
                    <InteractivePeak
                      key={peakId}
                      peak={peak}
                      peakIndex={peakIndex}
                      scales={mainPlotScales}
                      dimensions={mainPlot.dimensions}
                      isSelected={selectedPeakId === peakId}
                      onEnergyUpdate={handlePeakEnergyUpdate}
                    />
                  );
                })}
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
              zoomMode={zoomMode}
              onZoom={handleMarqueeZoom}
              onReset={handleResetZoom}
            />
          )}
          {/* Main plot axes - only show x-axis label if no subplot (axes outside zoom container) */}
          <g transform={`translate(0, ${mainPlot.dimensions.margins.top})`}>
            <VisxAxes
              scales={mainPlotScales}
              dimensions={mainPlot.dimensions}
              isDark={isDark}
              showXAxisLabel={!hasSubplot}
            />
          </g>
        </g>

        {/* ==================== PEAK SUBPLOT ==================== */}
        {hasSubplot && peakPlot && peakPlotScales && (
          <g transform={`translate(0, ${mainPlot.dimensions.height})`}>
            {/* Peak plot area background */}
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
              pointerEvents="none"
            />
            {/* Peak plot grid */}
            <VisxGrid
              scales={peakPlotScales}
              dimensions={peakPlot.dimensions}
              isDark={isDark}
            />
            {/* Peak plot axes */}
            <g transform={`translate(0, ${peakPlot.dimensions.margins.top})`}>
              <VisxAxes
                scales={peakPlotScales}
                dimensions={peakPlot.dimensions}
                isDark={isDark}
                showXAxisLabel={true}
              />
            </g>
            {/* Selected geometry spectrum in peak plot */}
            {peakViz.selectedGeometryTrace &&
              peakViz.selectedGeometryPoints && (
                <g
                  transform={`translate(${peakPlot.dimensions.margins.left}, ${peakPlot.dimensions.margins.top})`}
                >
                  <SpectrumLines
                    traces={[peakViz.selectedGeometryTrace]}
                    scales={peakPlotScales}
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

        {/* Draggable Legend with Tool Selection */}
        <DraggableLegend
          traces={groupedTraces}
          referenceTraces={referenceTraces}
          differenceTraces={differenceTraces}
          dimensions={mainPlot.dimensions}
          isDark={isDark}
          cursorMode={effectiveCursorMode}
          onCursorModeChange={handleCursorModeChange}
          hoveredEnergy={
            tooltipData && effectiveCursorMode === "inspect"
              ? tooltipData.energy
              : null
          }
          hoveredValues={useMemo(() => {
            if (!tooltipData || effectiveCursorMode !== "inspect")
              return new Map();
            const values = new Map<string, number>();
            // Find values for all traces at the hovered energy
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
              const label =
                typeof trace.name === "string" ? trace.name : "Trace";
              const xValues = trace.x;
              const yValues = trace.y;

              if (
                Array.isArray(xValues) &&
                Array.isArray(yValues) &&
                xValues.length === yValues.length &&
                xValues.length > 0
              ) {
                // Find closest point in this trace
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

                // Only include if within threshold
                if (
                  minDistance <= threshold &&
                  typeof yValues[closestIndex] === "number"
                ) {
                  values.set(label, yValues[closestIndex]!);
                }
              }
            });
            return values;
          }, [tooltipData, effectiveCursorMode, allTraces, mainPlotScales])}
          yOffset={
            hasSubplot && peakPlot ? mainPlot.dimensions.height : undefined
          }
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

        {/* Crosshair indicator and circle rendered in SVG when tooltip is active */}
        {tooltipData && effectiveCursorMode === "inspect" && (
          <g style={{ pointerEvents: "none" }}>
            {/* Vertical crosshair line */}
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
              y2={
                mainPlot.dimensions.height - mainPlot.dimensions.margins.bottom
              }
              stroke={themeColors.text}
              strokeWidth={2}
              strokeDasharray="5,2"
              opacity={0.4}
              style={{ transition: "opacity 0.2s ease-in-out" }}
            />
            {/* Circle indicator at data point */}
            <circle
              cx={
                mainPlotScales.xScale(tooltipData.energy) +
                mainPlot.dimensions.margins.left
              }
              cy={
                mainPlotScales.yScale(tooltipData.intensity) +
                mainPlot.dimensions.margins.top
              }
              r={4}
              fill="black"
              fillOpacity={0.1}
              stroke="black"
              strokeOpacity={0.1}
              strokeWidth={2}
            />
            <circle
              cx={
                mainPlotScales.xScale(tooltipData.energy) +
                mainPlot.dimensions.margins.left
              }
              cy={
                mainPlotScales.yScale(tooltipData.intensity) +
                mainPlot.dimensions.margins.top
              }
              r={4}
              fill={themeColors.text}
              stroke="white"
              strokeWidth={2}
              opacity={0.9}
            />
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
