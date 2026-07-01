"use client";

import { useCallback, useId, useMemo, type RefObject } from "react";
import type { ScaleLinear } from "d3-scale";
import type { TraceData } from "../types";
import type {
  NormalizationRegionEdgeId,
  NormalizationRegions,
  SpectrumSelection,
  SpectrumYAxisQuantity,
} from "../types";
import type { OpticalLinkPlotConfig } from "../hooks/useLinkedOpticalTraces";
import type { ChartThemeColors } from "../config";
import type { OpticalLinkSplitLayoutResult } from "./useOpticalLinkSplitLayout";
import type { LinkedSpectrumGeometryLegendRow } from "./spectrum-geometry-legend-types";
import type { VisxScales } from "../hooks/useVisxScales";
import { ChartAxes } from "./ChartAxes";
import { ChartGrid } from "./ChartGrid";
import { ChartSpectrumLines } from "./ChartSpectrumLines";
import { ChartCrosshairAndDots } from "./ChartCrosshairAndDots";
import { PlotSpectrumGeometryLegend } from "./PlotSpectrumGeometryLegend";
import { InspectPinLayer } from "./InspectPinLayer";
import { PeakIndicators } from "../visx/PeakIndicators";
import { PeakOverlayLayer } from "../visx/PeakOverlayLayer";
import { BrushZoom } from "../visx/BrushZoom";
import type { ZoomMode } from "../visx/BrushZoom";
import { NormalizationBrush } from "../visx/NormalizationBrush";
import { NormalizationRegionBands } from "./NormalizationRegionBands";
import { spectrumYAxisPresentation } from "../utils/yAxisScientific";
import { getPlotChannelDefinition } from "~/features/process-nexafs/nexafs-plot-channels";
import type { OpticalLinkChannelRole } from "../hooks/useLinkedOpticalTraces";
import {
  opticalLinkSplitRoleForTrace,
  withOpticalLinkSplitPanelLineDash,
} from "../utils/optical-link-split-utils";
import type { PinnedInspectPoint } from "../types";
import type { Peak } from "../types";
import type { GraphStyle } from "../types";
import { PEAK_SELECTION_ACCENT } from "../constants";
import type { PlotDimensions } from "../types";

type CrosshairRow = {
  label: string;
  value: number | null;
  color: string;
};

