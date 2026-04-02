"use client";

import { memo, useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { TraceData } from "../types";
import type { ChartThemeColors } from "../config";
import { buildLegendCoreModel } from "./legend-core";

const LEGEND_INSET = 12;
const LEGEND_LINE_HEIGHT = 22;
const LEGEND_GAP = 4;
const LEGEND_ENTRY_SWATCH_SIZE = 14;
const LEGEND_ENTRY_TEXT_GAP = 6;
const LEGEND_FONT_SIZE = 13;
const LEGEND_FONT_FAMILY = "var(--font-sans), system-ui, sans-serif";
const LEGEND_PADDING = 8;
const TITLE_HEIGHT = 18;

function isBareAtomTrace(trace: TraceData): boolean {
  if (typeof trace.name !== "string") return false;
  return /bare\s*atom/i.test(trace.name);
}

function isLegendTrace(trace: TraceData): boolean {
  if (trace.showlegend === false) return false;
  if (isBareAtomTrace(trace)) return false;
  return true;
}

type PlotStaticLegendProps = {
  traces: TraceData[];
  visibleTraceIds: Set<string>;
  onToggleTrace: (id: string) => void;
  themeColors: ChartThemeColors;
  plotWidth: number;
  plotHeight: number;
  legendBorderRadius?: number;
  legendColumns?: number;
};

export const PlotStaticLegend = memo(function PlotStaticLegend({
  traces,
  visibleTraceIds,
  onToggleTrace,
  themeColors,
  plotWidth,
  plotHeight,
  legendBorderRadius = 8,
  legendColumns = 1,
}: PlotStaticLegendProps) {
  const filteredTraces = traces.filter(isLegendTrace);

  const { entries, singlePhi } = buildLegendCoreModel({
    traces: filteredTraces,
    themeColors,
    columns: legendColumns,
    padding: LEGEND_PADDING,
    borderRadius: legendBorderRadius,
  });
  const titleRowHeight = singlePhi ? TITLE_HEIGHT : 0;
  const boxHeight =
    LEGEND_PADDING * 2 +
    titleRowHeight +
    entries.length * LEGEND_LINE_HEIGHT +
    (entries.length > 0 ? (entries.length - 1) * LEGEND_GAP : 0);

  const availableWidth = Math.max(0, plotWidth - LEGEND_INSET * 2);

  const legendLayout = useMemo(() => {
    if (availableWidth <= 0) return { legendWidth: 0, columnWidths: [] as number[] };
    if (entries.length === 0) return { legendWidth: 0, columnWidths: [] as number[] };

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const measure = (text: string) => {
      if (!ctx) return 0;
      ctx.font = `${LEGEND_FONT_SIZE}px system-ui`;
      return ctx.measureText(text).width;
    };

    const columns = Math.max(1, legendColumns);
    const colWidths = new Array<number>(columns).fill(0);

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      const col = i % columns;
      const textWidth = measure(entry.label);
      const itemWidth = LEGEND_ENTRY_SWATCH_SIZE + LEGEND_ENTRY_TEXT_GAP + textWidth;
      colWidths[col] = Math.max(colWidths[col] ?? 0, itemWidth);
    }

    const contentWidth =
      LEGEND_PADDING * 2 +
      colWidths.reduce((sum, w) => sum + w, 0) +
      LEGEND_GAP * (columns - 1);

    return {
      legendWidth: Math.min(availableWidth, Math.max(0, Math.ceil(contentWidth))),
      columnWidths: colWidths,
    };
  }, [availableWidth, entries, legendColumns]);

  const legendWidth = legendLayout.legendWidth;
  const columnWidths = legendLayout.columnWidths;

  const defaultX = plotWidth - legendWidth - LEGEND_INSET;
  const defaultY = LEGEND_INSET;

  const shouldRender = entries.length > 0 && legendWidth > 0;

  const [position, setPosition] = useState({ x: defaultX, y: defaultY });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-legend-toggle="true"]')) return;
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
      if (!isDragging || !dragStartRef.current) return;
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

  if (!shouldRender) return null;

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
            display: "flex",
            flexDirection: "column",
            padding: LEGEND_PADDING,
            backgroundColor: themeColors.paper,
            border: `1px solid ${themeColors.axis}`,
            borderRadius: legendBorderRadius,
            boxSizing: "border-box",
            width: "100%",
            height: "100%",
            opacity: 0.95,
            fontFamily: LEGEND_FONT_FAMILY,
            fontSize: LEGEND_FONT_SIZE,
          }}
        >
          {singlePhi && (
            <div
              data-export-legend-title
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: themeColors.text,
                marginBottom: 4,
              }}
            >
              Theta
            </div>
          )}
          <div
            data-export-legend-entries
            style={{
              display: "grid",
              gridTemplateColumns:
                columnWidths.length > 0
                  ? columnWidths.map((w) => `${Math.max(0, Math.ceil(w))}px`).join(" ")
                  : `repeat(${legendColumns}, minmax(0, 1fr))`,
              gap: LEGEND_GAP,
              alignItems: "start",
            }}
          >
            {entries.map((entry) => {
              const isVisible =
                visibleTraceIds.size === 0 || visibleTraceIds.has(entry.id);

              return (
                <button
                  key={entry.id}
                  type="button"
                  data-legend-toggle="true"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => onToggleTrace(entry.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 0,
                    padding: 0,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: themeColors.text,
                    fontFamily: LEGEND_FONT_FAMILY,
                    fontSize: LEGEND_FONT_SIZE,
                    textAlign: "left",
                    outline: "none",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      border: `1px solid ${entry.color}`,
                      backgroundColor: isVisible ? entry.color : "transparent",
                      flexShrink: 0,
                      opacity: isVisible ? 1 : 0.7,
                    }}
                  />
                  <span
                    data-export-legend-label
                    style={{
                      color: themeColors.text,
                      fontWeight: 500,
                      fontSize: LEGEND_FONT_SIZE,
                      minWidth: 0,
                      whiteSpace: "normal",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                      opacity: isVisible ? 1 : 0.65,
                    }}
                  >
                    {entry.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </foreignObject>
    </g>
  );
});
