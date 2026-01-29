/**
 * Draggable legend component with integrated tool selection
 * Similar to visx area example with tooltip values next to legend handles
 */

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { LegendOrdinal, LegendItem, LegendLabel } from "@visx/legend";
import { scaleOrdinal } from "@visx/scale";
import type { TraceData, PlotDimensions } from "../types";
import { THEME_COLORS } from "../constants";
import type { CursorMode } from "./CursorModeSelector";
import {
  HandRaisedIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

type LegendItemData = {
  label: string;
  color: string;
  lineWidth: number;
  lineDash?: string;
  trace?: TraceData;
};

type DraggableLegendProps = {
  traces: TraceData[];
  referenceTraces: TraceData[];
  differenceTraces: TraceData[];
  dimensions: PlotDimensions;
  isDark: boolean;
  cursorMode: CursorMode;
  onCursorModeChange: (mode: CursorMode) => void;
  hoveredEnergy?: number | null;
  hoveredValues?: Map<string, number>;
  yOffset?: number;
};

export function DraggableLegend({
  traces,
  referenceTraces,
  differenceTraces,
  dimensions,
  isDark,
  cursorMode,
  onCursorModeChange,
  hoveredEnergy,
  hoveredValues,
  yOffset = 0,
}: DraggableLegendProps) {
  const themeColors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;
  const [position, setPosition] = useState({
    x: dimensions.width - 200,
    y: 10,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Combine all traces into legend items with metadata
  const legendItems: LegendItemData[] = useMemo(() => {
    const items: LegendItemData[] = [];

    // Add measurement traces
    traces.forEach((trace) => {
      const label = typeof trace.name === "string" ? trace.name : "Trace";
      const color =
        trace.marker?.color ??
        trace.line?.color ??
        "#666";
      const lineWidth =
        typeof trace.line?.width === "number" ? trace.line.width : 1.6;
      items.push({ label, color, lineWidth, trace });
    });

    // Add reference traces
    referenceTraces.forEach((trace) => {
      const label = typeof trace.name === "string" ? trace.name : "Reference";
      const color = trace.line?.color ?? "#111827";
      const lineWidth =
        typeof trace.line?.width === "number" ? trace.line.width : 2.5;
      items.push({ label, color, lineWidth, trace });
    });

    // Add difference traces
    differenceTraces.forEach((trace) => {
      const label = typeof trace.name === "string" ? trace.name : "Difference";
      const color = trace.line?.color ?? "#666";
      const lineWidth =
        typeof trace.line?.width === "number" ? trace.line.width : 2;
      const lineDash =
        typeof trace.line?.dash === "string" ? trace.line.dash : undefined;
      items.push({ label, color, lineWidth, lineDash, trace });
    });

    return items;
  }, [traces, referenceTraces, differenceTraces]);

  // Create ordinal scale for legend
  const legendScale = useMemo(
    () =>
      scaleOrdinal({
        domain: legendItems.map((item) => item.label),
        range: legendItems.map((item) => item.color),
      }),
    [legendItems],
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      // Only start dragging if clicking on the header area (not on buttons or legend items)
      const target = event.target as HTMLElement;
      if (
        target.tagName === "BUTTON" ||
        target.closest("button") ||
        target.closest('[role="listitem"]') ||
        target.closest('[role="list"]')
      ) {
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

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;
      const newX = event.clientX - dragStartRef.current.x;
      const newY = event.clientY - dragStartRef.current.y;

      // Constrain to plot bounds
      const maxX = dimensions.width - 200;
      const maxY = dimensions.height - (legendItems.length * 24 + 100);
      setPosition({
        x: Math.max(10, Math.min(newX, maxX)),
        y: Math.max(10, Math.min(newY, maxY)),
      });
    },
    [isDragging, dimensions, legendItems.length],
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
        width={200}
        height={legendItems.length * 24 + 60}
        style={{ overflow: "visible" }}
      >
        <div
          onMouseDown={handleMouseDown}
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "8px 10px",
            backgroundColor: themeColors.legendBg,
            border: `1px solid ${themeColors.legendBorder}`,
            borderRadius: "8px",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "12px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
            cursor: isDragging ? "grabbing" : "grab",
            userSelect: "none",
          }}
        >
          {/* Drag Handle and Tool Selection */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
              paddingBottom: "8px",
              borderBottom: `1px solid ${themeColors.legendBorder}`,
              pointerEvents: "auto",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div
              style={{
                display: "flex",
                gap: "2px",
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

          {/* Legend Items */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
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
                    (li) => li.label === label.text,
                  );
                  if (!item) return null;

                  const hoveredValue =
                    hoveredEnergy !== null &&
                    hoveredEnergy !== undefined &&
                    hoveredValues
                      ? hoveredValues.get(item.label)
                      : undefined;

                  return (
                    <LegendItem
                      key={`legend-item-${i}`}
                      margin="0"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                        justifyContent: "space-between",
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
                          width={20}
                          height={10}
                          style={{
                            display: "block",
                            flexShrink: 0,
                          }}
                        >
                          <line
                            x1={0}
                            y1={5}
                            x2={20}
                            y2={5}
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
                          margin="0 0 0 6px"
                          style={{
                            color: themeColors.text,
                            fontSize: "12px",
                            fontWeight: 400,
                          }}
                        >
                          {label.text}
                        </LegendLabel>
                      </div>
                      {/* Hovered value display */}
                      {hoveredValue !== undefined && (
                        <span
                          style={{
                            color: themeColors.text,
                            fontSize: "11px",
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
