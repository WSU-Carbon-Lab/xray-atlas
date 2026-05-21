"use client";

import { memo, useCallback, useMemo, useRef, type RefObject } from "react";
import type { ChartThemeColors } from "../config";
import type { GraphStyle } from "../types";
import { LEGEND_SWATCH_WIDTH, LegendSwatch } from "./LegendSwatch";
import { useDraggablePlotLegendPosition } from "./use-draggable-plot-legend-position";
import type {
  LinkedSpectrumGeometryLegendRow,
  SingleSpectrumGeometryLegendRow,
} from "./spectrum-geometry-legend-types";

const LEGEND_INSET = 12;
const LEGEND_GAP = 4;
const LEGEND_PADDING = 8;
const LEGEND_BORDER_PX = 1;
const LEGEND_HEADER_FONT_SIZE = 11;
const LEGEND_HEADER_MARGIN_BOTTOM = 6;
const LEGEND_HEADER_BLOCK_HEIGHT =
  LEGEND_HEADER_FONT_SIZE + LEGEND_HEADER_MARGIN_BOTTOM;
const LEGEND_ROW_HEIGHT = 14;
const LEGEND_FONT_SIZE = 13;
const LEGEND_FONT_FAMILY = "var(--font-sans), system-ui, sans-serif";

type PlotSpectrumGeometryLegendPropsBase = {
  visibleTraceIds: Set<string>;
  onToggleGeometry: (geometryKey: string) => void;
  themeColors: ChartThemeColors;
  plotWidth: number;
  plotHeight: number;
  plotSvgRef?: RefObject<SVGSVGElement | null>;
  plotMarginLeft?: number;
  plotMarginTop?: number;
  angleColumnTitle: string;
  graphStyle?: GraphStyle;
  legendBorderRadius?: number;
  /** When this key changes (e.g. zoom reset), the legend snaps back to its default corner. */
  positionResetKey?: string | number;
};

export type PlotSpectrumGeometryLegendLinkedProps =
  PlotSpectrumGeometryLegendPropsBase & {
    mode: "linked";
    rows: LinkedSpectrumGeometryLegendRow[];
    imaginaryColumnGlyph: string;
    realColumnGlyph: string;
  };

export type PlotSpectrumGeometryLegendSingleProps =
  PlotSpectrumGeometryLegendPropsBase & {
    mode: "single";
    rows: SingleSpectrumGeometryLegendRow[];
    channelColumnGlyph: string;
  };

export type PlotSpectrumGeometryLegendProps =
  | PlotSpectrumGeometryLegendLinkedProps
  | PlotSpectrumGeometryLegendSingleProps;

function computeLegendBoxHeight(rowCount: number): number {
  const rowGaps = rowCount > 0 ? (rowCount - 1) * LEGEND_GAP : 0;
  const panelHeight =
    LEGEND_PADDING * 2 +
    LEGEND_HEADER_BLOCK_HEIGHT +
    rowCount * LEGEND_ROW_HEIGHT +
    rowGaps;
  return panelHeight + LEGEND_BORDER_PX * 2;
}

function isSwatchToggleTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest("[data-legend-swatch-toggle]") !== null
  );
}

/**
 * In-plot geometry legend: linked mode shows imaginary/real columns plus angle;
 * single mode shows one channel column plus angle. Drag anywhere except swatch
 * controls; swatches toggle geometry visibility.
 */
