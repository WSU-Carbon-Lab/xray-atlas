import type { SpectrumPoint } from "~/app/components/plots/SpectrumPlot";
import type { PeakData } from "../types";

export interface PeakDetectionOptions {
  minProminence?: number; // Minimum prominence as fraction of max intensity (default 0.05 = 5%)
  minDistance?: number; // Minimum distance between peaks in eV (default: auto-calculated)
}

export interface DetectedPeak {
  energy: number;
  intensity: number;
  prominence: number;
  index: number; // Index in the spectrum array
}

/**
 * Calculate the prominence of a peak
 * Prominence is the minimum vertical distance from the peak to the higher of the two surrounding valleys
 */
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

  // Find minimum to the left
  for (let i = peakIndex - 1; i >= 0; i--) {
    const intensity = points[i]!.absorption;
    if (intensity > peakIntensity) {
      break; // Found a higher point, stop searching left
    }
    leftMin = Math.min(leftMin, intensity);
  }

  // Find minimum to the right
  for (let i = peakIndex + 1; i < points.length; i++) {
    const intensity = points[i]!.absorption;
    if (intensity > peakIntensity) {
      break; // Found a higher point, stop searching right
    }
    rightMin = Math.min(rightMin, intensity);
  }

  // Prominence is the difference between peak and the higher of the two valleys
  const valleyLevel = Math.max(leftMin, rightMin);
  return peakIntensity - valleyLevel;
}

/**
 * Find all local maxima in the spectrum
 */
function findLocalMaxima(points: SpectrumPoint[]): number[] {
  const maxima: number[] = [];

  if (points.length < 3) {
    return maxima;
  }

  // Check first point
  if (points[0]!.absorption > points[1]!.absorption) {
    maxima.push(0);
  }

  // Check middle points
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]!.absorption;
    const curr = points[i]!.absorption;
    const next = points[i + 1]!.absorption;

    // Local maximum: higher than both neighbors
    if (curr > prev && curr > next) {
      maxima.push(i);
    }
    // Handle plateau: equal to neighbors but higher than surrounding
    else if (curr === prev && curr > next) {
      // Check if we're at the start of a plateau
      let j = i - 1;
      while (j > 0 && points[j]!.absorption === curr) {
        j--;
      }
      if (points[j]!.absorption < curr) {
        maxima.push(Math.floor((i + j + 1) / 2)); // Use middle of plateau
      }
    }
  }

  // Check last point
  const lastIdx = points.length - 1;
  if (points[lastIdx]!.absorption > points[lastIdx - 1]!.absorption) {
    maxima.push(lastIdx);
  }

  return maxima;
}

/**
 * Calculate minimum distance between peaks based on energy range
 */
function calculateMinDistance(points: SpectrumPoint[]): number {
  if (points.length < 2) {
    return 0.1; // Default 0.1 eV
  }

  const energies = points.map((p) => p.energy);
  const minEnergy = Math.min(...energies);
  const maxEnergy = Math.max(...energies);
  const energyRange = maxEnergy - minEnergy;

  // Use 1% of energy range as minimum distance, but at least 0.1 eV
  return Math.max(0.1, energyRange * 0.01);
}

/**
 * Detect peaks in a spectrum using local maxima with prominence filtering
 */
export function detectPeaks(
  points: SpectrumPoint[],
  options: PeakDetectionOptions = {},
): DetectedPeak[] {
  if (points.length < 3) {
    return [];
  }

  // Sort points by energy to ensure proper ordering
  const sortedPoints = [...points].sort((a, b) => a.energy - b.energy);

  // Find all local maxima
  const maximaIndices = findLocalMaxima(sortedPoints);

  if (maximaIndices.length === 0) {
    return [];
  }

  // Calculate prominence for each maximum
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

  // Filter by minimum prominence
  const maxIntensity = Math.max(...sortedPoints.map((p) => p.absorption));
  const minProminence = options.minProminence ?? 0.05; // Default 5% of max
  const minProminenceValue = maxIntensity * minProminence;

  const filteredPeaks = peaksWithProminence.filter(
    (peak) => peak.prominence >= minProminenceValue,
  );

  // Filter by minimum distance
  const minDistance = options.minDistance ?? calculateMinDistance(sortedPoints);
  const finalPeaks: DetectedPeak[] = [];

  // Sort by intensity (descending) to prioritize stronger peaks
  const sortedByIntensity = [...filteredPeaks].sort(
    (a, b) => b.intensity - a.intensity,
  );

  for (const peak of sortedByIntensity) {
    // Check if this peak is too close to any already selected peak
    const tooClose = finalPeaks.some(
      (existing) => Math.abs(existing.energy - peak.energy) < minDistance,
    );

    if (!tooClose) {
      finalPeaks.push({
        energy: peak.energy,
        intensity: peak.intensity,
        prominence: peak.prominence,
        index: peak.index,
      });
    }
  }

  // Sort final peaks by energy
  return finalPeaks.sort((a, b) => a.energy - b.energy);
}

/**
 * Convert detected peaks to PeakData format
 */
export function convertToPeakData(peaks: DetectedPeak[]): PeakData[] {
  return peaks.map((peak) => ({
    energy: peak.energy,
    intensity: peak.intensity,
    bond: undefined,
    transition: undefined,
  }));
}
