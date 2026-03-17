/**
 * Draggable legend component with integrated tool selection
 * Similar to visx area example with tooltip values next to legend handles
 */

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { LegendOrdinal, LegendItem, LegendLabel } from "@visx/legend";
import { scaleOrdinal } from "@visx/scale";
import type { TraceData, PlotDimensions } from "../types";
import { THEME_COLORS } from "../constants";
import type { ChartThemeColors } from "../hooks/useChartTheme";
import type { CursorMode } from "./CursorModeSelector";
import {
  HandRaisedIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

type LegendItemData = {
  label: string;
  scaleKey: string;
  color: string;
  lineWidth: number;
  lineDash?: string;
  trace?: TraceData;
  traceNameForHover?: string;
};

type DraggableLegendProps = {
  traces: TraceData[];
  referenceTraces: TraceData[];
  differenceTraces: TraceData[];
  dimensions: PlotDimensions;
  totalWidth?: number;
  isDark: boolean;
  themeColors?: ChartThemeColors;
  cursorMode: CursorMode;
  onCursorModeChange: (mode: CursorMode) => void;
  hoveredEnergy?: number | null;
  hoveredValues?: Map<string, number>;
  yOffset?: number;
};

const LEGEND_WIDTH = 260;
const LEGEND_MARGIN = 12;
const LEGEND_ITEM_HEIGHT = 28;
const LEGEND_HEADER_HEIGHT = 52;
const LEGEND_TITLE_HEIGHT = 24;

export function DraggableLegend({
  traces,
  referenceTraces,
  differenceTraces,
  dimensions,
  totalWidth: totalWidthProp,
  isDark,
  themeColors: themeColorsProp,
  cursorMode,
  onCursorModeChange,
  hoveredEnergy,
  hoveredValues,
  yOffset = 0,
}: DraggableLegendProps) {
  const themeColors = themeColorsProp ?? (isDark ? THEME_COLORS.dark : THEME_COLORS.light);
  const totalWidth = totalWidthProp ?? dimensions.width;
  const defaultX = Math.max(LEGEND_MARGIN, totalWidth - LEGEND_WIDTH - LEGEND_MARGIN);
  const [position, setPosition] = useState({
    x: defaultX,
    y: 10,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const uniquePhiCount = useMemo(() => {
    const phis = new Set(
      traces
        .map((t) => t.phi)
        .filter(
          (p): p is number =>
            typeof p === "number" && Number.isFinite(p),
        ),
    );
    return phis.size;
  }, [traces]);

  const singlePhi = uniquePhiCount <= 1;

  const legendItems: LegendItemData[] = useMemo(() => {
    const items: LegendItemData[] = [];

    traces.forEach((trace, idx) => {
      const name = typeof trace.name === "string" ? trace.name : `Trace ${idx}`;
      const label =
        singlePhi &&
        typeof trace.theta === "number" &&
        Number.isFinite(trace.theta)
          ? `${trace.theta.toFixed(1)}°`
          : name;
      const color =
        trace.marker?.color ??
        trace.line?.color ??
        "#666";
      const lineWidth =
        typeof trace.line?.width === "number" ? trace.line.width : 1.6;
      items.push({
        label,
        scaleKey: name,
        color,
        lineWidth,
        trace,
        traceNameForHover: name,
      });
    });

    referenceTraces.forEach((trace, idx) => {
      const name =
        typeof trace.name === "string" ? trace.name : `Reference ${idx}`;
      const color = trace.line?.color ?? "#111827";
      const lineWidth =
        typeof trace.line?.width === "number" ? trace.line.width : 2.5;
      items.push({
        label: name,
        scaleKey: name,
        color,
        lineWidth,
        trace,
        traceNameForHover: name,
      });
    });

    differenceTraces.forEach((trace, idx) => {
      const name =
        typeof trace.name === "string" ? trace.name : `Difference ${idx}`;
      const color = trace.line?.color ?? "#666";
      const lineWidth =
        typeof trace.line?.width === "number" ? trace.line.width : 2;
      const lineDash =
        typeof trace.line?.dash === "string" ? trace.line.dash : undefined;
      items.push({
        label: name,
        scaleKey: name,
        color,
        lineWidth,
        lineDash,
        trace,
        traceNameForHover: name,
      });
    });

    return items;
  }, [traces, referenceTraces, differenceTraces, singlePhi]);

  const legendScale = useMemo(
    () =>
      scaleOrdinal({
        domain: legendItems.map((item) => item.scaleKey),
        range: legendItems.map((item) => item.color),
      }),
    [legendItems],
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "BUTTON" || target.closest("button")) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(true);
      dragStartRef.current = {
        x: event.clientX - position.x,
        y: event.clientY - position.y,
      };
    },
    [position],
  );

  const legendContentHeight =
    LEGEND_HEADER_HEIGHT +
    (singlePhi ? LEGEND_TITLE_HEIGHT : 0) +
    legendItems.length * LEGEND_ITEM_HEIGHT +
    16;

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;
      const newX = event.clientX - dragStartRef.current.x;
      const newY = event.clientY - dragStartRef.current.y;
      const marginTop = 10;
      const maxX = totalWidth - LEGEND_WIDTH - LEGEND_MARGIN;
      const maxY = dimensions.height - legendContentHeight - marginTop;
      setPosition({
        x: Math.max(LEGEND_MARGIN, Math.min(newX, maxX)),
        y: Math.max(marginTop, Math.min(newY, maxY)),
      });
    },
    [isDragging, dimensions, totalWidth, legendContentHeight],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  // Attach global mouse events for dragging
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

  if (legendItems.length === 0) return null;

  return (
    <g>
      <foreignObject
        x={position.x}
        y={position.y + yOffset}
        width={LEGEND_WIDTH}
        height={legendContentHeight}
        style={{ overflow: "visible" }}
      >
        <div
          onMouseDown={handleMouseDown}
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "12px 14px",
            backgroundColor: themeColors.legendBg,
            border: `1px solid ${themeColors.legendBorder}`,
            borderRadius: "var(--radius, 8px)",
            fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
            fontSize: "14px",
            boxShadow: "var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,0.1))",
            cursor: isDragging ? "grabbing" : "move",
            userSelect: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
              paddingBottom: "10px",
              borderBottom: `1px solid ${themeColors.legendBorder}`,
              pointerEvents: "auto",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                gap: "3px",
                cursor: "grab",
                opacity: 0.5,
              }}
              title="Drag to move legend"
            >
              <div
                style={{
                  width: "3px",
                  height: "3px",
                  borderRadius: "50%",
                  backgroundColor: themeColors.text,
                }}
              />
              <div
                style={{
                  width: "3px",
                  height: "3px",
                  borderRadius: "50%",
                  backgroundColor: themeColors.text,
                }}
              />
              <div
                style={{
                  width: "3px",
                  height: "3px",
                  borderRadius: "50%",
                  backgroundColor: themeColors.text,
                }}
              />
            </div>
            {/* Tool Selection Buttons */}
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCursorModeChange("pan");
                }}
                title="Pan horizontally"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px 8px",
                  backgroundColor:
                    cursorMode === "pan" ? themeColors.plot : "transparent",
                  border: `1px solid ${
                    cursorMode === "pan" ? themeColors.text : "transparent"
                  }`,
                  borderRadius: "4px",
                  color: themeColors.text,
                  cursor: "pointer",
                  fontSize: "11px",
                  transition: "all 0.2s",
                }}
              >
                <HandRaisedIcon style={{ width: "14px", height: "14px" }} />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCursorModeChange("zoom");
                }}
                title="Zoom with brush"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px 8px",
                  backgroundColor:
                    cursorMode === "zoom" ? themeColors.plot : "transparent",
                  border: `1px solid ${
                    cursorMode === "zoom" ? themeColors.text : "transparent"
                  }`,
                  borderRadius: "4px",
                  color: themeColors.text,
                  cursor: "pointer",
                  fontSize: "11px",
                  transition: "all 0.2s",
                }}
              >
                <MagnifyingGlassIcon
                  style={{ width: "14px", height: "14px" }}
                />
              </button>
            </div>
          </div>

          {singlePhi && (
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: themeColors.text,
                marginBottom: "6px",
                pointerEvents: "auto",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              Theta
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              pointerEvents: "auto",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <LegendOrdinal
              scale={legendScale}
              direction="column"
              itemDirection="row"
              labelMargin="0"
              shapeMargin="0 6px 0 0"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                alignItems: "flex-start",
              }}
            >
              {(labels) =>
                labels.map((label, i) => {
                  const item = legendItems.find(
                    (li) => li.scaleKey === label.text,
                  );
                  if (!item) return null;

                  const hoveredValue =
                    hoveredEnergy !== null &&
                    hoveredEnergy !== undefined &&
                    hoveredValues
                      ? hoveredValues.get(
                          item.traceNameForHover ?? item.label,
                        )
                      : undefined;

                  const isHighlighted = hoveredValue !== undefined;
                  return (
                    <LegendItem
                      key={`legend-item-${i}`}
                      margin="0"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                        justifyContent: "space-between",
                        backgroundColor: isHighlighted
                          ? themeColors.hoverBg
                          : "transparent",
                        borderRadius: "6px",
                        padding: "4px 6px",
                        marginLeft: "-6px",
                        marginRight: "-6px",
                        minHeight: LEGEND_ITEM_HEIGHT - 4,
                        boxSizing: "border-box",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          flex: 1,
                        }}
                      >
                        <svg
                          width={24}
                          height={12}
                          style={{
                            display: "block",
                            flexShrink: 0,
                          }}
                        >
                          <line
                            x1={0}
                            y1={6}
                            x2={24}
                            y2={6}
                            stroke={label.value}
                            strokeWidth={item.lineWidth}
                            strokeDasharray={
                              item.lineDash === "dash" ? "4,4" : undefined
                            }
                            strokeLinecap="round"
                          />
                        </svg>
                        <LegendLabel
                          align="left"
                          margin="0 0 0 8px"
                          style={{
                            color: themeColors.text,
                            fontSize: "14px",
                            fontWeight: 400,
                          }}
                        >
                          {item.label}
                        </LegendLabel>
                      </div>
                      {hoveredValue !== undefined && (
                        <span
                          style={{
                            color: themeColors.text,
                            fontSize: "12px",
                            fontFamily: "monospace",
                            fontWeight: 600,
                            opacity: 0.8,
                            marginLeft: "8px",
                          }}
                        >
                          {hoveredValue.toFixed(4)}
                        </span>
                      )}
                    </LegendItem>
                  );
                })
              }
            </LegendOrdinal>
          </div>
        </div>
      </foreignObject>
    </g>
  );
}
