/**
 * Coordinate transformation utilities
 * Convert between pixel coordinates and data coordinates
 */

import type { Peak } from "../core/types";

/**
 * Convert pixel coordinates to data coordinates
 */
export function pixelToData(
  pixelX: number,
  pixelY: number,
  xRange: [number, number],
  yRange: [number, number],
  plotWidth: number,
  plotHeight: number,
  leftMargin: number,
  topMargin: number,
): { x: number; y: number } {
  const xScale = plotWidth / (xRange[1] - xRange[0]);
  const yScale = plotHeight / (yRange[1] - yRange[0]);

  const dataX = xRange[0] + (pixelX - leftMargin) / xScale;
  const dataY = yRange[1] - (pixelY - topMargin) / yScale;

  return { x: dataX, y: dataY };
}

/**
 * Convert data coordinates to pixel coordinates
 */
export function dataToPixel(
  dataX: number,
  dataY: number,
  xRange: [number, number],
  yRange: [number, number],
  plotWidth: number,
  plotHeight: number,
  leftMargin: number,
  topMargin: number,
): { x: number; y: number } {
  const xScale = plotWidth / (xRange[1] - xRange[0]);
  const yScale = plotHeight / (yRange[1] - yRange[0]);

  const pixelX = leftMargin + (dataX - xRange[0]) * xScale;
  const pixelY = topMargin + (yRange[1] - dataY) * yScale;

  return { x: pixelX, y: pixelY };
}

/**
 * Find the closest peak to a given energy value
 */
export function findClosestPeak(
  energy: number,
  peaks: Peak[],
  threshold: number,
): Peak | null {
  let closestPeak: Peak | null = null;
  let minDistance = Infinity;

  for (const peak of peaks) {
    const distance = Math.abs(peak.energy - energy);
    if (distance < minDistance && distance < threshold) {
      minDistance = distance;
      closestPeak = peak;
    }
  }

  return closestPeak;
}

/**
 * Calculate proximity of an energy value to a peak energy
 * Returns a value between 0 (at peak) and 1 (at threshold distance)
 */
export function calculateProximity(
  energy: number,
  peakEnergy: number,
  threshold: number,
): number {
  const distance = Math.abs(energy - peakEnergy);
  if (distance >= threshold) return 1;
  return distance / threshold;
}

/**
 * Calculate threshold for peak proximity detection
 * Uses 1% of the x-axis range or 2 eV, whichever is smaller
 */
export function calculateProximityThreshold(
  xRange: [number, number],
): number {
  const range = xRange[1] - xRange[0];
  return Math.min(range * 0.01, 2.0);
}
