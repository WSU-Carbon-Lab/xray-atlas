/**
 * Production **β → δ** pipeline mirroring kkcalc2 `refractive_to_ASF` → linear `ASF_to_ASP` →
 * `transforms.KK_PP` → `ASF_to_refractive` (`run_reference.py` `kkcalc-delta-optical-beta`), Ben Watts
 * kkcalc2 lineage. Piecewise polynomials use **only linear** coefficients between measurement knots
 * unless {@link BareAtomExtensionOptions.enabled} is not `false`, in which case measured imaginary
 * ASF is merged with bundled Henke tails per `kkcalc-bare-asf-extension.ts` before `KK_PP` (kkcalc2
 * `asp_db_im_extended` intent). Relativistic `Z^*` follows {@link ComputeDeltaFromBetaKkcalcStyleOptions.relativisticMode}
 * (default: stoichiometry correction when extension runs, `0` when measurement-only).
 */
import {
  extendImaginaryAsfWithHenkeTails,
  isBareAtomKkExtensionEnabled,
  type BareAtomExtensionOptions,
} from "./kkcalc-bare-asf-extension";
import {
  complexAsfToDeltaOptical,
  imaginaryAsfToLinearAspCoefs,
  numberDensityFromMassDensity,
  refractiveBetaToImaginaryAsf,
} from "./kkcalc-conversions";
import { kkPpImaginaryPolyToRealAsf } from "./kkcalc-kk-pp";
import {
  formulaMassFromComposition,
  parseChemicalFormula,
  relativisticCorrectionFromComposition,
} from "./kkcalc-stoichiometry";

export const DEFAULT_KK_MASS_DENSITY_G_CM3 = 1;

/**
 * Material inputs for kkcalc2-style `refractive_to_ASF` / `ASF_to_refractive` (mass density + formula).
 */
export interface KkcalcMaterialContext {
  readonly stoichiometryFormula: string;
  readonly massDensityGPerCm3: number;
  /**
   * When set with both contributor pre- and post-edge ranges, forwarded to
   * {@link ComputeDeltaFromBetaKkcalcStyleParams.henkeMergeDomain} for Henke tail merge anchoring.
   */
  readonly henkeMergeDomain?: readonly [number, number];
}

export type KkcalcRelativisticMode = "none" | "stoichiometry";

export interface ComputeDeltaFromBetaKkcalcStyleOptions {
  /**
   * Relativistic `Z^*` term added inside kkcalc2 `KK_PP`.
   *
   * - `"none"`: force `0` (matches kkcalc2 `asf_im` → `to_atomic_scattering_polynomial()` objects that
   *   carry no stoichiometry; measurement-only `run_reference.py` parity).
   * - `"stoichiometry"`: always use {@link relativisticCorrectionFromComposition}.
   * - **Omitted (default):** use stoichiometry correction when {@link isBareAtomKkExtensionEnabled} is
   *   true (kkcalc2 `asp_db_im_extended` carries stoichiometry and `kk_transform` applies
   *   `stoichiometry.relativistic_correction` even when callers pass `relativistic_correction=0.0`);
   *   use `0` when bare-atom extension is disabled.
   */
  readonly relativisticMode?: KkcalcRelativisticMode;
  /**
   * Bare-atom / Henke tail extension for `KK_PP` (default: enabled). Set `{ enabled: false }` to
   * match measurement-only kkcalc2 `asf_im` pipelines without `asp_db_im_extended`.
   */
  readonly bareAtomExtension?: BareAtomExtensionOptions;
}

function assertStrictAscendingFinite(
  energyEv: readonly number[],
  beta: readonly number[],
): void {
  const n = energyEv.length;
  if (n !== beta.length) {
    throw new RangeError("energyEv and beta must have the same length");
  }
  if (n < 4) {
    throw new RangeError(
      "Kramers-Kronig requires at least four strictly ascending energy samples",
    );
  }
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(energyEv[i]) || !Number.isFinite(beta[i])) {
      throw new RangeError("energyEv and beta must contain only finite numbers");
    }
    if (i > 0 && !(energyEv[i]! > energyEv[i - 1]!)) {
      throw new RangeError("energyEv must be strictly ascending");
    }
  }
}

