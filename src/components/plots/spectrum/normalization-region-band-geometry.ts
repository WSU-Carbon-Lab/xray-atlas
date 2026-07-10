import type { ScaleLinear } from "d3-scale";

export type NormalizationBandRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Maps a normalization energy window to a plot-space rectangle, optionally clipped to the inner plot width.
 */
export function resolveNormalizationBandRect(
  range: [number, number],
  xScale: ScaleLinear<number, number>,
  offsetX: number,
  offsetY: number,
  height: number,
  plotInnerWidth?: number,
): NormalizationBandRect | null {
  const lo = Math.min(range[0], range[1]);
  const hi = Math.max(range[0], range[1]);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo === hi) {
    return null;
  }
  const x0 = xScale(lo) + offsetX;
  const x1 = xScale(hi) + offsetX;
  let x = Math.min(x0, x1);
  let xEnd = Math.max(x0, x1);
  if (plotInnerWidth != null && Number.isFinite(plotInnerWidth) && plotInnerWidth > 0) {
    const clipMin = offsetX;
    const clipMax = offsetX + plotInnerWidth;
    x = Math.max(x, clipMin);
    xEnd = Math.min(xEnd, clipMax);
  }
  const width = xEnd - x;
  if (width <= 0) {
    return null;
  }
  return { x, y: offsetY, width, height };
}
