/**
 * Hook for calculating data extents (min/max values)
 */

import { useMemo } from "react";
import type {
  SpectrumPoint,
  DifferenceSpectrum,
  DataExtents,
  ReferenceCurve,
} from "../types";

/**
 * Calculates energy and absorption extents from spectrum rows, optional difference traces, and
 * optional reference overlays so autoscale includes every drawn y value (for example bare-atom KK δ).
 */
export function useDataExtents(
  points: SpectrumPoint[],
  differenceSpectra: DifferenceSpectrum[],
  referenceCurves?: readonly ReferenceCurve[],
): DataExtents {
  const energyExtent = useMemo(() => {
    const fromDiff: number[] = [];
    differenceSpectra.forEach((spec) => {
      spec.points.forEach((point) => {
        if (typeof point.energy === "number" && Number.isFinite(point.energy)) {
          fromDiff.push(point.energy);
        }
      });
    });
    const fromPoints = points
      .map((p) => p.energy)
      .filter((e): e is number => typeof e === "number" && Number.isFinite(e));
    const merged =
      differenceSpectra.length > 0 ? [...fromDiff, ...fromPoints] : fromPoints;
    if (merged.length === 0) return null;
    return { min: Math.min(...merged), max: Math.max(...merged) };
  }, [points, differenceSpectra]);

  const absorptionExtent = useMemo(() => {
    const fromDiff: number[] = [];
    differenceSpectra.forEach((spec) => {
      spec.points.forEach((point) => {
        if (
          typeof point.absorption === "number" &&
          Number.isFinite(point.absorption)
        ) {
          fromDiff.push(point.absorption);
        }
      });
    });
    const fromPoints = points
      .map((p) => p.absorption)
      .filter(
        (a): a is number => typeof a === "number" && Number.isFinite(a),
      );
    const fromRefs: number[] = [];
    if (referenceCurves?.length) {
      for (const curve of referenceCurves) {
        for (const pt of curve.points) {
          if (
            typeof pt.absorption === "number" &&
            Number.isFinite(pt.absorption)
          ) {
            fromRefs.push(pt.absorption);
          }
        }
      }
    }
    const merged =
      differenceSpectra.length > 0
        ? [...fromDiff, ...fromPoints, ...fromRefs]
        : [...fromPoints, ...fromRefs];
    if (merged.length === 0) return null;
    return { min: Math.min(...merged), max: Math.max(...merged) };
  }, [points, differenceSpectra, referenceCurves]);

  return {
    energyExtent,
    absorptionExtent,
  };
}