export interface ComputeDeltaFromBetaKkcalcStyleParams {
  readonly energyEv: readonly number[];
  readonly beta: readonly number[];
  readonly stoichiometryFormula: string;
  readonly densityGPerCm3: number;
  /**
   * Optional inclusive Henke ASF merge interval for {@link extendImaginaryAsfWithHenkeTails}; when
   * omitted, extension uses the full measurement energy span (existing default).
   */
  readonly henkeMergeDomain?: readonly [number, number];
  readonly options?: ComputeDeltaFromBetaKkcalcStyleOptions;
}

/**
 * Computes dispersive optical `delta` on the same ascending grid as `beta` using kkcalc2's
 * piecewise-polynomial KK (`KK_PP`) path in pure TypeScript.
 *
 * @param params.energyEv Strictly ascending photon energies in eV.
 * @param params.beta Optical absorption index `beta` (`n = 1 - delta + i beta`).
 * @param params.stoichiometryFormula Hill-style formula for number density (e.g. `C72H14O2`).
 * @param params.densityGPerCm3 Mass density in g/cm³.
 * @param params.henkeMergeDomain Optional inclusive merge window for Henke tail extension; when both
 *   contributor pre-edge and post-edge ranges exist, callers may supply this instead of defaulting
 *   to the first/last measurement energy.
 * @param params.options Optional relativistic correction policy and Henke tail extension toggle.
 * @returns `delta` per energy, same convention as kkcalc2 `ASF_to_refractive(...).real`.
 * @throws RangeError On invalid grids, non-finite values, or non-positive density / formula issues.
 */
export function computeDeltaFromBetaKkcalcStyle(
  params: ComputeDeltaFromBetaKkcalcStyleParams,
): number[] {
  const {
    energyEv,
    beta,
    stoichiometryFormula,
    densityGPerCm3,
    henkeMergeDomain,
    options,
  } = params;
  assertStrictAscendingFinite(energyEv, beta);
  if (!(densityGPerCm3 > 0)) {
    throw new RangeError("densityGPerCm3 must be finite and positive");
  }

  const composition = parseChemicalFormula(stoichiometryFormula);
  const formulaMass = formulaMassFromComposition(composition);
  const nd = numberDensityFromMassDensity(densityGPerCm3, formulaMass);

  const f2 = refractiveBetaToImaginaryAsf(energyEv, beta, nd);
  const relMode = options?.relativisticMode;
  const extensionOn = isBareAtomKkExtensionEnabled(options?.bareAtomExtension);
  const relativisticCorrection =
    relMode === "none"
      ? 0
      : relMode === "stoichiometry"
        ? relativisticCorrectionFromComposition(composition)
        : extensionOn
          ? relativisticCorrectionFromComposition(composition)
          : 0;

  let segmentEnergies: readonly number[];
  let aspCoefs: Float64Array;
  if (isBareAtomKkExtensionEnabled(options?.bareAtomExtension)) {
    const ext = extendImaginaryAsfWithHenkeTails({
      measuredEnergyEv: energyEv,
      measuredImaginaryAsf: Array.from(f2),
      composition,
      mergeDomain: henkeMergeDomain,
    });
    segmentEnergies = ext.energiesEv;
    aspCoefs = imaginaryAsfToLinearAspCoefs(ext.energiesEv, ext.f2);
  } else {
    segmentEnergies = energyEv;
    aspCoefs = imaginaryAsfToLinearAspCoefs(energyEv, f2);
  }

  const f1 = kkPpImaginaryPolyToRealAsf(
    energyEv,
    segmentEnergies,
    aspCoefs,
    relativisticCorrection,
  );

  const delta = complexAsfToDeltaOptical(energyEv, f1, f2, nd);
  return Array.from(delta);
}
