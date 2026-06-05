"use client";

import { useEffect, useRef } from "react";
import type { StxmRegionBounds } from "~/lib/dashboard-processing-session";
import { downsampleHeatmap, percentile, valueToGrayscaleByte } from "~/lib/stxm/heatmap";

type StxmScanHeatmapProps = {
  image: Float64Array[];
  spatialAxis: Float64Array;
  bounds?: StxmRegionBounds;
  className?: string;
};

/**
 * Renders a downsampled STXM line-scan heatmap on canvas with optional region bounds.
 */
export function StxmScanHeatmap({
  image,
  spatialAxis,
  bounds,
  className,
}: StxmScanHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const { values } = downsampleHeatmap(image);
    if (values.length === 0) {
      return;
    }
    const flat = values.flat().filter(Number.isFinite);
    let vmin = percentile(flat, 2);
    let vmax = percentile(flat, 98);
    if (!Number.isFinite(vmin) || !Number.isFinite(vmax) || vmin >= vmax) {
      vmin = Math.min(...flat);
      vmax = Math.max(...flat);
    }
    const rows = values.length;
    const cols = values[0]?.length ?? 0;
    const width = canvas.clientWidth || 480;
    const height = canvas.clientHeight || 220;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const cellW = width / cols;
    const cellH = height / rows;
    ctx.clearRect(0, 0, width, height);
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const gray = valueToGrayscaleByte(values[row]?.[col] ?? 0, vmin, vmax);
        ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
        ctx.fillRect(col * cellW, row * cellH, cellW + 1, cellH + 1);
      }
    }

    if (bounds && spatialAxis.length > 0) {
      const yMin = spatialAxis[0] ?? 0;
      const yMax = spatialAxis[spatialAxis.length - 1] ?? 1;
      const mapY = (value: number) =>
        ((value - yMin) / (yMax - yMin || 1)) * height;

      ctx.strokeStyle = "var(--accent)";
      ctx.lineWidth = 2;
      const lines = [
        bounds.sampleLo,
        bounds.sampleHi,
        bounds.izeroLo,
        bounds.izeroHi,
      ];
      for (const line of lines) {
        const y = mapY(line);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
  }, [bounds, image, spatialAxis]);

  return (
    <canvas
      ref={canvasRef}
      className={className ?? "border-border bg-default/20 h-56 w-full rounded-md border"}
      role="img"
      aria-label="STXM line scan heatmap"
    />
  );
}
