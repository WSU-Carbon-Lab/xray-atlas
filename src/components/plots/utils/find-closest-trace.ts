import type { TraceData } from "../types";

/**
 * Returns the index of the trace whose sample nearest `targetEnergy` lies within `threshold`, or null when none qualify.
 */
export function findClosestTraceIndex(
  targetEnergy: number,
  traces: TraceData[],
  threshold = Infinity,
): number | null {
  let bestIndex: number | null = null;
  let minDistance = Infinity;

  for (let traceIndex = 0; traceIndex < traces.length; traceIndex++) {
    const trace = traces[traceIndex];
    if (!trace) {
      continue;
    }
    const xValues = trace.x;
    const yValues = trace.y;
    if (
      !Array.isArray(xValues) ||
      !Array.isArray(yValues) ||
      xValues.length !== yValues.length
    ) {
      continue;
    }

    for (const xVal of xValues) {
      if (typeof xVal !== "number") {
        continue;
      }
      const distance = Math.abs(xVal - targetEnergy);
      if (distance < minDistance && distance < threshold) {
        minDistance = distance;
        bestIndex = traceIndex;
      }
    }
  }

  return bestIndex;
}
