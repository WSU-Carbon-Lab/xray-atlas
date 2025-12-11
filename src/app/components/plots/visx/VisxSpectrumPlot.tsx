/**
 * Main visx spectrum plot component
 */

"use client";

import { useMemo, useCallback } from "react";
import { useTheme } from "next-themes";
import { ParentSize } from "@visx/responsive";
import type { SpectrumPlotProps, SpectrumSelection } from "../core/types";
import { DEFAULT_PLOT_HEIGHT, MARGINS } from "../core/constants";
import { useSpectrumData } from "../hooks/useSpectrumData";
import { useReferenceData } from "../hooks/useReferenceData";
import { useDataExtents } from "../hooks/useDataExtents";
import { useVisxSubplotLayout } from "../hooks/useVisxSubplotLayout";
import { VisxAxes } from "./components/VisxAxes";
import { VisxGrid } from "./components/VisxGrid";
import { SpectrumLines } from "./components/SpectrumLines";
import { VisxTooltip, useSpectrumTooltip } from "./components/VisxTooltip";
import { localPoint } from "@visx/event";
import { VisxLegend } from "./components/VisxLegend";
import { NormalizationBrush } from "./components/NormalizationBrush";
import { ZoomControls } from "./components/ZoomControls";
import { PeakIndicators } from "./components/PeakIndicators";
import { PeakCurves } from "./components/PeakCurves";
import { InteractivePeak } from "./components/InteractivePeak";
import { useVisxPeakInteractions } from "./hooks/useVisxPeakInteractions";
import { usePeakVisualization } from "../hooks/usePeakVisualization";
import { findClosestPoint } from "./utils/findClosestPoint";
import { THEME_COLORS, NORMALIZATION_COLORS } from "../core/constants";
import type { PlotDimensions, TraceData } from "../core/types";
import { useRef, memo } from "react";
import type { ScaleLinear } from "d3-scale";

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
}: SpectrumPlotProps) {
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
  onSelectionChange,
  onPeakUpdate,
  onPeakSelect,
  onPeakDelete,
  onPeakAdd,
  isManualPeakMode,
  energyStats,
  absorptionStats,
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

  const themeColors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;
  const { mainPlot, peakPlot, hasSubplot } = subplotLayout;

  // Calculate total SVG dimensions
  const totalWidth = mainPlot.dimensions.width;
  const totalHeight =
    hasSubplot && peakPlot
      ? mainPlot.dimensions.height + peakPlot.dimensions.height
      : mainPlot.dimensions.height;

  // Convert main plot scales to VisxScales format for compatibility
  const mainPlotScales = useMemo(
    () => ({
      xScale: mainPlot.xScale,
      yScale: mainPlot.yScale,
      xInvert: (pixel: number) => mainPlot.xScale.invert(pixel),
      yInvert: (pixel: number) => mainPlot.yScale.invert(pixel),
    }),
    [mainPlot.xScale, mainPlot.yScale],
  );

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
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
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
        } else {
          hideTooltip();
          return;
        }
      }

      const adjustedX = x - currentDimensions.margins.left;
      const plotWidth =
        currentDimensions.width -
        currentDimensions.margins.left -
        currentDimensions.margins.right;
      const plotHeight =
        currentDimensions.height -
        currentDimensions.margins.top -
        currentDimensions.margins.bottom;

      // Check if within plot bounds
      if (
        adjustedX < 0 ||
        adjustedX > plotWidth ||
        adjustedY < 0 ||
        adjustedY > plotHeight
      ) {
        hideTooltip();
        return;
      }

      // Invert to data coordinates
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
      svgRef,
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

  return (
    <div className="relative">
      <svg
        ref={(node) => {
          // Set both refs - tooltip container and our own ref
          if (tooltipContainerRef && "current" in tooltipContainerRef) {
            tooltipContainerRef.current = node;
          }
          svgRef.current = node;
        }}
        width={totalWidth}
        height={totalHeight}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handlePeakClick}
        style={{
          cursor: selectionTarget ? "crosshair" : undefined,
        }}
      >
        {/* Background */}
        <rect
          width={totalWidth}
          height={totalHeight}
          fill={themeColors.paper}
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
                  />
                )}
            </>
          )}
          {/* Main plot grid */}
          <VisxGrid
            scales={mainPlotScales}
            dimensions={mainPlot.dimensions}
            isDark={isDark}
          />
          {/* Main plot axes - only show x-axis label if no subplot */}
          <g transform={`translate(0, ${mainPlot.dimensions.margins.top})`}>
            <VisxAxes
              scales={mainPlotScales}
              dimensions={mainPlot.dimensions}
              isDark={isDark}
              showXAxisLabel={!hasSubplot}
            />
          </g>
          {/* Main plot lines - render in groups for proper z-ordering */}
          <g
            transform={`translate(${mainPlot.dimensions.margins.left}, ${mainPlot.dimensions.margins.top})`}
          >
            {/* Reference traces (background) */}
            <SpectrumLines traces={referenceTraces} scales={mainPlotScales} />
            {/* Measurement traces */}
            <SpectrumLines traces={groupedTraces} scales={mainPlotScales} />
            {/* Difference traces (foreground) */}
            <SpectrumLines traces={differenceTraces} scales={mainPlotScales} />
          </g>
          {/* Peak indicators (vertical lines on main plot) */}
          <g
            transform={`translate(${mainPlot.dimensions.margins.left}, ${mainPlot.dimensions.margins.top})`}
          >
            <PeakIndicators
              peaks={peaks}
              scales={mainPlotScales}
              dimensions={mainPlot.dimensions}
              selectedPeakId={selectedPeakId}
            />
          </g>
          {/* Interactive peak drag handles (on main plot) */}
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
          {/* Normalization brush (when selection target is set) */}
          {selectionTarget && peakPlotScales && (
            <NormalizationBrush
              scales={mainPlotScales}
              dimensions={mainPlot.dimensions}
              selectionTarget={selectionTarget}
              onSelectionChange={onSelectionChange}
            />
          )}
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

        {/* Legend */}
        <VisxLegend
          traces={groupedTraces}
          referenceTraces={referenceTraces}
          differenceTraces={differenceTraces}
          dimensions={mainPlot.dimensions}
          isDark={isDark}
          yOffset={
            hasSubplot && peakPlot ? mainPlot.dimensions.height : undefined
          }
        />

        {/* Zoom Controls (top right) */}
        <ZoomControls
          dimensions={mainPlot.dimensions}
          isDark={isDark}
          isZoomed={false}
        />
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
            isDark={isDark}
            TooltipInPortal={TooltipInPortal}
          />
        )}
    </div>
  );
}
