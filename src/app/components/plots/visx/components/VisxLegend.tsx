/**
 * Legend component for visx visualization using @visx/legend
 * Implements a beautiful horizontal legend with proper line shapes
 */

import { LegendOrdinal, LegendItem, LegendLabel } from "@visx/legend";
import { scaleOrdinal } from "@visx/scale";
import type { TraceData } from "../../core/types";
import type { PlotDimensions } from "../../core/types";
import { THEME_COLORS } from "../../core/constants";
import { useMemo } from "react";

type LegendItemData = {
  label: string;
  color: string;
  lineWidth: number;
  lineDash?: string;
};

export function VisxLegend({
  traces,
  referenceTraces,
  differenceTraces,
  dimensions,
  isDark,
  yOffset = 0,
}: {
  traces: TraceData[];
  referenceTraces: TraceData[];
  differenceTraces: TraceData[];
  dimensions: PlotDimensions;
  isDark: boolean;
  yOffset?: number;
}) {
  const themeColors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;

  // Combine all traces into legend items with metadata
  const legendItems: LegendItemData[] = useMemo(() => {
    const items: LegendItemData[] = [];

    // Add measurement traces
    traces.forEach((trace) => {
      const label = typeof trace.name === "string" ? trace.name : "Trace";
      const color =
        (trace.marker?.color as string | undefined) ??
        (trace.line?.color as string | undefined) ??
        "#666";
      const lineWidth =
        typeof trace.line?.width === "number" ? trace.line.width : 1.6;
      items.push({ label, color, lineWidth });
    });

    // Add reference traces
    referenceTraces.forEach((trace) => {
      const label = typeof trace.name === "string" ? trace.name : "Reference";
      const color = (trace.line?.color as string | undefined) ?? "#111827";
      const lineWidth =
        typeof trace.line?.width === "number" ? trace.line.width : 2.5;
      items.push({ label, color, lineWidth });
    });

    // Add difference traces
    differenceTraces.forEach((trace) => {
      const label = typeof trace.name === "string" ? trace.name : "Difference";
      const color = (trace.line?.color as string | undefined) ?? "#666";
      const lineWidth =
        typeof trace.line?.width === "number" ? trace.line.width : 2;
      const lineDash =
        typeof trace.line?.dash === "string" ? trace.line.dash : undefined;
      items.push({ label, color, lineWidth, lineDash });
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

  if (legendItems.length === 0) return null;

  // Calculate legend position (bottom center, adjusted by yOffset)
  const legendY =
    dimensions.height - dimensions.margins.bottom + 10 + (yOffset ?? 0);

  return (
    <g>
      <foreignObject
        x={0}
        y={legendY}
        width={dimensions.width}
        height={Math.max(dimensions.margins.bottom - 10, 32)}
        style={{ overflow: "visible" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "8px 0",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "12px",
          }}
        >
          <LegendOrdinal
            scale={legendScale}
            direction="row"
            itemDirection="row"
            labelMargin="0"
            shapeMargin="0 6px 0 0"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {(labels) =>
              labels.map((label, i) => {
                const item = legendItems.find((li) => li.label === label.text);
                if (!item) return null;

                return (
                  <LegendItem
                    key={`legend-item-${i}`}
                    margin="0"
                    style={{
                      display: "flex",
                      alignItems: "center",
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
                        color: label.value,
                        fontSize: "12px",
                        fontWeight: 400,
                      }}
                    >
                      {label.text}
                    </LegendLabel>
                  </LegendItem>
                );
              })
            }
          </LegendOrdinal>
        </div>
      </foreignObject>
    </g>
  );
}
