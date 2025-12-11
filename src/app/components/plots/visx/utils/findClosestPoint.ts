/**
 * Utility to find the closest data point to a target energy value
 */

import type { TraceData } from "../../core/types";

export function findClosestPoint(
  targetEnergy: number,
  traces: TraceData[],
  threshold: number = Infinity,
): { energy: number; absorption: number; label?: string } | null {
  let closestPoint: {
    energy: number;
    absorption: number;
    label?: string;
  } | null = null;
  let minDistance = Infinity;

  for (const trace of traces) {
    const xValues = trace.x;
    const yValues = trace.y;
    const label = typeof trace.name === "string" ? trace.name : undefined;

    if (
      !Array.isArray(xValues) ||
      !Array.isArray(yValues) ||
      xValues.length !== yValues.length
    ) {
      continue;
    }

    for (let i = 0; i < xValues.length; i++) {
      const xVal = xValues[i];
      const yVal = yValues[i];

      if (typeof xVal !== "number" || typeof yVal !== "number") {
        continue;
      }

      const x: number = xVal;
      const y: number = yVal;

      const distance = Math.abs(x - targetEnergy);

      if (distance < minDistance && distance < threshold) {
        minDistance = distance;
        closestPoint = {
          energy: x,
          absorption: y,
          label,
        };
      }
    }
  }

  return closestPoint;
}
