"use client";

import {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { ChartThemeColors } from "../config";
import type {
  DescriptorTraceLegendColumn,
  DescriptorTraceLegendRow,
  DescriptorTraceLegendSwatch,
} from "../types";
import { resolveTraceLegendSwatchPresentation } from "~/features/dashboard/plot-viewer/trace-legend-swatch-props";
import { LEGEND_SWATCH_WIDTH, LegendSwatch } from "./LegendSwatch";
import { useDraggablePlotLegendPosition } from "./use-draggable-plot-legend-position";
import {
  LEGEND_BORDER_PX,
  LEGEND_FONT_FAMILY,
  LEGEND_FONT_SIZE,
  LEGEND_GAP,
  LEGEND_HEADER_FONT_SIZE,
  LEGEND_HEADER_MARGIN_BOTTOM,
  LEGEND_PADDING,
  LEGEND_ROW_HEIGHT,
} from "./spectrum-geometry-legend-layout";
import {
  computeDescriptorTraceLegendBoxHeight,
  computeDescriptorTraceLegendWidth,
  descriptorTraceLegendGridTemplateColumns,
  geometryLegendPanelDimensions,
  LEGEND_INSET,
} from "./descriptor-trace-legend-layout";

function isSwatchToggleTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest("[data-legend-swatch-toggle]") !== null
  );
}

function DescriptorLegendSwatch({ swatch }: { swatch: DescriptorTraceLegendSwatch }) {
  const presentation = resolveTraceLegendSwatchPresentation(swatch);
  return (
    <LegendSwatch
      color={presentation.color}
      variant={presentation.variant}
      graphStyle={presentation.graphStyle}
      markerShape={presentation.markerShape}
      markerOnLine={presentation.markerOnLine}
    />
  );
}

export type PlotDescriptorTraceLegendProps = {
  rows: readonly DescriptorTraceLegendRow[];
  columns: readonly DescriptorTraceLegendColumn[];
  channelColumnTitle: string;
  hiddenTraceIds: readonly string[];
  onToggleTrace: (traceKey: string) => void;
  themeColors: ChartThemeColors;
  plotWidth: number;
  plotHeight: number;
  plotSvgRef?: RefObject<SVGSVGElement | null>;
  plotMarginLeft?: number;
  plotMarginTop?: number;
  legendBorderRadius?: number;
  positionResetKey?: string | number;
};

/**
 * Draggable in-plot N-column trace legend (channel plus descriptor columns) for multi-trace compare views.
 */
