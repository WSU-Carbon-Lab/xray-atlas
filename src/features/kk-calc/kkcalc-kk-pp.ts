/**
 * kkcalc2 `transforms.KK_PP`: Kramers–Kronig from imaginary piecewise polynomial (orders
 * `[1,0,-1,-2,-3]`) to real ASF on `targetEnergies`, Watts et al. piecewise-polynomial kernel.
 *
 * Transcribed from kkcalc2 `transforms.KK_PP` (PyPI `kkcalc2`, Watts et al.) for the
 * `improve_accuracy=False` measurement-grid pipeline.
 */
import { PI } from "./kkcalc-physical-constants";

const ASP_ORDER = 5;

function coef(imagCoefs: Float64Array, seg: number, k: number): number {
  return imagCoefs[seg * ASP_ORDER + k]!;
}

function pickByMask(
  values: readonly number[],
  mask: readonly boolean[],
): number[] {
  if (values.length !== mask.length) {
    throw new RangeError("pickByMask: values and mask length mismatch");
  }
  const out: number[] = [];
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) {
      out.push(values[i]!);
    }
  }
  return out;
}

/**
 * Evaluates kkcalc2 `KK_PP` at each `targetEnergies` sample.
 *
 * @param targetEnergies Photon energies in eV (evaluation grid).
 * @param segmentEnergies Strictly ascending interval boundaries, length `M+1`.
 * @param imagCoefs Row-major `(M, 5)` imaginary ASP coefficients.
 * @param relativisticCorrection Additive `Z^*` term (often `0` for optical-beta parity).
 * @returns Real ASF `f_1` at each target energy.
 */
export function kkPpImaginaryPolyToRealAsf(
  targetEnergies: readonly number[],
  segmentEnergies: readonly number[],
  imagCoefs: Float64Array,
  relativisticCorrection: number,
): Float64Array {
  const lenEn = segmentEnergies.length;
  const m = lenEn - 1;
  const nT = targetEnergies.length;
  if (imagCoefs.length !== m * ASP_ORDER) {
    throw new RangeError(
      `imagCoefs length ${imagCoefs.length} does not match ${m} segments`,
    );
  }

  const x1 = new Float64Array(m);
  const x2 = new Float64Array(m);
  for (let j = 0; j < m; j++) {
    x1[j] = segmentEnergies[j]!;
    x2[j] = segmentEnergies[j + 1]!;
  }

  const symbB = new Float64Array(nT);
  for (let ni = 0; ni < nT; ni++) {
    const eVal = targetEnergies[ni]!;
    let acc = 0;
    for (let j = 0; j < m; j++) {
      const c0 = coef(imagCoefs, j, 0);
      const c1 = coef(imagCoefs, j, 1);
      const c2 = coef(imagCoefs, j, 2);
      const c3 = coef(imagCoefs, j, 3);
      const c4 = coef(imagCoefs, j, 4);
      const X1 = x1[j]!;
      const X2 = x2[j]!;
      const E = eVal;

      const symb1 =
        (c0 * E + c1) * (X2 - X1) +
        0.5 * c0 * (X2 * X2 - X1 * X1) -
        (c3 / E + c4 * E ** -2) * Math.log(Math.abs(X2 / X1)) +
        (c4 / E) * (X2 ** -1 - X1 ** -1);

      const symb2 =
        (-c0 * E + c1) * (X2 - X1) +
        0.5 * c0 * (X2 * X2 - X1 * X1) +
        (c3 / E - c4 * E ** -2) * Math.log(Math.abs(X2 / X1)) -
        (c4 / E) * (X2 ** -1 - X1 ** -1) +
        (c0 * E * E - c1 * E + c2 - c3 * E ** -1 + c4 * E ** -2) *
          Math.log(Math.abs((X2 + E) / (X1 + E)));

      const x2Eq = X2 === E;
      const x1Eq = X1 === E;
      const symb3 =
        (1 - (x2Eq || x1Eq ? 1 : 0)) *
        (c0 * E * E + c1 * E + c2 + c3 * E ** -1 + c4 * E ** -2) *
        Math.log(Math.abs((X2 - E + (x2Eq ? 1 : 0)) / (X1 - E + (x1Eq ? 1 : 0))));

      acc += symb2 - symb1 - symb3;
    }
    symbB[ni] = acc;
  }

  const interior = lenEn - 2;
  const polesAnyCol = new Array<boolean>(interior).fill(false);
  for (let j = 0; j < interior; j++) {
    const knot = segmentEnergies[j + 1]!;
    for (let ni = 0; ni < nT; ni++) {
      if (targetEnergies[ni] === knot) {
        polesAnyCol[j] = true;
        break;
      }
    }
  }

  const eSingLen = interior + 4;
  const eSing = new Array<boolean>(eSingLen);
  eSing[0] = false;
  eSing[1] = false;
  for (let j = 0; j < interior; j++) {
    eSing[2 + j] = polesAnyCol[j]!;
  }
  eSing[eSingLen - 2] = false;
  eSing[eSingLen - 1] = false;

  const evalSing = new Array<boolean>(nT).fill(false);
  for (let ni = 0; ni < nT; ni++) {
    const ev = targetEnergies[ni]!;
    for (let j = 0; j < interior; j++) {
      if (segmentEnergies[j + 1] === ev) {
        evalSing[ni] = true;
        break;
      }
    }
  }

  const mask = eSing.slice(1, -2);
  if (mask.length !== m) {
    throw new RangeError("internal: KK_PP singularity mask length mismatch");
  }

  const x1s = pickByMask(segmentEnergies, eSing.slice(2));
  const xes = pickByMask(segmentEnergies, eSing.slice(1, -1));
  const x2s = pickByMask(segmentEnergies, eSing.slice(0, -2));

  const kCols: number[] = [];
  for (let j = 0; j < m; j++) {
    if (mask[j]) {
      kCols.push(j);
    }
  }
  if (x1s.length !== kCols.length || xes.length !== kCols.length) {
    throw new RangeError("internal: KK_PP singularity pick length mismatch");
  }

  const val = new Float64Array(kCols.length);
  for (let q = 0; q < kCols.length; q++) {
    const seg = kCols[q]!;
    const xe = xes[q]!;
    const c0 = coef(imagCoefs, seg, 0);
    const c1 = coef(imagCoefs, seg, 1);
    const c2 = coef(imagCoefs, seg, 2);
    const c3 = coef(imagCoefs, seg, 3);
    const c4 = coef(imagCoefs, seg, 4);
    const poly =
      c0 * xe * xe + c1 * xe + c2 + c3 * xe ** -1 + c4 * xe ** -2;
    val[q] = poly * Math.log(Math.abs((x2s[q]! - xe) / (x1s[q]! - xe)));
  }

  const symbSing = new Float64Array(nT);
  let vq = 0;
  for (let ni = 0; ni < nT; ni++) {
    if (evalSing[ni]) {
      symbSing[ni] = val[vq]!;
      vq += 1;
    }
  }

  const out = new Float64Array(nT);
  for (let ni = 0; ni < nT; ni++) {
    const eVal = targetEnergies[ni]!;
    out[ni] =
      (symbB[ni]! - symbSing[ni]!) / (PI * eVal) + relativisticCorrection;
  }
  return out;
}
