/**
 * Energy-grid alignment helpers for linear combination fitting (LCF).
 *
 * Mirrors the standalone STXM Python `grid.py` overlap union and linear interpolation
 * used before constrained least-squares fitting.
 */

/**
 * Builds a monotonic energy grid spanning the overlap of input axes.
 *
 * When `nPoints` is omitted, returns the sorted union of all sample energies within
 * `[max(min), min(max)]`. When `nPoints` is set, returns evenly spaced points on that interval.
 *
 * @param energies - One-dimensional energy axes in eV; each must contain at least one finite value.
 * @param nPoints - Optional count for a uniform grid over the overlap interval.
 * @returns Sorted grid in eV over the shared overlap.
 * @throws {RangeError} When `energies` is empty or axes do not overlap.
 */
export function commonEnergyGrid(
  energies: readonly (readonly number[])[],
  nPoints?: number,
): number[] {
  if (energies.length === 0) {
    throw new RangeError("energies must be non-empty");
  }
  let lo = -Infinity;
  let hi = Infinity;
  for (const axis of energies) {
    if (axis.length === 0) {
      throw new RangeError("each energy axis must contain at least one point");
    }
    let axisMin = Infinity;
    let axisMax = -Infinity;
    for (const value of axis) {
      if (!Number.isFinite(value)) {
        continue;
      }
      axisMin = Math.min(axisMin, value);
      axisMax = Math.max(axisMax, value);
    }
    if (!Number.isFinite(axisMin) || !Number.isFinite(axisMax)) {
      throw new RangeError("each energy axis must contain at least one finite point");
    }
    lo = Math.max(lo, axisMin);
    hi = Math.min(hi, axisMax);
  }
  if (!(hi > lo)) {
    throw new RangeError("energy axes have no overlapping interval");
  }
  if (nPoints != null) {
    if (nPoints < 2) {
      throw new RangeError("nPoints must be at least 2");
    }
    const step = (hi - lo) / (nPoints - 1);
    return Array.from({ length: nPoints }, (_, index) => lo + step * index);
  }
  const union = new Set<number>();
  for (const axis of energies) {
    for (const value of axis) {
      if (Number.isFinite(value) && value >= lo && value <= hi) {
        union.add(value);
      }
    }
  }
  return [...union].sort((left, right) => left - right);
}

function linearInterpSortedEval(
  x: readonly number[],
  y: readonly number[],
  xq: number,
): number {
  const n = x.length;
  if (n === 0) {
    return Number.NaN;
  }
  if (xq < x[0]! || xq > x[n - 1]!) {
    return Number.NaN;
  }
  if (xq === x[0]!) {
    return y[0]!;
  }
  if (xq === x[n - 1]!) {
    return y[n - 1]!;
  }
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xq < x[mid]!) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  const x0 = x[lo]!;
  const x1 = x[hi]!;
  const t = (xq - x0) / (x1 - x0);
  return y[lo]! * (1 - t) + y[hi]! * t;
}

/**
 * Linearly interpolates `values` onto `grid` using a strictly sorted source energy axis.
 *
 * @param energyEv - Source energy axis in eV; need not be pre-sorted.
 * @param values - Samples aligned with `energyEv`.
 * @param grid - Target energy grid in eV.
 * @returns Interpolated samples; points outside the source range are `NaN`.
 * @throws {RangeError} When `energyEv` and `values` differ in length or contain fewer than two points.
 */
export function interpolateSpectrumLinear(
  energyEv: readonly number[],
  values: readonly number[],
  grid: readonly number[],
): number[] {
  if (energyEv.length !== values.length) {
    throw new RangeError("energyEv and values must have the same length");
  }
  if (energyEv.length < 2) {
    throw new RangeError("energyEv must contain at least two points");
  }
  const order = energyEv
    .map((energy, index) => ({ energy, index }))
    .sort((left, right) => left.energy - right.energy);
  const sortedEnergy = order.map((entry) => energyEv[entry.index]!);
  const sortedValues = order.map((entry) => values[entry.index]!);
  return grid.map((energy) =>
    linearInterpSortedEval(sortedEnergy, sortedValues, energy),
  );
}

/**
 * Clamps non-positive or non-finite uncertainties to a small floor for weighted fits.
 *
 * @param sigma - Per-point standard errors aligned with spectrum samples.
 * @param floor - Minimum positive sigma (defaults to `1e-12`).
 */
export function sigmaWithFloor(
  sigma: readonly number[],
  floor = 1e-12,
): number[] {
  return sigma.map((value) =>
    Number.isFinite(value) && value > 0 ? value : floor,
  );
}
