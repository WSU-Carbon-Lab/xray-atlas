/**
 * kkcalc2 `conversions.py` refractive index and ASF scaling for X-ray energies:
 * `n = 1 - delta + i beta = 1 + (n_a r_e lambda^2)/(2 pi) (-f_1 + i f_2)` with the same prefactor
 * as kkcalc2 `refractive_to_ASF` / `ASF_to_refractive` (reverse flag).
 */
import {
  AVOGADRO,
  ELEMENTARY_CHARGE_C,
  PI,
  PLANCK_J_S,
  SPEED_OF_LIGHT_M_S,
  classicalElectronRadiusM,
} from "./kkcalc-physical-constants";

/** kkcalc2 `conversions.refractive_to_ASF` leading `1e-6` scale factor (matches vendored Python). */
const REFRACTIVE_PREFACTOR_LEAD = 1e-6;

function refractivePrefactorPerAsf(
  energyEv: readonly number[] | Float64Array,
  numberDensityAtomsPerCm3: number,
): Float64Array {
  const re = classicalElectronRadiusM();
  const hce = (PLANCK_J_S / ELEMENTARY_CHARGE_C) * SPEED_OF_LIGHT_M_S;
  const denomScale = re * hce * hce;
  const n = energyEv.length;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const ev = energyEv[i]!;
    out[i] =
      (REFRACTIVE_PREFACTOR_LEAD * 2 * PI * ev * ev) /
      (numberDensityAtomsPerCm3 * denomScale);
  }
  return out;
}

/**
 * Converts optical `beta` (imaginary refractive index component) to imaginary atomic scattering
 * factors `f_2` on the same energy samples, matching kkcalc2 `refractive_to_ASF` with `reverse=false`.
 *
 * @param energyEv Strictly positive photon energies in eV (same length as `beta`).
 * @param beta Optical absorption index component (imaginary part of `n = 1 - delta + i beta`).
 * @param numberDensityAtomsPerCm3 Material number density in atoms per cm³ (molecules counted per atom sum).
 * @returns Imaginary ASF `f_2` aligned with `energyEv`.
 */
export function refractiveBetaToImaginaryAsf(
  energyEv: readonly number[],
  beta: readonly number[],
  numberDensityAtomsPerCm3: number,
): Float64Array {
  const n = energyEv.length;
  const pref = refractivePrefactorPerAsf(energyEv, numberDensityAtomsPerCm3);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = pref[i]! * beta[i]!;
  }
  return out;
}

/**
 * kkcalc2 `ASF_to_refractive` for complex `f_1 + i f_2`: returns dispersive `delta` as the **real part**
 * of `(f_1 + i f_2) / prefactor(E)` (same as `numpy.asarray(..., complex128).real` in `run_reference.py`).
 */
export function complexAsfToDeltaOptical(
  energyEv: readonly number[],
  f1: ArrayLike<number>,
  f2: ArrayLike<number>,
  numberDensityAtomsPerCm3: number,
): Float64Array {
  const n = energyEv.length;
  const pref = refractivePrefactorPerAsf(energyEv, numberDensityAtomsPerCm3);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = f1[i]! / pref[i]!;
  }
  return out;
}

/**
 * Number density (atoms / cm³) from mass density (g/cm³) and formula mass (g/mol), kkcalc2 convention.
 */
export function numberDensityFromMassDensity(
  densityGPerCm3: number,
  formulaMassGPerMol: number,
): number {
  if (!(densityGPerCm3 > 0) || !(formulaMassGPerMol > 0)) {
    throw new RangeError(
      "densityGPerCm3 and formulaMassGPerMol must be finite and positive",
    );
  }
  return (densityGPerCm3 * AVOGADRO) / formulaMassGPerMol;
}

const ASP_ORDER_COUNT = 5;

/**
 * kkcalc2 `ASF_to_ASP`: piecewise-linear coefficients between consecutive `(energy, factor)` knots.
 * Returns shape `(energies.length - 1, 5)` with only columns 0 (slope) and 1 (intercept) non-zero,
 * matching kkcalc2 default `N=5` padding.
 */
export function imaginaryAsfToLinearAspCoefs(
  energies: readonly number[],
  factors: ArrayLike<number>,
): Float64Array {
  const m = energies.length - 1;
  if (m < 1) {
    throw new RangeError("ASF_to_ASP requires at least two energy knots");
  }
  const coefs = new Float64Array(m * ASP_ORDER_COUNT);
  for (let i = 0; i < m; i++) {
    const e0 = energies[i]!;
    const e1 = energies[i + 1]!;
    const f0 = factors[i]!;
    const f1 = factors[i + 1]!;
    const de = e1 - e0;
    if (!(de > 0)) {
      throw new RangeError("Energies must be strictly ascending for ASF_to_ASP");
    }
    const slope = (f1 - f0) / de;
    const intercept = f0 - slope * e0;
    coefs[i * ASP_ORDER_COUNT] = slope;
    coefs[i * ASP_ORDER_COUNT + 1] = intercept;
  }
  return coefs;
}
