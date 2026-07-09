import type { SpectrumPoint } from "~/components/plots/types";
import type { BareAtomPoint } from "../types";
import { betaFromMassAbsorption } from "./opticalConstants";

/**
 * Computes beta from mass-absorption hub values without relative scaling heuristics.
 */
export function computeBetaFromMassAbsorption(
  hubPoints: SpectrumPoint[],
): SpectrumPoint[] {
  return hubPoints.map((p) => {
    const mu = p.massabsorption ?? p.absorption;
    const beta = betaFromMassAbsorption(mu, p.energy);
    return {
      ...p,
      absorption: Number.isFinite(beta) ? beta : p.absorption,
    };
  });
}

/**
 * Computes the imaginary refractive index (beta) from NEXAFS absorption-like values.
 *
 * Derivation (common optics relation):
 *   mu(E) = 4*pi*beta(E)/lambda(E)  =>  beta(E) = mu(E)*lambda(E)/(4*pi)
 * with lambda(E) = (h*c)/E.
 *
 * When `treatInputAsMassAbsorption` is true, input absorption is treated as mass absorption
 * at rho = 1 g/cm3 and converted directly. Otherwise a relative scaling heuristic may apply
 * for legacy raw mu-like traces that are dimensionless fractions of bare-atom absorption.
 */
export function computeBetaIndex(
  normalizedPoints: SpectrumPoint[],
  energyEv: number[],
  atomicScatteringFactors: BareAtomPoint[],
  options?: { treatInputAsMassAbsorption?: boolean },
): SpectrumPoint[] {
  if (normalizedPoints.length === 0) return [];

  if (options?.treatInputAsMassAbsorption) {
    return computeBetaFromMassAbsorption(normalizedPoints);
  }

  const atomicMap = new Map<number, number>();
  for (const p of atomicScatteringFactors) {
    if (Number.isFinite(p.energy) && Number.isFinite(p.absorption)) {
      atomicMap.set(p.energy, p.absorption);
    }
  }

  const atomicAbsValues = atomicScatteringFactors.map((p) => p.absorption);
  const normalizedAbsValues = normalizedPoints.map((p) => p.absorption);
  const atomicMedian = medianFinite(atomicAbsValues);
  const normalizedMedian = medianFinite(normalizedAbsValues);

  const shouldScaleByAtomic =
    atomicMedian > 0 && normalizedMedian / atomicMedian < 0.2;

  const energyFallback =
    energyEv.length > 0
      ? new Set(energyEv.filter((e) => Number.isFinite(e)))
      : null;

  return normalizedPoints.map((p) => {
    const E = p.energy;
    const atomicAbs =
      atomicMap.get(E) ?? (atomicScatteringFactors[0]?.absorption ?? 1);
    const mu = shouldScaleByAtomic ? p.absorption * atomicAbs : p.absorption;
    const muAdjusted =
      energyFallback && !energyFallback.has(E) ? p.absorption : mu;
    const beta = betaFromMassAbsorption(muAdjusted, E);
    return {
      ...p,
      absorption: Number.isFinite(beta) ? beta : p.absorption,
    };
  });
}

function medianFinite(values: number[]): number {
  const filtered = values.filter((v) => Number.isFinite(v));
  if (filtered.length === 0) return 0;
  const sorted = filtered.sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}
