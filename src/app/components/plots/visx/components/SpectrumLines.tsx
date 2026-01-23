/**
 * Line rendering component for spectrum traces
 */

import { memo } from "react";
import { LinePath } from "@visx/shape";
import { curveLinear } from "@visx/curve";
import type { TraceData } from "../../core/types";
import type { VisxScales } from "../../hooks/useVisxScales";

export const SpectrumLines = memo(function SpectrumLines({
  traces,
  scales,
}: {
  traces: TraceData[];
  scales: VisxScales;
}) {
  if (!scales || traces.length === 0) return null;

  return (
    <g>
      {traces.map((trace, index) => {
        // Convert TraceData to point array
        const xValues = trace.x;
        const yValues = trace.y;

        if (
          !Array.isArray(xValues) ||
          !Array.isArray(yValues) ||
          xValues.length !== yValues.length
        ) {
          return null;
        }

        const points = xValues
          .map((x, i) => {
            const y = yValues[i];
            if (
              typeof x === "number" &&
              typeof y === "number" &&
              Number.isFinite(x) &&
              Number.isFinite(y)
            ) {
              return { x, y };
            }
            return null;
          })
          .filter((point): point is { x: number; y: number } => point !== null);

        // Get color from trace
        const color =
          trace.marker?.color ??
          trace.line?.color ??
          "#666";

        // Get line width
        const lineWidth =
          typeof trace.line?.width === "number" ? trace.line.width : 1.6;

        // Check if markers should be shown
        const hasMarkers = trace.mode?.includes("markers") ?? false;
        const markerSize =
          typeof trace.marker?.size === "number" ? trace.marker.size : 4;
        const markerOpacity =
          typeof trace.marker?.opacity === "number"
            ? trace.marker.opacity
            : 0.7;

        return (
          <g key={`trace-${index}`}>
            {/* Line path */}
            <LinePath
              data={points}
              x={(d) => scales.xScale(d.x)}
              y={(d) => scales.yScale(d.y)}
              stroke={color}
              strokeWidth={lineWidth}
              curve={curveLinear}
            />
            {/* Markers */}
            {hasMarkers &&
              points.map((point, pointIndex) => (
                <circle
                  key={`marker-${index}-${pointIndex}`}
                  cx={scales.xScale(point.x)}
                  cy={scales.yScale(point.y)}
                  r={markerSize / 2}
                  fill={color}
                  opacity={markerOpacity}
                />
              ))}
          </g>
        );
      })}
    </g>
  );
});
