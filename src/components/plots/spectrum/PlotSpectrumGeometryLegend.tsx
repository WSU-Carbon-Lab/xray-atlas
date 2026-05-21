"use client";

import { memo, useCallback, useMemo, useRef, type RefObject } from "react";
import { Tooltip } from "@heroui/react";
import type { ChartThemeColors } from "../config";
import { plotToolbarTooltipContentClass } from "../toolbars";
import type { GraphStyle } from "../types";
import { LEGEND_SWATCH_WIDTH, LegendSwatch } from "./LegendSwatch";
import { useDraggablePlotLegendPosition } from "./use-draggable-plot-legend-position";
import type {
  LinkedSpectrumGeometryLegendRow,
  SingleSpectrumGeometryLegendRow,
} from "./spectrum-geometry-legend-types";

const LEGEND_INSET = 12;
const LEGEND_ROW_HEIGHT = 24;
const LEGEND_GAP = 4;
const LEGEND_PADDING = 8;
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

/**
 * In-plot geometry legend: linked mode shows imaginary/real columns plus angle;
 * single mode shows one channel column plus angle. Swatches follow graphStyle.
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

  const headerHeight = 20;
  const boxHeight =
    LEGEND_PADDING * 2 +
    headerHeight +
    rows.length * LEGEND_ROW_HEIGHT +
    (rows.length > 0 ? (rows.length - 1) * LEGEND_GAP : 0);

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
  }, [
    plotWidth,
    rows,
    headerGlyphs,
    isLinked,
    swatchColumnCount,
  ]);

  const defaultX = plotWidth - legendWidth - LEGEND_INSET;
  const defaultY = LEGEND_INSET;
  const shouldRender = rows.length > 0 && legendWidth > 0;

  const {
    position,
    isDragging,
    handleContainerPointerDown,
    handleContainerPointerMove,
    handleContainerPointerUp,
    handleContainerPointerCancel,
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

  return (
    <g ref={setLegendGroupRef} pointerEvents="all">
      <foreignObject
        x={position.x}
        y={position.y}
        width={legendWidth}
        height={boxHeight}
        style={{ overflow: "visible", pointerEvents: "all" }}
      >
        <div
          data-export-legend-container
          data-legend-drag-handle="true"
          onPointerDown={handleContainerPointerDown}
          onPointerMove={handleContainerPointerMove}
          onPointerUp={handleContainerPointerUp}
          onPointerCancel={handleContainerPointerCancel}
          style={{
            cursor: isDragging ? "grabbing" : "move",
            userSelect: "none",
            touchAction: "none",
            padding: LEGEND_PADDING,
            backgroundColor: themeColors.paper,
            border: `1px solid ${themeColors.axis}`,
            borderRadius: legendBorderRadius,
            boxSizing: "border-box",
            width: "100%",
            fontFamily: LEGEND_FONT_FAMILY,
            fontSize: LEGEND_FONT_SIZE,
            opacity: 0.95,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns,
              gap: LEGEND_GAP,
              alignItems: "center",
              marginBottom: 6,
              color: themeColors.text,
              fontSize: 11,
              fontWeight: 600,
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
                <Tooltip key={row.geometryKey} delay={0}>
                  <button
                    type="button"
                    data-legend-toggle="true"
                    aria-label={toggleHint}
                    aria-pressed={visible}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onToggleGeometry(row.geometryKey)}
                    style={{
                      display: "grid",
                      gridTemplateColumns,
                      gap: LEGEND_GAP,
                      alignItems: "center",
                      width: "100%",
                      padding: 0,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: themeColors.text,
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
                    <span
                      data-export-legend-label
                      style={{
                        textAlign: "right",
                        fontWeight: 500,
                        fontSize: LEGEND_FONT_SIZE,
                        paddingRight: 2,
                      }}
                    >
                      {row.angleLabel}
                    </span>
                  </button>
                  <Tooltip.Content
                    placement="left"
                    className={plotToolbarTooltipContentClass}
                  >
                    {toggleHint}
                  </Tooltip.Content>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </foreignObject>
    </g>
  );
});
