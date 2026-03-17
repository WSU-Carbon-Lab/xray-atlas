/**
 * Trace rendering for spectrum plot: line, scatter, or area
 */

import { memo } from "react";
import { LinePath, AreaClosed } from "@visx/shape";
import { curveLinear } from "@visx/curve";
import type { TraceData } from "../types";
import type { VisxScales } from "../hooks/useVisxScales";
import type { GraphStyle } from "../types";

const defaultIdPrefix = "area";

export const SpectrumLines = memo(function SpectrumLines({
  traces,
  scales,
  graphStyle = "line",
  idPrefix = defaultIdPrefix,
}: {
  traces: TraceData[];
  scales: VisxScales;
  graphStyle?: GraphStyle;
  idPrefix?: string;
}) {
  if (!scales || traces.length === 0) return null;

  const yDomain = scales.yScale.domain();
  const yBaselineData = typeof yDomain[0] === "number" ? yDomain[0] : 0;
  const yBaselinePixel = scales.yScale(yBaselineData);
  const showAreaGradient = graphStyle === "area";

  return (
    <g>
      {showAreaGradient && (
        <defs>
          {traces.map((trace, index) => {
            const color =
              trace.marker?.color ??
              trace.line?.color ??
              "#666";
            const gradientId = `spectrum-area-${idPrefix}-${index}`;
            return (
              <linearGradient
                key={gradientId}
                id={gradientId}
                x1="0"
                y1="1"
                x2="0"
                y2="0"
                gradientUnits="objectBoundingBox"
              >
                <stop offset="0" stopColor={color} stopOpacity={0.28} />
                <stop offset="0.2" stopColor={color} stopOpacity={0.2} />
                <stop offset="0.4" stopColor={color} stopOpacity={0.14} />
                <stop offset="0.6" stopColor={color} stopOpacity={0.08} />
                <stop offset="0.8" stopColor={color} stopOpacity={0.04} />
                <stop offset="1" stopColor={color} stopOpacity={0.01} />
              </linearGradient>
            );
          })}
        </defs>
      )}
      {traces.map((trace, index) => {
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

        if (points.length === 0) return null;

        const color =
          trace.marker?.color ??
          trace.line?.color ??
          "#666";

        const lineWidth =
          typeof trace.line?.width === "number" ? trace.line.width : 1.6;

        const markerSize =
          typeof trace.marker?.size === "number" ? trace.marker.size : 4;
        const markerOpacity =
          typeof trace.marker?.opacity === "number"
            ? trace.marker.opacity
            : 0.7;

        const showLine = graphStyle === "line" || graphStyle === "area";
        const showMarkers = graphStyle === "scatter";
        const showArea = graphStyle === "area";

        return (
          <g key={`trace-${index}`}>
            {showArea && (
              <AreaClosed
                data={points}
                x={(d) => scales.xScale(d.x)}
                y={(d) => scales.yScale(d.y)}
                y0={() => yBaselinePixel}
                yScale={scales.yScale}
                fill={showAreaGradient ? `url(#spectrum-area-${idPrefix}-${index})` : color}
                fillOpacity={showAreaGradient ? 1 : 0.45}
                curve={curveLinear}
              />
            )}
            {showLine && (
              <LinePath
                data={points}
                x={(d) => scales.xScale(d.x)}
                y={(d) => scales.yScale(d.y)}
                stroke={color}
                strokeWidth={lineWidth}
                strokeOpacity={0.92}
                curve={curveLinear}
              />
            )}
            {showMarkers &&
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
