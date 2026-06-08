import type { SpectrumPoint } from "~/components/plots/types";
import {
  buildStxmEnergyValidityMask,
  detectStxmIntensityGlitches,
  type DetectStxmIntensityGlitchesOptions,
  type StxmIntensityGlitch,
} from "./detect-stxm-intensity-glitches";

export {
  buildStxmEnergyValidityMask,
  detectStxmIntensityGlitches,
  type DetectStxmIntensityGlitchesOptions,
  type StxmIntensityGlitch,
  type StxmIntensityGlitchReason,
} from "./detect-stxm-intensity-glitches";

/**
 * Returns false when any supplied raw intensity at one energy is non-finite or non-positive.
 *
 * Callers pass only the intensities that matter for the trace: izero-only plots supply
 * `i0` alone; sample and derived traces supply both `i0` and `it`; TEY Ie traces may
 * also supply `ie` so drain current ≤ 0 is treated as invalid experiment data.
 *
 * @param i0 Incident (izero region) mean counts per pixel at one energy.
 * @param it Optional transmitted (sample region) mean counts per pixel at the same energy.
 * @param ie Optional TEY drain/monitor intensity at the same energy.
 * @returns `true` when every provided intensity is finite and strictly greater than zero.
 */
export function isStxmRawSampleValid(
  i0: number,
  it?: number,
  ie?: number,
): boolean {
  if (!Number.isFinite(i0) || i0 <= 0) {
    return false;
  }
  if (it !== undefined) {
    if (!Number.isFinite(it) || it <= 0) {
      return false;
    }
  }
  if (ie !== undefined) {
    if (!Number.isFinite(ie) || ie <= 0) {
      return false;
    }
  }
  return true;
}

/**
 * Returns false when raw intensities fail positivity checks or match an intensity glitch rule.
 */
export function isStxmEnergyValidAtIndex(
  index: number,
  i0: readonly number[],
  it?: readonly number[],
  ie?: readonly number[],
  glitchOptions?: DetectStxmIntensityGlitchesOptions,
): boolean {
  return buildStxmEnergyValidityMask(i0, it, ie, glitchOptions)[index] ?? false;
}

/**
 * Replaces display samples at invalid energies with `NaN` while leaving valid energies unchanged.
 *
 * Negative derived values (OD, normalized OD, beta, and similar) remain finite when the
 * per-energy raw mask is true; only non-positive raw I0, It, or Ie drive gaps.
 *
 * @param value Scalar y-value before optional display transforms.
 * @param isEnergyValid Per-energy validity from {@link isStxmRawSampleValid}.
 * @returns `Number.NaN` when `isEnergyValid` is false; otherwise `value` unchanged.
 */
export function maskStxmDisplaySample(
  value: number,
  isEnergyValid: boolean,
): number {
  if (!isEnergyValid) {
    return Number.NaN;
  }
  return value;
}

/**
 * Maps plot points through a per-energy validity mask aligned to `points` indices.
 *
 * @param points Plot points on the STXM energy axis; energies are never removed.
 * @param validityMask Parallel booleans from {@link isStxmRawSampleValid}; shorter masks
 *   treat missing indices as valid.
 * @returns A new array with the same length and energies; invalid indices become `NaN` gaps
 *   and drop `rawabsError`.
 */
export function maskStxmSpectrumPointsForDisplay(
  points: readonly SpectrumPoint[],
  validityMask: readonly boolean[],
): SpectrumPoint[] {
  return points.map((point, index) => {
    const isEnergyValid = validityMask[index] ?? true;
    const absorption = maskStxmDisplaySample(point.absorption, isEnergyValid);
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
 * @param points Candidate trace points after masking.
 */
export function stxmSpectrumPointsHaveFiniteAbsorption(
  points: readonly SpectrumPoint[],
): boolean {
  return points.some((point) => Number.isFinite(point.absorption));
}
