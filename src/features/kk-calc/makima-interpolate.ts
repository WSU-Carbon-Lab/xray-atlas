/**
 * Modified Akima (makima) piecewise cubic Hermite interpolation for real scalar samples.
 *
 * Implements the same derivative weights as SciPy 1.14 `Akima1DInterpolator(..., method="makima")`
 * (Moler–Ionita stabilized weights; see SciPy docstring citing Cleve Moler and Cosmin Ionita, 2019,
 * "Makima Piecewise Cubic Interpolation", MathWorks blog) and the original local cubic construction
 * in Akima, J. ACM 17(4), 1970, 589–602, DOI 10.1145/321607.321609.
 *
 * Extrapolation: query values strictly outside `[sourceX[0], sourceX[n-1]]` yield `NaN` so callers
 * do not silently extend KK-derived data beyond the fitted photon-energy window.
 */

function assertStrictlyIncreasing(name: string, xs: readonly number[]): void {
  for (let i = 1; i < xs.length; i++) {
    if (!(xs[i]! > xs[i - 1]!)) {
      throw new RangeError(`${name} must be strictly ascending`);
    }
  }
}

function makimaKnotDerivatives(x: readonly number[], y: readonly number[]): number[] {
  const n = x.length;
  if (n < 4) {
    throw new RangeError(
      "makima knot derivatives require at least four strictly ascending samples",
    );
  }
  if (y.length !== n) {
    throw new RangeError("sourceX and sourceY must have the same length");
  }

  const m = new Array<number>(n + 3);
  for (let i = 0; i < n + 3; i++) {
    m[i] = 0;
  }

  for (let i = 0; i < n - 1; i++) {
    const h = x[i + 1]! - x[i]!;
    m[i + 2] = (y[i + 1]! - y[i]!) / h;
  }

  const mk = (j: number): number => {
    const v = m[j];
    if (v === undefined) {
      throw new RangeError("makima segment buffer is incomplete for this knot count");
    }
    return v;
  };

  m[1] = 2 * mk(2) - mk(3);
  m[0] = 2 * mk(1) - mk(2);
  m[n + 1] = 2 * mk(n) - mk(n - 1);
  m[n + 2] = 2 * mk(n + 1) - mk(n);

  const t = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    t[i] = 0.5 * (m[i + 3]! + m[i]!);
  }

  const dm: number[] = [];
  for (let i = 0; i < m.length - 1; i++) {
    dm.push(Math.abs(m[i + 1]! - m[i]!));
  }
  const pm: number[] = [];
  for (let i = 0; i < m.length - 1; i++) {
    pm.push(Math.abs(m[i + 1]! + m[i]!));
  }

  const f1: number[] = [];
  const f2: number[] = [];
  for (let i = 0; i < n; i++) {
    f1.push(dm[i + 2]! + 0.5 * pm[i + 2]!);
    f2.push(dm[i]! + 0.5 * pm[i]!);
  }

  let maxF12 = -Infinity;
  const f12: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = f1[i]! + f2[i]!;
    f12.push(v);
    if (v > maxF12) maxF12 = v;
  }

  const tol = 1e-9 * (maxF12 > 0 ? maxF12 : 1);
  for (let i = 0; i < n; i++) {
    if (f12[i]! > tol) {
      t[i] = (f1[i]! * m[i + 1]! + f2[i]! * m[i + 2]!) / f12[i]!;
    }
  }

  return t;
}

function linearInterpSortedEval(
  x: readonly number[],
  y: readonly number[],
  xq: number,
): number {
  const n = x.length;
  if (xq < x[0]! || xq > x[n - 1]!) return Number.NaN;
  if (xq === x[0]!) return y[0]!;
  if (xq === x[n - 1]!) return y[n - 1]!;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xq < x[mid]!) hi = mid;
    else lo = mid;
  }
  const x0 = x[lo]!;
  const x1 = x[hi]!;
  const t = (xq - x0) / (x1 - x0);
  return y[lo]! * (1 - t) + y[hi]! * t;
}

function linearInterpSorted(
  targetX: readonly number[],
  sourceX: readonly number[],
  sourceY: readonly number[],
): number[] {
  return targetX.map((xq) => linearInterpSortedEval(sourceX, sourceY, xq));
}

function evalHermiteInterval(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  d0: number,
  d1: number,
  xq: number,
): number {
  const h = x1 - x0;
  const s = (xq - x0) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1;
  const h10 = s3 - 2 * s2 + s;
  const h01 = -2 * s3 + 3 * s2;
  const h11 = s3 - s2;
  return h00 * y0 + h10 * h * d0 + h01 * y1 + h11 * h * d1;
}