export type OpticalLinkSplitSpectrumBodyProps = {
  readonly layout: OpticalLinkSplitLayoutResult;
  readonly width: number;
  readonly contentHeight: number;
  readonly imaginaryTraces: readonly TraceData[];
  readonly realTraces: readonly TraceData[];
  readonly zoomedXScale: ScaleLinear<number, number>;
  readonly imaginaryYScale: ScaleLinear<number, number>;
  readonly realYScale: ScaleLinear<number, number>;
  readonly themeColors: ChartThemeColors;
  readonly graphStyle: GraphStyle;
  readonly opticalLinkConfig: OpticalLinkPlotConfig;
  readonly legendRows: readonly LinkedSpectrumGeometryLegendRow[];
  readonly visibleTraceIds: ReadonlySet<string>;
  readonly onToggleGeometry: (geometryKey: string) => void;
  readonly geometryLegendAngleTitle: string;
  readonly geometryLegendPositionResetKey?: number;
  readonly imaginaryYAxisQuantity: SpectrumYAxisQuantity;
  readonly realYAxisQuantity: SpectrumYAxisQuantity;
  readonly pins: readonly PinnedInspectPoint[];
  readonly selectedPinId: string | null;
  readonly onSelectPin: (id: string | null) => void;
  readonly onRemovePin: (id: string) => void;
  readonly onUpdatePinEnergy: (id: string, energy: number) => void;
  readonly plotSvgRef: RefObject<SVGSVGElement | null>;
  readonly showThetaData: boolean;
  readonly showPhiData: boolean;
  readonly tooltipEnergy: number | null;
  readonly crosshairRows: readonly CrosshairRow[];
  readonly allVisibleTraces: readonly TraceData[];
  readonly effectiveCursorMode: string;
  readonly normalizationRegions?: NormalizationRegions;
  readonly selectionTarget: "pre" | "post" | null;
  readonly showNormalizationShading: boolean;
  readonly normalizationEdgeHandlesEnabled: boolean;
  readonly onNormalizationEdgeEnergyChange?: (
    edge: NormalizationRegionEdgeId,
    energy: number,
  ) => void;
  readonly onSelectionChange?: (selection: SpectrumSelection | null) => void;
  readonly isDark: boolean;
  readonly dataXBounds: [number, number];
  readonly zoomedXDomain: [number, number] | null;
  readonly onMarqueeZoom: (xDomain: [number, number], yDomain: [number, number]) => void;
  readonly onResetZoom: () => void;
  readonly peaks: readonly Peak[];
  readonly selectedPeakId: string | null;
  readonly isManualPeakMode: boolean;
  readonly onPeakSelect?: (peakId: string | null) => void;
  readonly onPeakAdd?: (energy: number) => void;
  readonly onPeakDelete?: (peakId: string) => void;
  readonly onPeakUpdate?: (peakId: string, energy: number) => void;
  readonly onPeakEnergyUpdate: (peakId: string, energy: number) => void;
  readonly getYValueAtEnergy: (energy: number) => number;
  readonly inspectPlotHitSurfaceActive: boolean;
  readonly onPlotAreaClick: (event: React.MouseEvent<SVGGElement>) => void;
  readonly onPanStart: (e: React.PointerEvent<SVGGElement>) => void;
  readonly onPanMove: (e: React.PointerEvent<SVGGElement>) => void;
  readonly onPanEnd: (e: React.PointerEvent<SVGGElement>) => void;
  readonly panGroupRef: RefObject<SVGGElement | null>;
  readonly panOverlayRef: RefObject<SVGGElement | null>;
};

function plotInnerSize(dimensions: PlotDimensions) {
  return {
    width:
      dimensions.width -
      dimensions.margins.left -
      dimensions.margins.right,
    height:
      dimensions.height -
      dimensions.margins.top -
      dimensions.margins.bottom,
  };
}

function scalesForPanel(
  xScale: ScaleLinear<number, number>,
  yScale: ScaleLinear<number, number>,
): VisxScales {
  return {
    xScale,
    yScale,
    xInvert: (pixel: number) => xScale.invert(pixel),
    yInvert: (pixel: number) => yScale.invert(pixel),
  };
}

/**
 * Renders stacked imaginary (top) and real (bottom) spectrum panels with shared x-zoom and
 * unified inspect pins / crosshair at one energy.
 */
