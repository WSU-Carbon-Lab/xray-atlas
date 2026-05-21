"use client";

import { memo } from "react";
import { LinePath, AreaClosed } from "@visx/shape";
import { curveLinear } from "@visx/curve";
import type { TraceData, GraphStyle } from "../types";
import { PLOT_CONFIG } from "../config";
import type { ChartScales } from "./types";
import type { LinkedOpticalAreaBand } from "../utils/linked-optical-area-bands";
import { isLinkedOpticalSpectrumTrace } from "../utils/linked-optical-area-bands";
import { ChartLinkedOpticalAreaBands } from "./ChartLinkedOpticalAreaBands";

export const ChartSpectrumLines = memo(function ChartSpectrumLines({
  traces,
  scales,
  graphStyle = "line",
  idPrefix = "spectrum",
  linkedOpticalAreaBands,
}: {
  traces: TraceData[];
  scales: ChartScales;
  graphStyle?: GraphStyle;
  idPrefix?: string;
  /** Fills between paired imaginary/real traces; skips per-trace area on link traces. */
  linkedOpticalAreaBands?: readonly LinkedOpticalAreaBand[];
}) {
  if (!scales || traces.length === 0) return null;

  const yZeroPixel = scales.yScale(0);
  const showAreaGradient = graphStyle === "area";
  const lineWidth = PLOT_CONFIG.line.strokeWidth;
  const useLinkedAreaBands =
    graphStyle === "area" &&
    linkedOpticalAreaBands != null &&
    linkedOpticalAreaBands.length > 0;

  return (
    <g>
      {useLinkedAreaBands ? (
        <ChartLinkedOpticalAreaBands
          bands={linkedOpticalAreaBands}
          scales={scales}
          idPrefix={`${idPrefix}-linked-band`}
        />
      ) : null}
      {showAreaGradient && !useLinkedAreaBands && (
        <defs>
          {traces.map((trace, index) => {
            const color =
              trace.marker?.color ?? trace.line?.color ?? "#666";
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
          trace.marker?.color ?? trace.line?.color ?? "#666";
        const strokeWidth =
          typeof trace.line?.width === "number" ? trace.line.width : lineWidth;
        const dashKind = trace.line?.dash;
        const strokeDasharray =
          dashKind === "dash"
            ? "6 4"
            : dashKind === "dot"
              ? "2 4"
              : dashKind === "dashdot"
                ? "6 2 2 2"
                : undefined;
        const markerSize =
          typeof trace.marker?.size === "number" ? trace.marker.size : 4;
        const markerOpacity =
          typeof trace.marker?.opacity === "number" ? trace.marker.opacity : 0.7;

        const showLine = graphStyle === "line" || graphStyle === "area";
        const showMarkers = graphStyle === "scatter";
        const showArea =
          graphStyle === "area" &&
          !(useLinkedAreaBands && isLinkedOpticalSpectrumTrace(trace));

        return (
          <g key={`trace-${index}`} data-trace-index={index}>
            {showArea && (
              <AreaClosed
                data={points}
                x={(d) => scales.xScale(d.x)}
                y={(d) => scales.yScale(d.y)}
                y0={() => yZeroPixel}
                yScale={scales.yScale}
                fill={
                  showAreaGradient
                    ? `url(#spectrum-area-${idPrefix}-${index})`
                    : color
                }
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
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeLinecap={PLOT_CONFIG.line.strokeLinecap}
                strokeOpacity={0.92}
                curve={curveLinear}
              />
            )}
            {showMarkers &&
              points.map((point, pointIndex) => {
                const cx = scales.xScale(point.x);
                const cy = scales.yScale(point.y);
                const markerKey = `marker-${index}-${pointIndex}`;
                if (trace.marker?.symbol === "square") {
                  const side = markerSize;
                  const half = side / 2;
                  return (
                    <rect
                      key={markerKey}
                      x={cx - half}
                      y={cy - half}
                      width={side}
                      height={side}
                      fill={color}
                      opacity={markerOpacity}
                    />
                  );
                }
                return (
                  <circle
                    key={markerKey}
                    cx={cx}
                    cy={cy}
                    r={markerSize / 2}
                    fill={color}
                    opacity={markerOpacity}
                  />
                );
              })}
          </g>
        );
      })}
    </g>
  );
});
