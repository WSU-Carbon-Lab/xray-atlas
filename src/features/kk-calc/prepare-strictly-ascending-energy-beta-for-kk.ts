/**
 * Normalizes `(energyEv, beta)` samples before kkcalc2-style {@link computeDeltaFromBetaKkcalcStyle}
 * transforms, which require strictly ascending finite energies. Used when bare-atom grids or
 * {@link computeBetaIndex} outputs can repeat energies or arrive out of order.
 */

export interface AscendingEnergyBetaGrid {
  readonly energyEv: number[];
  readonly beta: number[];
}

/**
 * Sorts by ascending photon energy, merges consecutive duplicate energies by averaging `beta`,
 * and returns parallel arrays suitable for `computeDeltaFromBetaKkcalcStyle` and makima alignment.
 *
 * @param energyEv Photon energies in eV (any order; duplicates allowed).
 * @param beta Optical `beta` aligned index-wise with `energyEv`.
 * @returns Finite-only pairs on a strictly ascending energy axis after duplicate-energy collapse.
 * @throws RangeError When `energyEv` and `beta` lengths differ.
 */
export function prepareStrictlyAscendingEnergyBetaForKk(
  energyEv: readonly number[],
  beta: readonly number[],
): AscendingEnergyBetaGrid {
  if (energyEv.length !== beta.length) {
    throw new RangeError("energyEv and beta must have the same length");
  }
  type Pair = { readonly e: number; readonly b: number };
  const pairs: Pair[] = [];
  for (let i = 0; i < energyEv.length; i++) {
    const e = energyEv[i]!;
    const b = beta[i]!;
    if (Number.isFinite(e) && Number.isFinite(b)) {
      pairs.push({ e, b });
    }
  }
  pairs.sort((a, b) => a.e - b.e);
  const outE: number[] = [];
  const outB: number[] = [];
  let runE: number | null = null;
  let runSumB = 0;
  let runCount = 0;
  const flushRun = () => {
    if (runE == null || runCount === 0) {
      return;
    }
    outE.push(runE);
    outB.push(runSumB / runCount);
    runE = null;
    runSumB = 0;
    runCount = 0;
  };
  for (const p of pairs) {
    if (runE === null) {
      runE = p.e;
      runSumB = p.b;
      runCount = 1;
      continue;
    }
    if (p.e === runE) {
      runSumB += p.b;
      runCount += 1;
      continue;
    }
    flushRun();
    runE = p.e;
    runSumB = p.b;
    runCount = 1;
  }
  flushRun();
  return { energyEv: outE, beta: outB };
}