function interpolateMakimaEval(
  x: readonly number[],
  y: readonly number[],
  dydx: readonly number[],
  xq: number,
): number {
  const n = x.length;
  if (xq < x[0]! || xq > x[n - 1]!) {
    return Number.NaN;
  }
  if (xq === x[0]!) return y[0]!;
  if (xq === x[n - 1]!) return y[n - 1]!;

  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xq < x[mid]!) hi = mid;
    else lo = mid;
  }
  return evalHermiteInterval(
    x[lo]!,
    x[hi]!,
    y[lo]!,
    y[hi]!,
    dydx[lo]!,
    dydx[hi]!,
    xq,
  );
}

function energiesMatchPairwise(
  a: readonly number[],
  b: readonly number[],
  relTol: number,
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const scale = 1 + Math.abs(a[i]!);
    if (Math.abs(a[i]! - b[i]!) > relTol * scale) return false;
  }
  return true;
}

/**
 * Evaluates makima interpolation of `(sourceX, sourceY)` at each strictly increasing `targetX`.
 *
 * @param targetX Query abscissae in strictly ascending order (electron-volts when used for spectra).
 * @param sourceX Strictly ascending knot energies, same length as `sourceY`.
 * @param sourceY Knot ordinates aligned with `sourceX`.
 * @returns One interpolated value per `targetX` entry; entries outside the knot span are `NaN`.
 * @throws RangeError When arrays have incompatible lengths or `sourceX` / `targetX` are not strictly ascending.
 */
export function interpolateMakimaSorted(
  targetX: readonly number[],
  sourceX: readonly number[],
  sourceY: readonly number[],
): number[] {
  if (sourceX.length !== sourceY.length) {
    throw new RangeError("sourceX and sourceY must have the same length");
  }
  if (sourceX.length < 2) {
    throw new RangeError("interpolation requires at least two source samples");
  }
  assertStrictlyIncreasing("sourceX", sourceX);
  assertStrictlyIncreasing("targetX", targetX);

  if (
    targetX.length === sourceX.length &&
    energiesMatchPairwise(targetX, sourceX, 1e-12)
  ) {
    return sourceY.map((v) => v);
  }

  if (sourceX.length < 4) {
    return linearInterpSorted(targetX, sourceX, sourceY);
  }

  const dydx = makimaKnotDerivatives(sourceX, sourceY);
  return targetX.map((xq) => interpolateMakimaEval(sourceX, sourceY, dydx, xq));
}

/**
 * Maps KK `delta` samples from a KK energy grid onto a destination spectrum energy axis using makima
 * when grids differ; returns a shallow copy of `sourceDelta` when `targetEnergyEvAsc` matches
 * `kkEnergyEvAsc` within `relTol` pairwise.
 *
 * @param targetEnergyEvAsc Strictly ascending destination photon energies (e.g. full `spectrumpoints` grid).
 * @param kkEnergyEvAsc Strictly ascending energies used with `computeDeltaFromBetaDiscreteKK`.
 * @param kkDeltaAsc `delta` values aligned with `kkEnergyEvAsc`.
 * @param relTol Relative tolerance on `|a_i-b_i|/(1+|a_i|)` for treating grids as identical.
 * @returns `delta` aligned to `targetEnergyEvAsc` (same length as `targetEnergyEvAsc`).
 * @throws RangeError When inputs are not strictly ascending or lengths mismatch between KK arrays.
 */
export function alignKkDeltaToSpectrumEnergyAxis(
  targetEnergyEvAsc: readonly number[],
  kkEnergyEvAsc: readonly number[],
  kkDeltaAsc: readonly number[],
  relTol = 1e-9,
): number[] {
  if (kkEnergyEvAsc.length !== kkDeltaAsc.length) {
    throw new RangeError("kkEnergyEvAsc and kkDeltaAsc must have the same length");
  }
  assertStrictlyIncreasing("targetEnergyEvAsc", targetEnergyEvAsc);
  assertStrictlyIncreasing("kkEnergyEvAsc", kkEnergyEvAsc);

  if (
    targetEnergyEvAsc.length === kkEnergyEvAsc.length &&
    energiesMatchPairwise(targetEnergyEvAsc, kkEnergyEvAsc, relTol)
  ) {
    return kkDeltaAsc.slice();
  }

  return interpolateMakimaSorted(targetEnergyEvAsc, kkEnergyEvAsc, kkDeltaAsc);
}
