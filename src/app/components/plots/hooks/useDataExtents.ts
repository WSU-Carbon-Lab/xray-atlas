/**
 * Hook for calculating data extents (min/max values)
 */

import { useMemo } from "react";
import type { SpectrumPoint, DifferenceSpectrum, DataExtents } from "../core/types";

/**
 * Calculate energy and absorption extents from data
 */
export function useDataExtents(
  points: SpectrumPoint[],
  differenceSpectra: DifferenceSpectrum[],
): DataExtents {
  const energyExtent = useMemo(() => {
    // If difference spectra are shown, use their extent instead
    if (differenceSpectra.length > 0) {
      const allEnergies: number[] = [];
      differenceSpectra.forEach((spec) => {
        spec.points.forEach((point) => {
          allEnergies.push(point.energy);
        });
      });
      if (allEnergies.length > 0) {
        return { min: Math.min(...allEnergies), max: Math.max(...allEnergies) };
      }
    }

    if (points.length === 0) return null;
    const energies = points.map((point) => point.energy);
    return { min: Math.min(...energies), max: Math.max(...energies) };
  }, [points, differenceSpectra]);

  const absorptionExtent = useMemo(() => {
    // If difference spectra are shown, use their extent instead
    if (differenceSpectra.length > 0) {
      const allAbsorptions: number[] = [];
      differenceSpectra.forEach((spec) => {
        spec.points.forEach((point) => {
          allAbsorptions.push(point.absorption);
        });
      });
      if (allAbsorptions.length > 0) {
        return {
          min: Math.min(...allAbsorptions),
          max: Math.max(...allAbsorptions),
        };
      }
    }

    if (points.length === 0) return null;
    const absorptions = points.map((point) => point.absorption);
    return { min: Math.min(...absorptions), max: Math.max(...absorptions) };
  }, [points, differenceSpectra]);

  return {
    energyExtent,
    absorptionExtent,
  };
}
