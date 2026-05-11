/**
 * Bundled Henke-style tabulated imaginary atomic scattering factors `f_2` (Henke `.nff` lineage via
 * kkcalc2 `asf_database/db_data`) for client-side KK tail extension. The JSON is generated offline
 * (~475 KiB for 92 elements, 320 subsampled knots each) by
 * `tests/kk-calc-validation/tools/gen_henke_element_f2_bundle.py` from vendor `.nff` files; subsampling
 * trades disk size against tail smoothness compared to full kkcalc polynomial grids.
 *
 * This module does **not** fetch cxro.lbl.gov at runtime; missing symbols throw at evaluation time.
 */
import henkeElementF2Bundle from "./kkcalc-henke-element-f2.bundle.json" with { type: "json" };
import {
  elementSymbolFromAtomicNumber,
  type StoichiometryTerm,
} from "./kkcalc-stoichiometry";

export interface HenkeElementF2Table {
  readonly energiesEv: readonly number[];
  readonly f2: readonly number[];
}

export type HenkeElementF2Bundle = Readonly<Record<string, HenkeElementF2Table>>;

const BUNDLE = henkeElementF2Bundle as HenkeElementF2Bundle;

function linearInterpSortedEval(
  x: readonly number[],
  y: readonly number[],
  xq: number,
): number {
  const n = x.length;
  if (xq < x[0]! || xq > x[n - 1]!) {
    throw new RangeError(
      `linearInterpSortedEval: xq=${String(xq)} outside Henke table span [${String(x[0])}, ${String(x[n - 1])}]`,
    );
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
  const x0 = x[lo]!;
  const x1 = x[hi]!;
  const t = (xq - x0) / (x1 - x0);
  return y[lo]! * (1 - t) + y[hi]! * t;
}

/**
 * Evaluates bundled Henke `f_2` for one element at photon energy `energyEv` (eV) by linear interpolation
 * on the subsampled `.nff` grid.
 *
 * @param elementSymbol Element symbol (e.g. `C`, `Fe`); case-insensitive lookup against the bundle.
 * @param energyEv Photon energy in eV; must lie within that element's tabulated span.
 * @returns Interpolated `f_2` in the same Henke units as kkcalc2 ASF imaginary factors.
 * @throws RangeError When the symbol is absent from the bundle or `energyEv` is outside the table.
 */
export function henkeElementF2AtEv(
  elementSymbol: string,
  energyEv: number,
): number {
  const key = elementSymbol.trim();
  const tab = BUNDLE[key];
  if (tab == null) {
    throw new RangeError(`Henke bundle has no table for element: ${elementSymbol}`);
  }
  return linearInterpSortedEval(tab.energiesEv, tab.f2, energyEv);
}

/**
 * Evaluates stoichiometry-weighted compound Henke `f_2(E)` as the sum `sum_i n_i f_{2,i}(E)` using
 * bundled per-element tables (kkcalc2 linear combination of elemental imaginary ASF).
 *
 * @param composition Consolidated `(Z, count)` terms from {@link parseChemicalFormula}.
 * @param energyEv Photon energy in eV; must lie within the intersection of all element table spans
 *   (typically tens of eV through tens of keV for light organics).
 * @returns Compound imaginary ASF `f_2` in Henke / kkcalc2 ASF units.
 * @throws RangeError When any element table does not cover `energyEv`.
 */
export function henkeCompoundF2AtEv(
  composition: readonly StoichiometryTerm[],
  energyEv: number,
): number {
  let s = 0;
  for (const { atomicNumber, count } of composition) {
    const sym = elementSymbolFromAtomicNumber(atomicNumber);
    s += count * henkeElementF2AtEv(sym, energyEv);
  }
  return s;
}

/**
 * Builds a strictly ascending union energy grid from bundled tables for every distinct element in
 * `composition`, restricted to `[eMinEv, eMaxEv]`, for kkcalc2-style merge with measured data.
 *
 * @param composition Consolidated stoichiometry terms.
 * @param eMinEv Lower photon energy bound (eV), inclusive.
 * @param eMaxEv Upper photon energy bound (eV), inclusive.
 * @returns Sorted unique energies and matching compound `f_2` samples aligned to kkcalc2 Henke sums.
 * @throws RangeError When the energy window is invalid or no sample lies in-range for some element.
 */
/**
 * Returns the intersection of tabulated energy spans across all elements in `composition`.
 *
 * @param composition Consolidated stoichiometry terms.
 * @throws RangeError When any element table is missing from the bundle.
 */
export function henkeCompositionTabulatedSpan(
  composition: readonly StoichiometryTerm[],
): { minEv: number; maxEv: number } {
  const zs = new Set<number>();
  for (const t of composition) {
    zs.add(t.atomicNumber);
  }
  let minEv = -Infinity;
  let maxEv = Infinity;
  for (const z of zs) {
    const sym = elementSymbolFromAtomicNumber(z);
    const tab = BUNDLE[sym];
    if (tab == null) {
      throw new RangeError(`Henke bundle has no table for Z=${String(z)}`);
    }
    const lo = tab.energiesEv[0]!;
    const hi = tab.energiesEv[tab.energiesEv.length - 1]!;
    minEv = Math.max(minEv, lo);
    maxEv = Math.min(maxEv, hi);
  }
  if (!(maxEv > minEv)) {
    throw new RangeError("Henke tables for this composition have empty energy span intersection");
  }
  return { minEv, maxEv };
}

export function henkeCompoundGridInRange(
  composition: readonly StoichiometryTerm[],
  eMinEv: number,
  eMaxEv: number,
): { energiesEv: number[]; f2: number[] } {
  if (!(eMaxEv > eMinEv) || !Number.isFinite(eMinEv) || !Number.isFinite(eMaxEv)) {
    throw new RangeError("eMinEv and eMaxEv must be finite with eMaxEv > eMinEv");
  }
  const zs = new Set<number>();
  for (const t of composition) {
    zs.add(t.atomicNumber);
  }
  const merged = new Set<number>();
  for (const z of zs) {
    const sym = elementSymbolFromAtomicNumber(z);
    const tab = BUNDLE[sym];
    if (tab == null) {
      throw new RangeError(`Henke bundle has no table for Z=${String(z)}`);
    }
    for (const e of tab.energiesEv) {
      if (e >= eMinEv && e <= eMaxEv) {
        merged.add(e);
      }
    }
  }
  const energiesEv = Array.from(merged).sort((a, b) => a - b);
  if (energiesEv.length < 2) {
    throw new RangeError(
      "Henke compound grid has fewer than two samples in the requested energy window",
    );
  }
  const f2 = energiesEv.map((e) => henkeCompoundF2AtEv(composition, e));
  return { energiesEv, f2 };
}
