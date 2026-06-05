"use client";

import { useEffect, useRef } from "react";
import type { StxmIzeroBounds, StxmSampleRegion } from "~/lib/stxm/stxm-region-types";
import { STXM_IZERO_COLOR } from "~/lib/stxm/region-colors";
import {
  computeRowSums,
  rowSumToTraceX,
  rowSumTraceLimits,
} from "~/lib/stxm/plot-scale";

export const STXM_ROW_SUM_TRACE_WIDTH = 52;

type StxmRowSumTraceProps = {
  image: number[][];
  height: number;
  width?: number;
  qaxisPoints: number[];
  sampleMin: number;
  yToPx: (value: number, height: number) => number;
  izero: StxmIzeroBounds;
  regions: StxmSampleRegion[];
};

function rowCenterPx(
  row: number,
  rows: number,
  height: number,
  qaxisPoints: number[],
  sampleMin: number,
  yToPx: (value: number, height: number) => number,
): number {
  if (qaxisPoints.length === rows && rows > 0) {
    return yToPx(qaxisPoints[row] ?? sampleMin, height);
  }
  return ((row + 0.5) / rows) * height;
}

/**
 * Renders the blue row-sum intensity profile beside the line-scan heatmap.
 */
export function StxmRowSumTrace({
  image,
  height,
  width = STXM_ROW_SUM_TRACE_WIDTH,
  qaxisPoints,
  sampleMin,
  yToPx,
  izero,
  regions,
}: StxmRowSumTraceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || image.length === 0) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    const rows = image.length;
    const rowSums = computeRowSums(image);
    const [vmin, vmax] = rowSumTraceLimits(rowSums);
    const plotLeft = 4;
    const plotRight = width - 2;
    const plotWidth = plotRight - plotLeft;

    context.clearRect(0, 0, width, height);
    context.fillStyle = "var(--surface-2, #f4f4f5)";
    context.fillRect(0, 0, width, height);

    const izeroTop = yToPx(izero.izeroHi, height);
    const izeroBottom = yToPx(izero.izeroLo, height);
    const bandTop = Math.min(izeroTop, izeroBottom);
    const bandHeight = Math.abs(izeroBottom - izeroTop);
    context.fillStyle = "rgba(37, 99, 235, 0.12)";
    context.fillRect(0, bandTop, width, bandHeight);

    context.strokeStyle = "rgba(161, 161, 170, 0.45)";
    context.lineWidth = 1;
    const boundaryValues = [
      izero.izeroLo,
      izero.izeroHi,
      ...regions.flatMap((region) => [region.sampleLo, region.sampleHi]),
    ];
    for (const value of boundaryValues) {
      const y = yToPx(value, height);
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    const points: Array<{ x: number; y: number }> = [];
    for (let row = 0; row < rows; row += 1) {
      const x = rowSumToTraceX(rowSums[row] ?? 0, vmin, vmax, plotLeft, plotWidth);
      const y = rowCenterPx(row, rows, height, qaxisPoints, sampleMin, yToPx);
      points.push({ x, y });
    }

    if (points.length > 0) {
      const first = points[0]!;
      context.beginPath();
      context.moveTo(plotRight, first.y);
      for (const point of points) {
        context.lineTo(point.x, point.y);
      }
      context.lineTo(plotRight, points[points.length - 1]!.y);
      context.closePath();
      const gradient = context.createLinearGradient(plotLeft, 0, plotRight, 0);
      gradient.addColorStop(0, "rgba(59, 130, 246, 0.35)");
      gradient.addColorStop(1, "rgba(228, 228, 231, 0.35)");
      context.fillStyle = gradient;
      context.fill();

      context.beginPath();
      context.moveTo(first.x, first.y);
      for (let index = 1; index < points.length; index += 1) {
        const point = points[index]!;
        context.lineTo(point.x, point.y);
      }
      context.strokeStyle = "#3b82f6";
      context.lineWidth = 1.5;
      context.lineJoin = "round";
      context.stroke();
    }

    context.strokeStyle = STXM_IZERO_COLOR;
    context.globalAlpha = 0.35;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, izeroTop);
    context.lineTo(width, izeroTop);
    context.moveTo(0, izeroBottom);
    context.lineTo(width, izeroBottom);
    context.stroke();
    context.globalAlpha = 1;
  }, [height, image, izero, qaxisPoints, regions, sampleMin, width, yToPx]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="pointer-events-none block h-auto shrink-0"
      style={{ width }}
      aria-hidden="true"
    />
  );
}
