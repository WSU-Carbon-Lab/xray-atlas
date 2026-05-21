"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tooltip } from "@heroui/react";
import type { ChartThemeColors } from "../config";
import { plotToolbarTooltipContentClass } from "../toolbars";
import type { GraphStyle } from "../types";
import { LEGEND_SWATCH_WIDTH, LegendSwatch } from "./LegendSwatch";
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
  angleColumnTitle: string;
  graphStyle?: GraphStyle;
  legendBorderRadius?: number;
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
  } = props;

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

  const [position, setPosition] = useState({ x: defaultX, y: defaultY });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-legend-toggle="true"]')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [position],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) {
        return;
      }
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      const maxX = Math.max(0, plotWidth - legendWidth - LEGEND_INSET);
      const maxY = Math.max(0, plotHeight - boxHeight - LEGEND_INSET);
      setPosition({
        x: Math.max(LEGEND_INSET, Math.min(newX, maxX)),
        y: Math.max(LEGEND_INSET, Math.min(newY, maxY)),
      });
    },
    [isDragging, plotWidth, plotHeight, boxHeight, legendWidth],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  useEffect(() => {
    const maxX = Math.max(0, plotWidth - legendWidth - LEGEND_INSET);
    const maxY = Math.max(0, plotHeight - boxHeight - LEGEND_INSET);
    setPosition((prev) => ({
      x: Math.max(LEGEND_INSET, Math.min(prev.x, maxX)),
      y: Math.max(LEGEND_INSET, Math.min(prev.y, maxY)),
    }));
  }, [plotWidth, plotHeight, boxHeight, legendWidth]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!shouldRender) {
    return null;
  }

  return (
    <g pointerEvents="all">
      <foreignObject
        x={position.x}
        y={position.y}
        width={legendWidth}
        height={boxHeight}
        style={{ overflow: "visible" }}
      >
        <div
          data-export-legend-container
          onMouseDown={handleMouseDown}
          style={{
            cursor: isDragging ? "grabbing" : "move",
            userSelect: "none",
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
                    onMouseDown={(e) => e.stopPropagation()}
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