export const PlotSpectrumGeometryLegend = memo(function PlotSpectrumGeometryLegend(
  props: PlotSpectrumGeometryLegendProps,
) {
  const {
    visibleTraceIds,
    onToggleGeometry,
    themeColors,
    plotWidth,
    plotHeight,
    angleColumnTitle,
    graphStyle = "line",
    legendBorderRadius = 8,
    plotSvgRef: plotSvgRefProp,
    plotMarginLeft = 0,
    plotMarginTop = 0,
    positionResetKey,
  } = props;

  const legendGroupSvgRef = useRef<SVGSVGElement | null>(null);
  const setLegendGroupRef = useCallback((node: SVGGElement | null) => {
    legendGroupSvgRef.current = node?.ownerSVGElement ?? null;
  }, []);
  const plotSvgRef = plotSvgRefProp ?? legendGroupSvgRef;

  const isLinked = props.mode === "linked";
  const rows = props.rows;
  const linkedAreaBandLegend = isLinked && graphStyle === "area";
  const swatchColumnCount = linkedAreaBandLegend ? 1 : isLinked ? 2 : 1;
  const gridTemplateColumns = linkedAreaBandLegend
    ? `${LEGEND_SWATCH_WIDTH}px 1fr`
    : isLinked
      ? `${LEGEND_SWATCH_WIDTH}px ${LEGEND_SWATCH_WIDTH}px 1fr`
      : `${LEGEND_SWATCH_WIDTH}px 1fr`;

  const headerGlyphs = useMemo(() => {
    if (isLinked) {
      return {
        col1: props.imaginaryColumnGlyph,
        col2: props.realColumnGlyph,
      };
    }
    return { col1: props.channelColumnGlyph, col2: null as string | null };
  }, [isLinked, props]);

  const boxHeight = computeLegendBoxHeight(rows.length);

  const legendWidth = useMemo(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const measure = (text: string) => {
      if (!ctx) return 0;
      ctx.font = `600 12px system-ui`;
      return ctx.measureText(text).width;
    };
    const headerWidth = isLinked
      ? Math.max(measure(headerGlyphs.col1), measure(headerGlyphs.col2 ?? ""))
      : measure(headerGlyphs.col1);
    const angleWidths = rows.map((r) => measure(r.angleLabel));
    const maxAngle = angleWidths.length > 0 ? Math.max(...angleWidths) : 40;
    return Math.min(
      plotWidth - LEGEND_INSET * 2,
      LEGEND_PADDING * 2 +
        LEGEND_SWATCH_WIDTH * swatchColumnCount +
        headerWidth +
        maxAngle +
        24,
    );
  }, [plotWidth, rows, headerGlyphs, isLinked, swatchColumnCount]);

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

  const isRowVisible = useCallback(
    (row: LinkedSpectrumGeometryLegendRow | SingleSpectrumGeometryLegendRow) => {
      if (visibleTraceIds.size === 0) {
        return true;
      }
      if (isLinked) {
        const linked = row as LinkedSpectrumGeometryLegendRow;
        return (
          visibleTraceIds.has(linked.imaginaryTraceId) &&
          visibleTraceIds.has(linked.realTraceId)
        );
      }
      const single = row as SingleSpectrumGeometryLegendRow;
      return visibleTraceIds.has(single.traceId);
    },
    [visibleTraceIds, isLinked],
  );

  if (!shouldRender) {
    return null;
  }

  const swatchToggleGridColumn = linkedAreaBandLegend
    ? "1 / span 1"
    : isLinked
      ? "1 / span 2"
      : "1 / span 1";

  const legendCursor = isDragging ? "grabbing" : "move";

  const panelX = position.x + LEGEND_BORDER_PX;
  const panelY = position.y + LEGEND_BORDER_PX;
  const panelWidth = Math.max(0, legendWidth - LEGEND_BORDER_PX * 2);
  const panelHeight = Math.max(0, boxHeight - LEGEND_BORDER_PX * 2);

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
          data-export-legend-container
          data-legend-drag-handle="true"
          onPointerDownCapture={handleLegendSurfacePointerDownCapture}
          onPointerMove={handleLegendPointerMove}
          onPointerUp={handleLegendPointerUp}
          onPointerCancel={handleLegendPointerCancel}
          style={{
            boxSizing: "border-box",
            width: "100%",
            height: panelHeight,
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
            {linkedAreaBandLegend ? (
              <span style={{ textAlign: "center" }}>
                {headerGlyphs.col1}
                <span style={{ opacity: 0.55, margin: "0 2px" }}>|</span>
                {headerGlyphs.col2}
              </span>
            ) : (
              <>
                <span style={{ textAlign: "center" }}>{headerGlyphs.col1}</span>
                {isLinked ? (
                  <span style={{ textAlign: "center" }}>{headerGlyphs.col2}</span>
                ) : null}
              </>
            )}
            <span style={{ textAlign: "right", paddingRight: 2 }}>
              {angleColumnTitle}
            </span>
          </div>
          <div
            data-export-legend-entries
            style={{
              display: "flex",
              flexDirection: "column",
              gap: LEGEND_GAP,
            }}
          >
            {rows.map((row) => {
              const visible = isRowVisible(row);
              const toggleHint = visible
                ? `Hide ${angleColumnTitle} ${row.angleLabel}`
                : `Show ${angleColumnTitle} ${row.angleLabel}`;
              return (
                <div
                  key={row.geometryKey}
                  style={{
                    display: "grid",
                    gridTemplateColumns,
                    gap: LEGEND_GAP,
                    alignItems: "center",
                    minHeight: LEGEND_ROW_HEIGHT,
                  }}
                >
                  <button
                    type="button"
                    data-legend-swatch-toggle="true"
                    title={toggleHint}
                    aria-label={toggleHint}
                    aria-pressed={visible}
                    onClick={() => {
                      if (consumeLegendToggleClick()) return;
                      onToggleGeometry(row.geometryKey);
                    }}
                    style={{
                      gridColumn: swatchToggleGridColumn,
                      display: "inline-flex",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: LEGEND_GAP,
                      padding: 0,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      opacity: visible ? 1 : 0.55,
                    }}
                  >
                    {isLinked ? (
                      linkedAreaBandLegend ? (
                        <LegendSwatch
                          color={row.color}
                          variant="band"
                          graphStyle={graphStyle}
                          bandLineVariants={{
                            top: (row as LinkedSpectrumGeometryLegendRow)
                              .imaginaryLineDash,
                            bottom: (row as LinkedSpectrumGeometryLegendRow)
                              .realLineDash,
                          }}
                        />
                      ) : (
                        <>
                          <LegendSwatch
                            color={row.color}
                            variant={
                              (row as LinkedSpectrumGeometryLegendRow)
                                .imaginaryLineDash
                            }
                            graphStyle={graphStyle}
                            markerShape="circle"
                          />
                          <LegendSwatch
                            color={row.color}
                            variant={
                              (row as LinkedSpectrumGeometryLegendRow)
                                .realLineDash
                            }
                            graphStyle={graphStyle}
                            markerShape="square"
                          />
                        </>
                      )
                    ) : (
                      <LegendSwatch
                        color={row.color}
                        variant={
                          (row as SingleSpectrumGeometryLegendRow).lineDash
                        }
                        graphStyle={graphStyle}
                      />
                    )}
                  </button>
                  <span
                    data-export-legend-label
                    style={{
                      textAlign: "right",
                      fontWeight: 500,
                      fontSize: LEGEND_FONT_SIZE,
                      lineHeight: 1,
                      paddingRight: 2,
                      color: themeColors.text,
                      opacity: visible ? 1 : 0.55,
                    }}
                  >
                    {row.angleLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </foreignObject>
    </g>
  );
});