export const PlotDescriptorTraceLegend = memo(function PlotDescriptorTraceLegend({
  rows,
  columns,
  channelColumnTitle,
  hiddenTraceIds,
  onToggleTrace,
  themeColors,
  plotWidth,
  plotHeight,
  plotSvgRef: plotSvgRefProp,
  plotMarginLeft = 0,
  plotMarginTop = 0,
  legendBorderRadius = 8,
  positionResetKey,
}: PlotDescriptorTraceLegendProps) {
  const legendGroupSvgRef = useRef<SVGSVGElement | null>(null);
  const legendPanelRef = useRef<HTMLDivElement | null>(null);
  const setLegendGroupRef = useCallback((node: SVGGElement | null) => {
    legendGroupSvgRef.current = node?.ownerSVGElement ?? null;
  }, []);
  const plotSvgRef = plotSvgRefProp ?? legendGroupSvgRef;

  const gridTemplateColumns = descriptorTraceLegendGridTemplateColumns(columns.length);

  const estimatedBoxHeight = computeDescriptorTraceLegendBoxHeight(rows.length);
  const estimatedLegendWidth = useMemo(
    () =>
      computeDescriptorTraceLegendWidth({
        plotWidth,
        channelColumnTitle,
        columns,
        rows,
      }),
    [plotWidth, channelColumnTitle, columns, rows],
  );

  const [measuredBoxSize, setMeasuredBoxSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const legendWidth = measuredBoxSize?.width ?? estimatedLegendWidth;
  const boxHeight = measuredBoxSize?.height ?? estimatedBoxHeight;
  const { panelWidth, panelHeight } = geometryLegendPanelDimensions(
    legendWidth,
    boxHeight,
  );

  useLayoutEffect(() => {
    const panel = legendPanelRef.current;
    if (!panel) {
      return;
    }

    const syncMeasuredSize = () => {
      const contentWidth = Math.ceil(panel.scrollWidth);
      const contentHeight = Math.ceil(panel.scrollHeight);
      const minBoxWidth = estimatedLegendWidth;
      const nextWidth = Math.min(
        Math.max(0, plotWidth - LEGEND_INSET * 2),
        Math.max(minBoxWidth, contentWidth + LEGEND_BORDER_PX * 2),
      );
      const nextHeight = contentHeight + LEGEND_BORDER_PX * 2;
      setMeasuredBoxSize((previous) => {
        if (
          previous !== null &&
          previous.width === nextWidth &&
          previous.height === nextHeight
        ) {
          return previous;
        }
        return { width: nextWidth, height: nextHeight };
      });
    };

    syncMeasuredSize();
    const observer = new ResizeObserver(syncMeasuredSize);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [plotWidth, estimatedLegendWidth, rows, channelColumnTitle, columns]);

  const defaultX = plotWidth - legendWidth - LEGEND_INSET;
  const defaultY = LEGEND_INSET;
  const shouldRender = rows.length > 0 && legendWidth > 0;

  const {
    position,
    isDragging,
    consumeLegendToggleClick,
    handleLegendPointerDown,
    handleLegendPointerMove,
    handleLegendPointerUp,
    handleLegendPointerCancel,
  } = useDraggablePlotLegendPosition({
    plotWidth,
    plotHeight,
    boxHeight,
    legendWidth,
    defaultX,
    defaultY,
    plotSvgRef,
    plotMarginLeft,
    plotMarginTop,
    positionResetKey,
    inset: LEGEND_INSET,
  });

  const handleLegendSurfacePointerDownCapture = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (isSwatchToggleTarget(event.target)) {
        return;
      }
      handleLegendPointerDown(event);
    },
    [handleLegendPointerDown],
  );

  if (!shouldRender) {
    return null;
  }

  const hidden = new Set(hiddenTraceIds);
  const legendCursor = isDragging ? "grabbing" : "move";
  const panelX = position.x + LEGEND_BORDER_PX;
  const panelY = position.y + LEGEND_BORDER_PX;

  return (
    <g ref={setLegendGroupRef} pointerEvents="all">
      <rect
        x={position.x}
        y={position.y}
        width={legendWidth}
        height={boxHeight}
        rx={legendBorderRadius}
        ry={legendBorderRadius}
        fill={themeColors.paper}
        fillOpacity={0.95}
        stroke={themeColors.axis}
        strokeWidth={LEGEND_BORDER_PX}
        pointerEvents="none"
      />
      <foreignObject
        x={panelX}
        y={panelY}
        width={panelWidth}
        height={panelHeight}
        style={{ overflow: "visible", pointerEvents: "all" }}
      >
        <div
          ref={legendPanelRef}
          data-export-legend-container
          data-legend-drag-handle="true"
          onPointerDownCapture={handleLegendSurfacePointerDownCapture}
          onPointerMove={handleLegendPointerMove}
          onPointerUp={handleLegendPointerUp}
          onPointerCancel={handleLegendPointerCancel}
          style={{
            boxSizing: "border-box",
            width: "100%",
            padding: LEGEND_PADDING,
            backgroundColor: "transparent",
            borderRadius: Math.max(0, legendBorderRadius - LEGEND_BORDER_PX),
            fontFamily: LEGEND_FONT_FAMILY,
            fontSize: LEGEND_FONT_SIZE,
            userSelect: "none",
            touchAction: "none",
            cursor: legendCursor,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns,
              gap: LEGEND_GAP,
              alignItems: "center",
              marginBottom: LEGEND_HEADER_MARGIN_BOTTOM,
              color: themeColors.text,
              fontSize: LEGEND_HEADER_FONT_SIZE,
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            <span style={{ textAlign: "left" }}>
              {channelColumnTitle}
            </span>
            {columns.map((column) => (
              <span key={column.id} style={{ textAlign: "left", paddingRight: 2 }}>
                {column.title}
              </span>
            ))}
          </div>
          <div
            data-export-legend-entries
            data-export-legend-layout="descriptor-trace-rows"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: LEGEND_GAP,
            }}
          >
            {rows.map((row) => {
              const visible = !hidden.has(row.traceKey);
              const toggleHint = visible
                ? `Hide trace ${row.traceKey}`
                : `Show trace ${row.traceKey}`;
              return (
                <div
                  key={row.traceKey}
                  style={{
                    display: "grid",
                    gridTemplateColumns,
                    gap: LEGEND_GAP,
                    alignItems: "center",
                    minHeight: LEGEND_ROW_HEIGHT,
                    opacity: visible ? 1 : 0.55,
                  }}
                >
                  <button
                    type="button"
                    data-legend-swatch-toggle="true"
                    title={toggleHint}
                    aria-label={toggleHint}
                    aria-pressed={visible}
                    onClick={() => {
                      if (consumeLegendToggleClick()) {
                        return;
                      }
                      onToggleTrace(row.traceKey);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: LEGEND_SWATCH_WIDTH,
                      padding: 0,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <DescriptorLegendSwatch swatch={row.swatch} />
                  </button>
                  {columns.map((column) => (
                    <span
                      key={`${row.traceKey}:${column.id}`}
                      style={{
                        textAlign: "left",
                        fontSize: LEGEND_FONT_SIZE,
                        lineHeight: 1,
                        color: themeColors.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "14rem",
                      }}
                    >
                      {row.cells[column.id] ?? "—"}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </foreignObject>
    </g>
  );
});
