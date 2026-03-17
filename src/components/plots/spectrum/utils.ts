import type { TraceData } from "../types";

export function getValueAtEnergy(
  trace: TraceData,
  energy: number,
  threshold: number,
): number | null {
  const x = trace.x;
  const y = trace.y;
  if (
    !Array.isArray(x) ||
    !Array.isArray(y) ||
    x.length !== y.length ||
    x.length === 0
  ) {
    return null;
  }
  let exactIndex = -1;
  let minDist = Infinity;
  for (let i = 0; i < x.length; i++) {
    const dist = Math.abs(x[i]! - energy);
    if (dist < minDist) {
      minDist = dist;
      exactIndex = i;
    }
  }
  if (exactIndex >= 0 && minDist <= threshold) {
    const val = y[exactIndex];
    return typeof val === "number" && Number.isFinite(val) ? val : null;
  }
  let i = 0;
  while (i < x.length - 1 && x[i]! < energy) i++;
  if (i === 0) return null;
  const x0 = x[i - 1]!;
  const x1 = x[i]!;
  const y0 = y[i - 1]!;
  const y1 = y[i]!;
  if (
    typeof x0 !== "number" ||
    typeof x1 !== "number" ||
    typeof y0 !== "number" ||
    typeof y1 !== "number"
  ) {
    return null;
  }
  const t = (energy - x0) / (x1 - x0);
  if (t < 0 || t > 1) return null;
  return y0 + t * (y1 - y0);
}

export function getTraceLabel(trace: TraceData, index: number): string {
  return typeof trace.name === "string" ? trace.name : `Trace ${index + 1}`;
}

export function getTraceColor(
  trace: TraceData,
  fallback: string,
): string {
  return trace.line?.color ?? trace.marker?.color ?? fallback;
}
