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
import { PLOT_CONFIG, useChartThemeFromCSS } from "../config";
import { useSubplotLayout } from "./useSubplotLayout";
import { ChartAxes } from "./ChartAxes";
import { ChartGrid } from "./ChartGrid";
import { ChartSpectrumLines } from "./ChartSpectrumLines";
import { PlotToolbar } from "./PlotToolbar";
import { PlotStaticLegend } from "./PlotStaticLegend";
import { ExportPlotModal } from "./ExportPlotModal";
import { ChartCrosshairAndDots } from "./ChartCrosshairAndDots";
import {
  getValueAtEnergy,
  getTraceLabel,
  getTraceColor,
} from "./utils";
import { PeakPlotAnnotations } from "./PeakPlotAnnotations";
import { NormalizationBrush } from "../visx/NormalizationBrush";
import { PeakIndicators } from "../visx/PeakIndicators";
import { PeakCurves } from "../visx/PeakCurves";
import { PeakOverlayLayer } from "../visx/PeakOverlayLayer";
import { BrushZoom } from "../visx/BrushZoom";
import type { ZoomMode } from "../visx/BrushZoom";
import { NORMALIZATION_COLORS } from "../constants";
import { PlotToolRail } from "./PlotToolRail";

type SpectrumPlotInnerProps = SpectrumPlotProps & {
  width: number;
  height: number;
  cursorMode?: "pan" | "zoom" | "select" | "peak" | "inspect";
  onCursorModeChange?: (
    mode: "pan" | "zoom" | "select" | "peak" | "inspect",
  ) => void;
};

