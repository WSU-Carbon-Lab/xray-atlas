import type { SpectrumPoint } from "~/components/plots/types";

/**
 * Replaces non-physical negative STXM signal samples with `NaN` for plot display.
 *
 * Intensities and derived optical channels should not be negative in valid STXM
 * measurements; negative values are treated as experiment error and omitted from
 * the rendered y-value while preserving the energy sample on the x-axis.
 *
 * @param value Raw or reduced scalar before optional display transforms (reciprocal, log).
 * @returns The input when it is zero or positive and finite; otherwise `Number.NaN` for
 *   negative finite values. Non-finite inputs (`NaN`, `±Infinity`) pass through unchanged.
 */
export function sanitizeStxmSignalSampleForDisplay(value: number): number {
  if (Number.isFinite(value) && value < 0) {
    return Number.NaN;
  }
  return value;
}

/**
 * Maps each {@link SpectrumPoint.absorption} through {@link sanitizeStxmSignalSampleForDisplay}
 * and clears `rawabsError` when the sanitized absorption is not finite.
 *
 * @param points Plot points aligned to the STXM energy axis; energy values are never removed.
 * @returns A new array with the same length and energies; negative absorptions become `NaN` gaps.
 */
export function sanitizeStxmSpectrumPointsForDisplay(
  points: readonly SpectrumPoint[],
): SpectrumPoint[] {
  return points.map((point) => {
    const absorption = sanitizeStxmSignalSampleForDisplay(point.absorption);
    if (!Number.isFinite(absorption)) {
      const { rawabsError: _rawabsError, ...rest } = point;
      return { ...rest, absorption };
    }
    return { ...point, absorption };
  });
}

/**
 * Returns true when at least one point has a finite absorption suitable for axis scaling.
 *
 * @param points Candidate trace points after sanitization.
 */
export function stxmSpectrumPointsHaveFiniteAbsorption(
  points: readonly SpectrumPoint[],
): boolean {
  return points.some((point) => Number.isFinite(point.absorption));
}
