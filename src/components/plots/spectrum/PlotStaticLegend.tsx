"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import type { TraceData } from "../types";
import type { ChartThemeColors } from "../config";
import { getTraceLabel, getTraceColor } from "./utils";

const LEGEND_INSET = 12;
const LEGEND_LINE_HEIGHT = 20;
const LEGEND_SWATCH_WIDTH = 20;
const LEGEND_SWATCH_HEIGHT = 2.5;
const LEGEND_GAP = 4;
const LEGEND_FONT_SIZE = 12;
const LEGEND_FONT_FAMILY = "var(--font-sans), system-ui, sans-serif";
const LEGEND_PADDING = 8;
const TITLE_HEIGHT = 18;
const BOX_WIDTH = 88;

function uniquePhiCount(traces: TraceData[]): number {
  const phis = new Set(
    traces
      .map((t) => t.phi)
      .filter((p): p is number => typeof p === "number" && Number.isFinite(p)),
  );
  return phis.size;
}

function displayLabel(trace: TraceData, index: number, singlePhi: boolean): string {
  if (singlePhi && typeof trace.theta === "number" && Number.isFinite(trace.theta)) {
    return `${trace.theta.toFixed(1)}°`;
  }
  return getTraceLabel(trace, index);
}

type PlotStaticLegendProps = {
  traces: TraceData[];
  themeColors: ChartThemeColors;
  plotWidth: number;
  plotHeight: number;
};

export const PlotStaticLegend = memo(function PlotStaticLegend({
  traces,
  themeColors,
  plotWidth,
  plotHeight,
}: PlotStaticLegendProps) {
  const singlePhi = uniquePhiCount(traces) <= 1;
  const titleRowHeight = singlePhi ? TITLE_HEIGHT : 0;
  const boxHeight =
    LEGEND_PADDING * 2 +
    titleRowHeight +
    traces.length * LEGEND_LINE_HEIGHT +
    (traces.length > 0 ? (traces.length - 1) * LEGEND_GAP : 0);

  const defaultX = plotWidth - BOX_WIDTH - LEGEND_INSET;
  const defaultY = LEGEND_INSET;
  const [position, setPosition] = useState({ x: defaultX, y: defaultY });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
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
      const maxX = Math.max(0, plotWidth - BOX_WIDTH - LEGEND_INSET);
      const maxY = Math.max(0, plotHeight - boxHeight - LEGEND_INSET);
      setPosition({
        x: Math.max(LEGEND_INSET, Math.min(newX, maxX)),
        y: Math.max(LEGEND_INSET, Math.min(newY, maxY)),
      });
    },
    [isDragging, plotWidth, plotHeight, boxHeight],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  useEffect(() => {
    const maxX = Math.max(0, plotWidth - BOX_WIDTH - LEGEND_INSET);
    const maxY = Math.max(0, plotHeight - boxHeight - LEGEND_INSET);
    setPosition((prev) => ({
      x: Math.max(LEGEND_INSET, Math.min(prev.x, maxX)),
      y: Math.max(LEGEND_INSET, Math.min(prev.y, maxY)),
    }));
  }, [plotWidth, plotHeight, boxHeight]);

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

  if (traces.length === 0) return null;

  return (
    <g pointerEvents="all">
      <foreignObject
        x={position.x}
        y={position.y}
        width={BOX_WIDTH}
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
            borderRadius: 8,
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
                fontSize: 11,
                fontWeight: 600,
                color: themeColors.text,
                marginBottom: 4,
              }}
            >
              Theta
            </div>
          )}
          <div data-export-legend-entries style={{ display: "flex", flexDirection: "column", gap: LEGEND_GAP }}>
            {traces.map((trace, index) => {
              const label = displayLabel(trace, index, singlePhi);
              const color = getTraceColor(trace, themeColors.text);
              return (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <svg
                    width={LEGEND_SWATCH_WIDTH}
                    height={10}
                    style={{ flexShrink: 0 }}
                  >
                    <line
                      x1={0}
                      y1={5}
                      x2={LEGEND_SWATCH_WIDTH}
                      y2={5}
                      stroke={color}
                      strokeWidth={LEGEND_SWATCH_HEIGHT}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span
                    data-export-legend-label
                    style={{
                      color: themeColors.text,
                      fontWeight: 500,
                      fontSize: LEGEND_FONT_SIZE,
                    }}
                  >
                    {label}
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