function buildTraceIds(traces: TraceData[]): string[] {
  return traces.map((t, i) =>
    typeof t.name === "string" ? t.name : `trace-${i}`,
  );
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
  showThetaData = false,
  showPhiData = false,
  selectedGeometry = null,
  headerRight,
  cursorMode: externalCursorMode,
  onCursorModeChange,
}: SpectrumPlotInnerProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const themeColors = useChartThemeFromCSS();
  const svgRef = useRef<SVGSVGElement>(null);

  const groupedTraces = useSpectrumData(
    points,
    showThetaData,
    showPhiData,
    differenceSpectra,
    isDark,
  );
  const referenceData = useReferenceData(
    referenceCurves,
    differenceSpectra,
    isDark,
  );
  const peakViz = usePeakVisualization(
    points,
    peaks,
    selectedPeakId ?? null,
    selectedGeometry,
  );
  const extents = useDataExtents(points, differenceSpectra);

  const allTraces = useMemo(
    () => [
      ...groupedTraces.traces,
      ...referenceData.referenceTraces,
      ...referenceData.differenceTraces,
    ],
    [
      groupedTraces.traces,
      referenceData.referenceTraces,
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
      const id = typeof t.name === "string" ? t.name : `trace-${i}`;
      if (typeof t.name === "string" && /bare\s*atom/i.test(t.name))
        return true;
      return visibleTraceIds.has(id);
    });
  }, [allTraces, visibleTraceIds]);

  const toggleTrace = useCallback(
    (id: string) => {
      setVisibleTraceIds((prev) => {
        const next = new Set(prev.size === 0 ? allTraceIds : prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [allTraceIds],
  );

  const contentHeight = height - PLOT_CONFIG.overviewGap;
  const subplotLayout = useSubplotLayout(
    width,
    contentHeight,
    extents,
    peakViz.hasPeakVisualization,
    peakViz.selectedGeometryPoints,
    energyStats,
    absorptionStats,
  );

  const { mainPlot, peakPlot, hasSubplot } = subplotLayout;
  const dataXBounds = useMemo((): [number, number] => {
    if (extents.energyExtent) {
      const { min, max } = extents.energyExtent;
      return [min, max];
    }
    const d = mainPlot.xScale.domain();
    return [d[0] ?? 0, d[1] ?? 1000];
  }, [extents.energyExtent, mainPlot.xScale]);

  const [zoomedXDomain, setZoomedXDomain] = useState<[number, number] | null>(
    null,
  );
  const [zoomedYDomain, setZoomedYDomain] = useState<[number, number] | null>(
    null,
  );

  const visibleYDomain = useMemo((): [number, number] => {
    const raw =
      zoomedYDomain ?? (mainPlot.yScale.domain() as [number, number]);
    const a = raw[0] ?? 0;
    const b = raw[1] ?? 0;
    return [Math.min(a, b), Math.max(a, b)];
  }, [zoomedYDomain, mainPlot.yScale]);

  const yAxisPrimary = useMemo(() => {
    const q: SpectrumYAxisQuantity = yAxisQuantity ?? "intensity";
    return spectrumYAxisPresentation(q, visibleYDomain[0], visibleYDomain[1]);
  }, [yAxisQuantity, visibleYDomain]);

  const zoomedXScale = useMemo(() => {
    const domain =
      zoomedXDomain ?? (mainPlot.xScale.domain() as [number, number]);
    return mainPlot.xScale.copy().domain(domain);
  }, [mainPlot.xScale, zoomedXDomain]);

  const zoomedYScale = useMemo(() => {
    const domain =
      zoomedYDomain ?? (mainPlot.yScale.domain() as [number, number]);
    return mainPlot.yScale.copy().domain(domain);
  }, [mainPlot.yScale, zoomedYDomain]);

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

  const clampDomainToMinSpan = useCallback(
    (domain: [number, number]): [number, number] => {
      const [a, b] = domain;
      const span = b - a;
      if (span >= minZoomSpan) return domain;
      const center = (a + b) / 2;
      const half = minZoomSpan / 2;
      return [
        Math.max(dataXBounds[0], center - half),
        Math.min(dataXBounds[1], center + half),
      ];
    },
    [dataXBounds, minZoomSpan],
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
    (xDomain: [number, number], _yDomain: [number, number]) => {
      setZoomedXDomain(clampDomainToMinSpan(xDomain));
    },
    [clampDomainToMinSpan],
  );

  const handleResetZoom = useCallback(() => {
    setZoomedXDomain(null);
    setZoomedYDomain(null);
  }, []);

  const selectionTarget =
    plotContext?.kind === "normalize" ? plotContext.target : null;
  const isManualPeakMode = plotContext?.kind === "peak-edit";

  const cursorMode = externalCursorMode ?? "inspect";
  const effectiveCursorMode =
    selectionTarget != null
      ? "select"
      : cursorMode === "pan" && zoomedXDomain == null
        ? "inspect"
        : cursorMode;

  const handleCursorModeChange = useCallback(
    (mode: "pan" | "zoom" | "select" | "peak" | "inspect") => {
      onCursorModeChange?.(mode);
    },
    [onCursorModeChange],
  );

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
      const x = e.clientX - svgRect.left - mainPlot.dimensions.margins.left;
      const plotWidth =
        mainPlot.dimensions.width -
        mainPlot.dimensions.margins.left -
        mainPlot.dimensions.margins.right;
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
      const closest = findClosestPoint(energy, visibleTraces, threshold);
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
      mainPlot.dimensions.margins.left,
      mainPlot.dimensions.width,
      mainPlot.dimensions.margins.right,
    ],
  );

  const handleMouseLeave = useCallback(() => {
    tooltip.hideTooltip();
  }, [tooltip]);

  const getYValueAtEnergy = useCallback(
    (energy: number): number => {
      const trace = visibleTraces[0];
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
    mainPlot.dimensions.height -
    mainPlot.dimensions.margins.top -
    mainPlot.dimensions.margins.bottom;

  const mainPlotWidth =
    mainPlot.dimensions.width -
    mainPlot.dimensions.margins.left -
    mainPlot.dimensions.margins.right;

  const [isPanDragging, setIsPanDragging] = useState(false);
  const panStartRef = useRef<{ x: number } | null>(null);
  const panStartDomainRef = useRef<[number, number] | null>(null);
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
      if (effectiveCursorMode !== "pan" || zoomedXDomain == null) return;
      if (e.button !== 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x >= 0 && x <= mainPlotWidth) {
        panStartRef.current = { x };
        panStartDomainRef.current = zoomedXDomain;
        setIsPanDragging(true);
        e.currentTarget.style.cursor = "grabbing";
        svgRef.current?.classList.add(PAN_DRAG_CLASS);
        document.body.classList.add(PAN_DRAG_CLASS);
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    },
    [effectiveCursorMode, zoomedXDomain, mainPlotWidth],
  );

  const applyPanFromDelta = useCallback(
    (totalDeltaX: number) => {
      const start = panStartRef.current;
      const startDomain = panStartDomainRef.current;
      if (!start || !startDomain) return;
      const domainWidth = startDomain[1] - startDomain[0];
      const pixelToDataRatio = domainWidth / mainPlotWidth;
      const dataDelta = -totalDeltaX * pixelToDataRatio;
      const newXMin = startDomain[0] + dataDelta;
      const newXMax = startDomain[1] + dataDelta;
      const constrainedMin = Math.max(dataXBounds[0], newXMin);
      const constrainedMax = Math.min(dataXBounds[1], newXMax);
      if (constrainedMin < constrainedMax)
        setZoomedXDomain([constrainedMin, constrainedMax]);
    },
    [dataXBounds, mainPlotWidth],
  );

  const handlePanMove = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      if (!panStartRef.current) return;
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const plotX = e.clientX - rect.left;
      const totalDeltaX = plotX - panStartRef.current.x;
      applyPanFromDelta(totalDeltaX);
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
      panStartDomainRef.current = null;
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
      const plotX = e.clientX - rect.left - mainPlot.dimensions.margins.left;
      const totalDeltaX = plotX - panStartRef.current.x;
      applyPanFromDelta(totalDeltaX);
    };
    const onUp = () => {
      clearPanDragCursor();
      panStartRef.current = null;
      panStartDomainRef.current = null;
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
    mainPlot.dimensions.margins.left,
    clearPanDragCursor,
  ]);

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
      className="flex w-full flex-col gap-2 overflow-hidden rounded-xl"
      ref={containerRef}
    >
      <div className="relative">
        <svg
          ref={svgRef}
          width={width}
          height={contentHeight}
          className="overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
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
            {normalizationRegions && selectionTarget && (
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
            >
              <g clipPath={`url(#${plotClipId})`}>
                <ChartSpectrumLines
                  traces={visibleTraces}
                  scales={mainPlotScales}
                  graphStyle={graphStyle}
                  idPrefix="main"
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
              />
            )}
            {effectiveCursorMode === "pan" && zoomedXDomain != null && (
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
            <g
              transform={`translate(${mainPlot.dimensions.margins.left}, ${mainPlot.dimensions.margins.top})`}
            >
              <PlotStaticLegend
                traces={allTraces}
                visibleTraceIds={visibleTraceIds}
                onToggleTrace={toggleTrace}
                themeColors={themeColors}
                plotWidth={mainPlotWidth}
                plotHeight={mainPlotHeight}
              />
            </g>
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
          </g>

          {hasSubplot && peakPlot && (
            <g transform={`translate(0, ${mainPlot.dimensions.height})`}>
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
        <div
          style={{
            position: "absolute",
            left: mainPlot.dimensions.margins.left,
            top: mainPlot.dimensions.margins.top,
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          <PlotToolRail
            plotWidth={mainPlotWidth}
            plotHeight={mainPlotHeight}
            currentMode={effectiveCursorMode}
            isCursorDisabled={plotContext?.kind === "normalize"}
            isPanDisabled={zoomedXDomain == null}
            onCursorModeChange={handleCursorModeChange}
            onResetZoom={handleResetZoom}
            onExportClick={() => setExportModalOpen(true)}
            dataViewTabs={headerRight}
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
