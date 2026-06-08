"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StxmRegionBounds } from "~/lib/dashboard-processing-session";
import {
  downsampleHeatmap,
  percentile,
  valueToGrayscaleByte,
} from "~/lib/stxm/heatmap";

type DragHandle =
  | "sampleLo"
  | "sampleHi"
  | "izeroLo"
  | "izeroHi"
  | null;

type StxmRegionHeatmapProps = {
  image: Float64Array[];
  spatialAxis: Float64Array;
  bounds: StxmRegionBounds;
  onBoundsChange: (bounds: StxmRegionBounds) => void;
  className?: string;
};

const HANDLE_HIT_PX = 8;

function clampBounds(
  bounds: StxmRegionBounds,
  yMin: number,
  yMax: number,
): StxmRegionBounds {
  const clamp = (value: number) => Math.min(yMax, Math.max(yMin, value));
  let sampleLo = clamp(bounds.sampleLo);
  let sampleHi = clamp(bounds.sampleHi);
  let izeroLo = clamp(bounds.izeroLo);
  let izeroHi = clamp(bounds.izeroHi);
  if (sampleLo > sampleHi) {
    [sampleLo, sampleHi] = [sampleHi, sampleLo];
  }
  if (izeroLo > izeroHi) {
    [izeroLo, izeroHi] = [izeroHi, izeroLo];
  }
  return { sampleLo, sampleHi, izeroLo, izeroHi };
}

/**
 * STXM heatmap with draggable sample (green) and izero (blue) region bands.
 */
export function StxmRegionHeatmap({
  image,
  spatialAxis,
  bounds,
  onBoundsChange,
  className,
}: StxmRegionHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeHandle, setActiveHandle] = useState<DragHandle>(null);

  const spatialRange = useCallback(() => {
    const yMin = spatialAxis[0] ?? 0;
    const yMax = spatialAxis[spatialAxis.length - 1] ?? 1;
    return { yMin, yMax };
  }, [spatialAxis]);

  const valueToPixelY = useCallback(
    (value: number, height: number) => {
      const { yMin, yMax } = spatialRange();
      return ((value - yMin) / (yMax - yMin || 1)) * height;
    },
    [spatialRange],
  );

  const pixelYToValue = useCallback(
    (pixelY: number, height: number) => {
      const { yMin, yMax } = spatialRange();
      return yMin + (pixelY / height) * (yMax - yMin);
    },
    [spatialRange],
  );

  const nearestHandle = useCallback(
    (clientY: number, canvas: HTMLCanvasElement): DragHandle => {
      const rect = canvas.getBoundingClientRect();
      const y = clientY - rect.top;
      const height = canvas.height;
      const candidates: Array<{ key: DragHandle; dist: number }> = [
        { key: "sampleLo", dist: Math.abs(y - valueToPixelY(bounds.sampleLo, height)) },
        { key: "sampleHi", dist: Math.abs(y - valueToPixelY(bounds.sampleHi, height)) },
        { key: "izeroLo", dist: Math.abs(y - valueToPixelY(bounds.izeroLo, height)) },
        { key: "izeroHi", dist: Math.abs(y - valueToPixelY(bounds.izeroHi, height)) },
      ];
      candidates.sort((a, b) => a.dist - b.dist);
      const best = candidates[0];
      if (!best?.key || best.dist > HANDLE_HIT_PX) {
        return null;
      }
      return best.key;
    },
    [bounds, valueToPixelY],
  );

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
    const height = canvas.clientHeight || 280;
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

    if (spatialAxis.length > 0) {
      const sampleTop = valueToPixelY(bounds.sampleLo, height);
      const sampleBottom = valueToPixelY(bounds.sampleHi, height);
      const izeroTop = valueToPixelY(bounds.izeroLo, height);
      const izeroBottom = valueToPixelY(bounds.izeroHi, height);

      ctx.fillStyle = "rgba(34, 197, 94, 0.22)";
      ctx.fillRect(0, sampleTop, width, sampleBottom - sampleTop);
      ctx.fillStyle = "rgba(59, 130, 246, 0.22)";
      ctx.fillRect(0, izeroTop, width, izeroBottom - izeroTop);

      ctx.lineWidth = 2;
      const drawLine = (value: number, color: string) => {
        const y = valueToPixelY(value, height);
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      };
      drawLine(bounds.sampleLo, "rgb(34, 197, 94)");
      drawLine(bounds.sampleHi, "rgb(34, 197, 94)");
      drawLine(bounds.izeroLo, "rgb(59, 130, 246)");
      drawLine(bounds.izeroHi, "rgb(59, 130, 246)");
    }
  }, [bounds, image, spatialAxis, valueToPixelY]);

  useEffect(() => {
    if (!activeHandle) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const y = event.clientY - rect.top;
      const value = pixelYToValue(y, canvas.height);
      const { yMin, yMax } = spatialRange();
      onBoundsChange(
        clampBounds({ ...bounds, [activeHandle]: value }, yMin, yMax),
      );
    };
    const onUp = () => setActiveHandle(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [activeHandle, bounds, onBoundsChange, pixelYToValue, spatialRange]);

  return (
    <canvas
      ref={canvasRef}
      className={
        className ??
        "border-border bg-default/20 h-72 w-full cursor-ns-resize rounded-md border touch-none"
      }
      role="img"
      aria-label="STXM line scan heatmap with draggable sample and izero regions"
      onPointerDown={(event) => {
        const canvas = canvasRef.current;
        if (!canvas) {
          return;
        }
        const handle = nearestHandle(event.clientY, canvas);
        if (handle) {
          setActiveHandle(handle);
          canvas.setPointerCapture(event.pointerId);
        }
      }}
    />
  );
}
