/**
 * kkcalc2 `asp_db_extended.extend_data_with_db` analogue for the optical-β pipeline: augments measured
 * imaginary ASF `f_2` (from β and number density) with **bundled Henke elemental tails** below the
 * first and above the last experiment energy, then linearly **rescales** measured `f_2` so its
 * makima-interpolated endpoints match compound Henke `f_2` at those merge energies (same amplitude
 * bridge as kkcalc2). The merged strictly ascending `(E, f_2)` grid is converted with
 * {@link imaginaryAsfToLinearAspCoefs} before {@link kkPpImaginaryPolyToRealAsf}; KK is still
 * evaluated only at the original measurement energies while `f_2` returned to refractive mapping
 * stays the **unextended** measured channel.
 *
 * **Low side:** Henke tabulated samples from the global database floor up through the merge lower
 * bound are prepended. **High side:** samples from just above the merge upper bound through the
 * tabulated ceiling are appended. **Overlap:** measured energies inside the merge window carry
 * rescaled `f_2` so the window endpoints align with Henke compound values (kkcalc2 `scale_data` /
 * `extend_data_with_db` intent).
 */
import {
  henkeCompoundF2AtEv,
  henkeCompositionTabulatedSpan,
} from "./kkcalc-henke-f2";

/** kkcalc2 `asp_db_im` knot grids extend to 500 keV beyond raw Henke `.nff` ceilings (~30 keV). */
const KK_HENKE_TAIL_E_MAX_EV = 500_000;

/** Dense log-spaced samples approximate kkcalc2 wide-interval polynomial tails with linear `ASF_to_ASP`. */
const KK_HENKE_TAIL_DENSE_SEGMENTS = 420;
import { interpolateMakimaSorted } from "./makima-interpolate";
import type { StoichiometryTerm } from "./kkcalc-stoichiometry";

export interface BareAtomExtensionOptions {
  /**
   * When `false`, skip Henke tail merge and use measurement-only knots (legacy CI golden path).
   * When `true` or omitted, extend with bundled Henke tables when stoichiometry is available.
   */
  readonly enabled?: boolean;
}

/**
 * Returns whether bare-atom Henke extension should run for the given options object.
 */
export function isBareAtomKkExtensionEnabled(
  options: BareAtomExtensionOptions | undefined,
): boolean {
  return options?.enabled !== false;
}

function argMaxStrictGreater(xs: readonly number[], threshold: number): number {
  for (let i = 0; i < xs.length; i++) {
    if (xs[i]! > threshold) {
      return i;
    }
  }
  return xs.length;
}

function argMaxGreaterOrEqual(xs: readonly number[], threshold: number): number {
  for (let i = 0; i < xs.length; i++) {
    if (xs[i]! >= threshold) {
      return i;
    }
  }
  return xs.length;
}

function logSpacedEnergies(eMin: number, eMax: number, count: number): number[] {
  if (!(eMax > eMin) || count < 2) {
    throw new RangeError("logSpacedEnergies requires eMax > eMin and count >= 2");
  }
  const lo = Math.log(eMin);
  const hi = Math.log(eMax);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    out.push(Math.exp(lo * (1 - t) + hi * t));
  }
  return out;
}

function denseCompoundHenkePairs(
  composition: readonly StoichiometryTerm[],
  span: { readonly maxEv: number },
  eMin: number,
  eMax: number,
  segmentBudget: number,
): { e: number; f2: number }[] {
  const eHi = Math.min(eMax, span.maxEv * (1 - 1e-12));
  if (!(eHi > eMin)) {
    return [];
  }
  const n = Math.max(2, Math.min(segmentBudget, 2000));
  const es = logSpacedEnergies(eMin, eHi, n);
  return es.map((e) => ({
    e,
    f2: henkeCompoundF2AtEv(composition, Math.min(e, span.maxEv * (1 - 1e-12))),
  }));
}

function compoundF2LogLogExtrapolationAnchors(
  composition: readonly StoichiometryTerm[],
): readonly { e: number; f2: number }[] {
  const span = henkeCompositionTabulatedSpan(composition);
  const tail = denseCompoundHenkePairs(
    composition,
    span,
    span.minEv + 1e-6,
    span.maxEv * (1 - 1e-12),
    64,
  );
  const n = tail.length;
  if (n < 2) {
    return [];
  }
  const ea = tail[n - 2]!.e;
  const eb = tail[n - 1]!.e;
  const fa = tail[n - 2]!.f2;
  const fb = tail[n - 1]!.f2;
  if (!(ea > 0) || !(eb > ea) || !(fa > 0) || !(fb > 0)) {
    return [];
  }
  const logSlope = (Math.log(fb) - Math.log(fa)) / (Math.log(eb) - Math.log(ea));
  const anchors: readonly number[] = [
    32000, 35000, 40000, 45000, 50000, 60000, 80000, 100000, 130000, 170000, 220000,
    280000, 350000, 430000, 500000,
  ];
  const out: { e: number; f2: number }[] = [];
  for (const e of anchors) {
    if (e <= eb || e > KK_HENKE_TAIL_E_MAX_EV) {
      continue;
    }
    const logf = Math.log(fb) + logSlope * (Math.log(e) - Math.log(eb));
    out.push({ e, f2: Math.exp(logf) });
  }
  return out;
}

