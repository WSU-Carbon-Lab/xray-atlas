import type { SpectrumPoint } from "~/components/plots/types";
import type { PeakData } from "../types";

export interface PeakDetectionOptions {
  minProminence?: number;
  minDistance?: number;
  width?: number;
  height?: number;
  threshold?: number;
}

export interface DetectedPeak {
  energy: number;
  intensity: number;
  prominence: number;
  index: number;
}

function calculateProminence(
  points: SpectrumPoint[],
  peakIndex: number,
): number {
  if (peakIndex < 0 || peakIndex >= points.length) {
    return 0;
  }

  const peakIntensity = points[peakIndex]!.absorption;
  let leftMin = peakIntensity;
  let rightMin = peakIntensity;

  const maxSearchRange = Math.min(Math.floor(points.length * 0.1), 100);
  const leftBound = Math.max(0, peakIndex - maxSearchRange);
  const rightBound = Math.min(points.length - 1, peakIndex + maxSearchRange);

  for (let i = peakIndex - 1; i >= leftBound; i--) {
    const intensity = points[i]!.absorption;
    if (intensity > peakIntensity) break;
    leftMin = Math.min(leftMin, intensity);
  }

  for (let i = peakIndex + 1; i <= rightBound; i++) {
    const intensity = points[i]!.absorption;
    if (intensity > peakIntensity) break;
    rightMin = Math.min(rightMin, intensity);
  }

  const valleyLevel = Math.max(leftMin, rightMin);
  return peakIntensity - valleyLevel;
}

function findLocalMaxima(points: SpectrumPoint[]): number[] {
  const maxima: number[] = [];

  if (points.length < 3) {
    return maxima;
  }

  if (points[0]!.absorption > points[1]!.absorption) {
    maxima.push(0);
  }

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]!.absorption;
    const curr = points[i]!.absorption;
    const next = points[i + 1]!.absorption;

    if (curr > prev && curr > next) {
      maxima.push(i);
    } else if (curr === prev && curr > next) {
      let j = i - 1;
      while (j > 0 && points[j]!.absorption === curr) {
        j--;
      }
      if (points[j]!.absorption < curr) {
        maxima.push(Math.floor((i + j + 1) / 2));
      }
    }
  }

  const lastIdx = points.length - 1;
  if (points[lastIdx]!.absorption > points[lastIdx - 1]!.absorption) {
    maxima.push(lastIdx);
  }

  return maxima;
}

function calculateMinDistance(points: SpectrumPoint[]): number {
  if (points.length < 2) {
    return 0.05;
  }

  const energies = points.map((p) => p.energy);
  const minEnergy = Math.min(...energies);
  const maxEnergy = Math.max(...energies);
  const energyRange = maxEnergy - minEnergy;

  return Math.max(0.05, energyRange * 0.01);
}

export function detectPeaks(
  points: SpectrumPoint[],
  options: PeakDetectionOptions = {},
): DetectedPeak[] {
  if (points.length < 3) {
    return [];
  }

  const sortedPoints = [...points].sort((a, b) => a.energy - b.energy);
  const maximaIndices = findLocalMaxima(sortedPoints);

  if (maximaIndices.length === 0) {
    return [];
  }

  const peaksWithProminence: Array<{
    index: number;
    energy: number;
    intensity: number;
    prominence: number;
  }> = [];

  for (const idx of maximaIndices) {
    const prominence = calculateProminence(sortedPoints, idx);
    peaksWithProminence.push({
      index: idx,
      energy: sortedPoints[idx]!.energy,
      intensity: sortedPoints[idx]!.absorption,
      prominence,
    });
  }

  const maxIntensity = Math.max(...sortedPoints.map((p) => p.absorption));
  const minProminence = options.minProminence ?? 0.05;
  const minProminenceValue = maxIntensity * minProminence;
  const minHeight = options.height ? maxIntensity * options.height : undefined;
  const minThreshold = options.threshold
    ? maxIntensity * options.threshold
    : undefined;

  let filteredPeaks = peaksWithProminence.filter(
    (peak) => peak.prominence >= minProminenceValue,
  );

  if (minHeight !== undefined) {
    filteredPeaks = filteredPeaks.filter((peak) => peak.intensity >= minHeight);
  }

  if (minThreshold !== undefined) {
    filteredPeaks = filteredPeaks.filter((peak) => {
      const leftIntensity =
        peak.index > 0 ? sortedPoints[peak.index - 1]!.absorption : -Infinity;
      const rightIntensity =
        peak.index < sortedPoints.length - 1
          ? sortedPoints[peak.index + 1]!.absorption
          : -Infinity;
      const neighborMax = Math.max(leftIntensity, rightIntensity);
      const verticalDistance = peak.intensity - neighborMax;
      return verticalDistance >= minThreshold;
    });
  }

  const minDistance = options.minDistance ?? calculateMinDistance(sortedPoints);
  const minWidth = options.width;
  const finalPeaks: DetectedPeak[] = [];

  const sortedByIntensity = [...filteredPeaks].sort(
    (a, b) => b.intensity - a.intensity,
  );

  for (const peak of sortedByIntensity) {
    const tooClose = finalPeaks.some(
      (existing) => Math.abs(existing.energy - peak.energy) < minDistance,
    );

    if (tooClose) continue;

    if (minWidth !== undefined && minWidth > 0) {
      const halfProminence = peak.intensity - peak.prominence / 2;
      let leftWidth = 0;
      let rightWidth = 0;

      for (let i = peak.index - 1; i >= 0; i--) {
        if (sortedPoints[i]!.absorption >= halfProminence) {
          leftWidth++;
        } else {
          break;
        }
      }

      for (let i = peak.index + 1; i < sortedPoints.length; i++) {
        if (sortedPoints[i]!.absorption >= halfProminence) {
          rightWidth++;
        } else {
          break;
        }
      }

      const totalWidth = leftWidth + rightWidth + 1;
      if (totalWidth < minWidth) continue;
    }

    finalPeaks.push({
      energy: peak.energy,
      intensity: peak.intensity,
      prominence: peak.prominence,
      index: peak.index,
    });
  }

  return finalPeaks.sort((a, b) => a.energy - b.energy);
}

export function convertToPeakData(peaks: DetectedPeak[]): PeakData[] {
  return peaks.map((peak) => ({
    energy: peak.energy,
    intensity: peak.intensity,
    bond: undefined,
    transition: undefined,
  }));
}