export function OpticalLinkSplitSpectrumBody({
  layout,
  width,
  contentHeight,
  imaginaryTraces,
  realTraces,
  zoomedXScale,
  imaginaryYScale,
  realYScale,
  themeColors,
  graphStyle,
  opticalLinkConfig,
  legendRows,
  visibleTraceIds,
  onToggleGeometry,
  geometryLegendAngleTitle,
  geometryLegendPositionResetKey,
  imaginaryYAxisQuantity,
  realYAxisQuantity,
  pins,
  selectedPinId,
  onSelectPin,
  onRemovePin,
  onUpdatePinEnergy,
  plotSvgRef,
  showThetaData,
  showPhiData,
  tooltipEnergy,
  crosshairRows,
  allVisibleTraces,
  effectiveCursorMode,
  normalizationRegions,
  selectionTarget,
  showNormalizationShading,
  normalizationEdgeHandlesEnabled: _normalizationEdgeHandlesEnabled,
  onNormalizationEdgeEnergyChange: _onNormalizationEdgeEnergyChange,
  onSelectionChange,
  isDark,
  dataXBounds: _dataXBounds,
  zoomedXDomain,
  onMarqueeZoom,
  onResetZoom,
  peaks,
  selectedPeakId,
  isManualPeakMode,
  onPeakSelect,
  onPeakAdd,
  onPeakDelete,
  onPeakUpdate,
  onPeakEnergyUpdate,
  getYValueAtEnergy,
  inspectPlotHitSurfaceActive,
  onPlotAreaClick,
  onPanStart,
  onPanMove,
  onPanEnd,
  panGroupRef,
  panOverlayRef,
}: OpticalLinkSplitSpectrumBodyProps) {
  const { imaginaryPlot, realPlot } = layout;
  const imaginaryInner = plotInnerSize(imaginaryPlot.dimensions);
  const realInner = plotInnerSize(realPlot.dimensions);
  const imaginaryScales = useMemo(
    () => scalesForPanel(zoomedXScale, imaginaryYScale),
    [zoomedXScale, imaginaryYScale],
  );
  const realScales = useMemo(
    () => scalesForPanel(zoomedXScale, realYScale),
    [zoomedXScale, realYScale],
  );

  const imaginaryYAxis = useMemo(() => {
    const domain = imaginaryYScale.domain() as [number, number];
    return spectrumYAxisPresentation(
      imaginaryYAxisQuantity,
      domain[0] ?? 0,
      domain[1] ?? 0,
    );
  }, [imaginaryYAxisQuantity, imaginaryYScale]);

  const realYAxis = useMemo(() => {
    const domain = realYScale.domain() as [number, number];
    return spectrumYAxisPresentation(
      realYAxisQuantity,
      domain[0] ?? 0,
      domain[1] ?? 0,
    );
  }, [realYAxisQuantity, realYScale]);

  const imaginaryClipId = useId();
  const realClipId = useId();

  const realPanelOffsetY =
    imaginaryPlot.dimensions.height +
    realPlot.dimensions.margins.top -
    imaginaryPlot.dimensions.margins.top;

  const imaginaryPanelTraces = useMemo(
    () => withOpticalLinkSplitPanelLineDash(imaginaryTraces, "imaginary"),
    [imaginaryTraces],
  );

  const realPanelTraces = useMemo(
    () => withOpticalLinkSplitPanelLineDash(realTraces, "real"),
    [realTraces],
  );

  const crosshairDotsForRole = useCallback(
    (role: "imaginary" | "real") => {
      const out: { value: number; color: string }[] = [];
      allVisibleTraces.forEach((trace, i) => {
        const row = crosshairRows[i];
        if (row?.value == null) {
          return;
        }
        if (opticalLinkSplitRoleForTrace(trace, opticalLinkConfig) !== role) {
          return;
        }
        out.push({ value: row.value, color: row.color });
      });
      return out;
    },
    [allVisibleTraces, crosshairRows, opticalLinkConfig],
  );

  const imaginaryCrosshairDots = useMemo(
    () => crosshairDotsForRole("imaginary"),
    [crosshairDotsForRole],
  );

  const realCrosshairDots = useMemo(
    () => crosshairDotsForRole("real"),
    [crosshairDotsForRole],
  );

  const stackedPlotSpan =
    realPanelOffsetY + realInner.height;
  const zoomMode: ZoomMode = "horizontal";

  const pinStemTop = imaginaryPlot.dimensions.margins.top;
  const pinStemBottom =
    imaginaryPlot.dimensions.height + realPlot.dimensions.height -
    realPlot.dimensions.margins.bottom;

  return (
    <>
      <defs>
        <clipPath id={imaginaryClipId}>
          <rect x={0} y={0} width={imaginaryInner.width} height={imaginaryInner.height} />
        </clipPath>
        <clipPath id={realClipId}>
          <rect x={0} y={0} width={realInner.width} height={realInner.height} />
        </clipPath>
      </defs>

      <g transform={`translate(0, 0)`}>
        <rect
          data-export-plot-background
          x={imaginaryPlot.dimensions.margins.left}
          y={imaginaryPlot.dimensions.margins.top}
          width={imaginaryInner.width}
          height={imaginaryInner.height}
          fill={themeColors.plot}
        />
        <rect
          data-export-plot-background
          x={realPlot.dimensions.margins.left}
          y={imaginaryPlot.dimensions.height + realPlot.dimensions.margins.top}
          width={realInner.width}
          height={realInner.height}
          fill={themeColors.plot}
        />

        <g
          transform={`translate(${imaginaryPlot.dimensions.margins.left}, ${imaginaryPlot.dimensions.margins.top})`}
        >
          <ChartGrid
            scales={imaginaryScales}
            dimensions={imaginaryPlot.dimensions}
            themeColors={themeColors}
          />
        </g>
        <g
          transform={`translate(${realPlot.dimensions.margins.left}, ${realPlot.dimensions.height + realPlot.dimensions.margins.top})`}
        >
          <ChartGrid
            scales={realScales}
            dimensions={realPlot.dimensions}
            themeColors={themeColors}
          />
        </g>

        {normalizationRegions &&
          (selectionTarget !== null || showNormalizationShading) ? (
            <NormalizationRegionBands
              normalizationRegions={normalizationRegions}
              xScale={imaginaryScales.xScale}
              offsetX={imaginaryPlot.dimensions.margins.left}
              offsetY={imaginaryPlot.dimensions.margins.top}
              height={stackedPlotSpan}
            />
          ) : null}

        <g
          ref={panGroupRef}
          transform={`translate(${imaginaryPlot.dimensions.margins.left}, ${imaginaryPlot.dimensions.margins.top})`}
          style={{
            cursor:
              effectiveCursorMode === "zoom"
                ? "crosshair"
                : effectiveCursorMode === "pan"
                  ? "grab"
                  : "default",
          }}
          onPointerDown={onPanStart}
          onPointerMove={onPanMove}
          onPointerUp={onPanEnd}
          onPointerLeave={onPanEnd}
          onClick={onPlotAreaClick}
        >
          <g clipPath={`url(#${imaginaryClipId})`}>
            <rect
              width={imaginaryInner.width}
              height={imaginaryInner.height}
              fill="transparent"
              style={{
                pointerEvents: inspectPlotHitSurfaceActive ? "all" : "none",
              }}
            />
            {imaginaryYAxisQuantity === "delta" && (
              <line
                x1={0}
                x2={imaginaryInner.width}
                y1={imaginaryScales.yScale(0)}
                y2={imaginaryScales.yScale(0)}
                stroke={themeColors.axis}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            )}
            <ChartSpectrumLines
              traces={[...imaginaryPanelTraces]}
              scales={imaginaryScales}
              graphStyle={graphStyle}
              idPrefix="imaginary"
            />
            <PeakIndicators
              peaks={[...peaks]}
              scales={imaginaryScales}
              dimensions={imaginaryPlot.dimensions}
              selectedPeakId={selectedPeakId}
              variant={isManualPeakMode ? "peak-edit" : "default"}
            />
            {isManualPeakMode && (
              <PeakOverlayLayer
                isActive
                peaks={[...peaks]}
                scales={imaginaryScales}
                dimensions={imaginaryPlot.dimensions}
                selectedPeakId={selectedPeakId}
                isManualPeakMode
                onPeakSelect={onPeakSelect}
                onPeakAdd={onPeakAdd}
                onPeakDelete={onPeakDelete}
                onPeakUpdate={onPeakUpdate}
                onPeakEnergyUpdate={onPeakEnergyUpdate}
                plotRef={plotSvgRef}
                getYValueAtEnergy={getYValueAtEnergy}
              />
            )}
            <InspectPinLayer
              slot="svg"
              pins={[...pins]}
              selectedPinId={selectedPinId}
              visibleTraces={[...imaginaryPanelTraces]}
              scales={imaginaryScales}
              dimensions={imaginaryPlot.dimensions}
              themeColors={themeColors}
              plotSvgRef={plotSvgRef}
              onSelectPin={onSelectPin}
              onRemovePin={onRemovePin}
              onUpdatePinEnergy={onUpdatePinEnergy}
              overlayWidth={width}
              overlayHeight={contentHeight}
              showThetaData={showThetaData}
              showPhiData={showPhiData}
              linkedImaginaryGlyph={opticalLinkConfig.imaginaryGlyph}
              linkedRealGlyph={opticalLinkConfig.realGlyph}
              suppressPinStem
            />
          </g>
          <g
            transform={`translate(0, ${realPanelOffsetY})`}
            clipPath={`url(#${realClipId})`}
          >
            <rect
              width={realInner.width}
              height={realInner.height}
              fill="transparent"
              style={{
                pointerEvents: inspectPlotHitSurfaceActive ? "all" : "none",
              }}
            />
            {realYAxisQuantity === "delta" && (
              <line
                x1={0}
                x2={realInner.width}
                y1={realScales.yScale(0)}
                y2={realScales.yScale(0)}
                stroke={themeColors.axis}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            )}
            <ChartSpectrumLines
              traces={[...realPanelTraces]}
              scales={realScales}
              graphStyle={graphStyle}
              idPrefix="real"
            />
            <InspectPinLayer
              slot="svg"
              pins={[...pins]}
              selectedPinId={selectedPinId}
              visibleTraces={[...realPanelTraces]}
              scales={realScales}
              dimensions={realPlot.dimensions}
              themeColors={themeColors}
              plotSvgRef={plotSvgRef}
              onSelectPin={onSelectPin}
              onRemovePin={onRemovePin}
              onUpdatePinEnergy={onUpdatePinEnergy}
              overlayWidth={width}
              overlayHeight={contentHeight}
              showThetaData={showThetaData}
              showPhiData={showPhiData}
              linkedImaginaryGlyph={opticalLinkConfig.imaginaryGlyph}
              linkedRealGlyph={opticalLinkConfig.realGlyph}
              suppressPinStem
            />
          </g>
        </g>

        {pins.map((pin) => {
          const gripActive = selectedPinId === pin.id;
          const xGlobal =
            imaginaryPlot.dimensions.margins.left +
            zoomedXScale(pin.energy);
          const crosshairColor = themeColors.crosshair ?? themeColors.text;
          return (
            <line
              key={`split-pin-stem-${pin.id}`}
              x1={xGlobal}
              y1={pinStemTop}
              x2={xGlobal}
              y2={pinStemBottom}
              stroke={gripActive ? PEAK_SELECTION_ACCENT : crosshairColor}
              strokeWidth={gripActive ? 1.5 : 1.25}
              strokeDasharray={gripActive ? undefined : "5,4"}
              opacity={gripActive ? 0.85 : 0.6}
              pointerEvents="none"
            />
          );
        })}

        {selectionTarget && onSelectionChange && (
          <NormalizationBrush
            xScale={imaginaryScales.xScale}
            yScale={imaginaryScales.yScale}
            dimensions={{
              ...imaginaryPlot.dimensions,
              height:
                imaginaryPlot.dimensions.height + realPlot.dimensions.height,
              margins: {
                ...imaginaryPlot.dimensions.margins,
                bottom: realPlot.dimensions.margins.bottom,
              },
            }}
            selectionTarget={selectionTarget}
            onSelectionChange={onSelectionChange}
            isDark={isDark}
            themeColors={themeColors}
          />
        )}

        {effectiveCursorMode === "zoom" && !selectionTarget && (
          <BrushZoom
            xScale={imaginaryScales.xScale}
            yScale={imaginaryScales.yScale}
            dimensions={{
              ...imaginaryPlot.dimensions,
              height:
                imaginaryPlot.dimensions.height + realPlot.dimensions.height,
              margins: {
                ...imaginaryPlot.dimensions.margins,
                bottom: realPlot.dimensions.margins.bottom,
              },
            }}
            isDark={isDark}
            themeColors={themeColors}
            zoomMode={zoomMode}
            onZoom={onMarqueeZoom}
            onReset={onResetZoom}
            xAxisGutterHeight={realPlot.dimensions.margins.bottom}
          />
        )}

        {effectiveCursorMode === "pan" && zoomedXDomain != null && (
          <g
            ref={panOverlayRef}
            transform={`translate(${imaginaryPlot.dimensions.margins.left}, ${imaginaryPlot.dimensions.margins.top})`}
            style={{ cursor: "grab" }}
            onPointerDown={onPanStart}
            onPointerMove={onPanMove}
            onPointerUp={onPanEnd}
            onPointerLeave={onPanEnd}
          >
            <rect
              x={0}
              y={0}
              width={imaginaryInner.width}
              height={imaginaryInner.height}
              fill="transparent"
              pointerEvents="all"
            />
            <rect
              x={0}
              y={realPanelOffsetY}
              width={realInner.width}
              height={realInner.height}
              fill="transparent"
              pointerEvents="all"
            />
          </g>
        )}

        <ChartAxes
          scales={imaginaryScales}
          dimensions={imaginaryPlot.dimensions}
          themeColors={themeColors}
          showXAxisLabel={false}
          yAxisLabel={imaginaryYAxis.label}
          yTickFormat={(v) => imaginaryYAxis.tickFormat(Number(v))}
        />
        <g transform={`translate(0, ${imaginaryPlot.dimensions.height})`}>
          <ChartAxes
            scales={realScales}
            dimensions={realPlot.dimensions}
            themeColors={themeColors}
            showXAxisLabel
            yAxisLabel={realYAxis.label}
            yTickFormat={(v) => realYAxis.tickFormat(Number(v))}
          />
        </g>

        {tooltipEnergy != null && effectiveCursorMode === "inspect" && (
          <>
            <ChartCrosshairAndDots
              energy={tooltipEnergy}
              dots={imaginaryCrosshairDots}
              xScale={imaginaryScales.xScale}
              yScale={imaginaryScales.yScale}
              dimensions={imaginaryPlot.dimensions}
              themeColors={themeColors}
            />
            <g transform={`translate(0, ${imaginaryPlot.dimensions.height})`}>
              <ChartCrosshairAndDots
                energy={tooltipEnergy}
                dots={realCrosshairDots}
                xScale={realScales.xScale}
                yScale={realScales.yScale}
                dimensions={realPlot.dimensions}
                themeColors={themeColors}
              />
            </g>
          </>
        )}

        <g
          transform={`translate(${imaginaryPlot.dimensions.margins.left}, ${imaginaryPlot.dimensions.margins.top})`}
        >
          <PlotSpectrumGeometryLegend
            mode="linked"
            rows={[...legendRows]}
            visibleTraceIds={new Set(visibleTraceIds)}
            onToggleGeometry={onToggleGeometry}
            themeColors={themeColors}
            plotWidth={imaginaryInner.width}
            plotHeight={imaginaryInner.height + realInner.height}
            plotSvgRef={plotSvgRef}
            plotMarginLeft={imaginaryPlot.dimensions.margins.left}
            plotMarginTop={imaginaryPlot.dimensions.margins.top}
            positionResetKey={geometryLegendPositionResetKey}
            graphStyle={graphStyle}
            imaginaryColumnGlyph={opticalLinkConfig.imaginaryGlyph}
            realColumnGlyph={opticalLinkConfig.realGlyph}
            angleColumnTitle={geometryLegendAngleTitle}
          />
        </g>
      </g>
    </>
  );
}

export function yAxisQuantityForOpticalRole(
  role: OpticalLinkChannelRole,
): SpectrumYAxisQuantity {
  return getPlotChannelDefinition(role).yAxisQuantity;
}