function concatStrictAscendingUnique(
  segments: readonly (readonly { e: number; f2: number }[])[],
  epsRel = 1e-12,
): { energiesEv: number[]; f2: number[] } {
  const outE: number[] = [];
  const outF: number[] = [];
  for (const seg of segments) {
    for (const p of seg) {
      if (!Number.isFinite(p.e) || !Number.isFinite(p.f2)) {
        throw new RangeError("extended KK grid contains non-finite Henke or scaled samples");
      }
      const last = outE[outE.length - 1];
      if (last !== undefined) {
        const tol = epsRel * (1 + Math.abs(p.e));
        if (p.e <= last + tol) {
          continue;
        }
      }
      outE.push(p.e);
      outF.push(p.f2);
    }
  }
  if (outE.length < 4) {
    throw new RangeError(
      "extended imaginary ASF grid has fewer than four samples after merge",
    );
  }
  for (let i = 1; i < outE.length; i++) {
    if (!(outE[i]! > outE[i - 1]!)) {
      throw new RangeError("extended KK energy grid is not strictly ascending");
    }
  }
  return { energiesEv: outE, f2: outF };
}

export interface ExtendImaginaryAsfWithHenkeParams {
  readonly measuredEnergyEv: readonly number[];
  readonly measuredImaginaryAsf: readonly number[];
  readonly composition: readonly StoichiometryTerm[];
  readonly mergeDomain?: readonly [number, number];
}

/**
 * Builds kkcalc2-style extended `(energy, f_2)` knots for `KK_PP`: Henke tails plus rescaled
 * measured imaginary ASF on the experiment grid (see module doc).
 *
 * @param params.measuredEnergyEv Strictly ascending experiment energies in eV (length >= 4).
 * @param params.measuredImaginaryAsf Imaginary ASF `f_2` from {@link refractiveBetaToImaginaryAsf}.
 * @param params.composition Parsed stoichiometry for compound Henke summation.
 * @param params.mergeDomain Optional inclusive merge window; defaults to the full experiment span.
 * @returns Strictly ascending energies and matching `f_2` ready for {@link imaginaryAsfToLinearAspCoefs}.
 * @throws RangeError When Henke tables do not cover the merge window or scaling is degenerate.
 */
export function extendImaginaryAsfWithHenkeTails(
  params: ExtendImaginaryAsfWithHenkeParams,
): { energiesEv: number[]; f2: number[] } {
  const { measuredEnergyEv, measuredImaginaryAsf, composition } = params;
  const n = measuredEnergyEv.length;
  if (n < 4 || measuredImaginaryAsf.length !== n) {
    throw new RangeError("measuredEnergyEv and measuredImaginaryAsf must have the same length >= 4");
  }
  const mergeDomain: readonly [number, number] = params.mergeDomain ?? [
    measuredEnergyEv[0]!,
    measuredEnergyEv[n - 1]!,
  ];
  if (!(mergeDomain[1] > mergeDomain[0])) {
    throw new RangeError("mergeDomain must be strictly increasing");
  }

  const span = henkeCompositionTabulatedSpan(composition);
  if (mergeDomain[0] < span.minEv || mergeDomain[1] > span.maxEv) {
    throw new RangeError(
      `mergeDomain [${String(mergeDomain[0])}, ${String(mergeDomain[1])}] eV lies outside Henke tabulated intersection [${String(span.minEv)}, ${String(span.maxEv)}] eV`,
    );
  }

  const dataMergeRange = interpolateMakimaSorted(
    [mergeDomain[0], mergeDomain[1]],
    measuredEnergyEv,
    measuredImaginaryAsf,
  );
  const dbLo = henkeCompoundF2AtEv(composition, mergeDomain[0]);
  const dbHi = henkeCompoundF2AtEv(composition, mergeDomain[1]);
  const measLo = dataMergeRange[0]!;
  const measHi = dataMergeRange[1]!;
  const denom = measHi - measLo;
  if (!(Math.abs(denom) > 1e-300)) {
    throw new RangeError(
      "Henke merge scaling is degenerate: makima merge endpoints for measured f_2 are equal",
    );
  }
  const scale = (dbHi - dbLo) / denom;
  const scaledMeas = measuredImaginaryAsf.map(
    (y) => (y - measLo) * scale + dbLo,
  );

  const dataMergeLbIdx = argMaxGreaterOrEqual(measuredEnergyEv, mergeDomain[0]);
  let dataMergeUbIdx = argMaxStrictGreater(measuredEnergyEv, mergeDomain[1]) - 1;
  if (dataMergeUbIdx < 0) {
    dataMergeUbIdx = n - 1;
  }
  const ubEnd = dataMergeUbIdx + 1;

  const midSliceE = measuredEnergyEv.slice(dataMergeLbIdx, ubEnd);
  const midSliceF2 = scaledMeas.slice(dataMergeLbIdx, ubEnd);

  let mergeDataE = [...midSliceE];
  let mergeDataF2 = [...midSliceF2];
  if (mergeDomain[0] !== mergeDataE[0]) {
    mergeDataE = [mergeDomain[0], ...mergeDataE];
    mergeDataF2 = [dbLo, ...mergeDataF2];
  }
  if (mergeDomain[1] !== mergeDataE[mergeDataE.length - 1]) {
    mergeDataE = [...mergeDataE, mergeDomain[1]];
    mergeDataF2 = [...mergeDataF2, dbHi];
  }

  const lowPairs = denseCompoundHenkePairs(
    composition,
    span,
    span.minEv,
    mergeDomain[0],
    KK_HENKE_TAIL_DENSE_SEGMENTS,
  );
  const highPairs = denseCompoundHenkePairs(
    composition,
    span,
    mergeDomain[1],
    span.maxEv,
    KK_HENKE_TAIL_DENSE_SEGMENTS,
  );

  const midPairs = mergeDataE.map((e, i) => ({ e, f2: mergeDataF2[i]! }));

  const extrapPairs = [...compoundF2LogLogExtrapolationAnchors(composition)];

  return concatStrictAscendingUnique([lowPairs, midPairs, highPairs, extrapPairs]);
}
