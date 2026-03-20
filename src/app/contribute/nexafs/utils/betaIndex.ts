import type { SpectrumPoint } from "~/components/plots/types";
import type { BareAtomPoint } from "~/features/nexafs-contribute/types";

const HC_EV_CM = 1.23984193e-4;
const FOUR_PI = 4 * Math.PI;

function medianFinite(values: number[]): number {
  const filtered = values.filter((v) => Number.isFinite(v));
  if (filtered.length === 0) return 0;
  const sorted = filtered.sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/**
 * Compute the imaginary refractive index (beta) from NEXAFS absorption-like values.
 *
 * Derivation (common optics relation):
 *   mu(E) = 4*pi*beta(E)/lambda(E)  =>  beta(E) = mu(E)*lambda(E)/(4*pi)
 * with lambda(E) = (h*c)/E.
 *
 * In this codebase, `normalizedPoints[].absorption` and `BareAtomPoint[].absorption`
 * are treated as an absorption coefficient in compatible units (mu), and beta is returned
 * as the corresponding proportional imaginary refractive index.
 */
export function computeBetaIndex(
  normalizedPoints: SpectrumPoint[],
  energyEv: number[],
  atomicScatteringFactors: BareAtomPoint[],
): SpectrumPoint[] {
  if (normalizedPoints.length === 0) return [];

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

  // Heuristic: if normalized values are much smaller than bare-atom absorption,
  // treat them as dimensionless relative values and scale by bare-atom absorption.
  const shouldScaleByAtomic =
    atomicMedian > 0 && normalizedMedian / atomicMedian < 0.2;

  const energyFallback =
    energyEv.length > 0
      ? new Set(energyEv.filter((e) => Number.isFinite(e)))
      : null;

  return normalizedPoints.map((p) => {
    const E = p.energy;
    const lambdaCm = HC_EV_CM / E;

    const atomicAbs = atomicMap.get(E) ?? (atomicScatteringFactors[0]?.absorption ?? 1);
    const mu = shouldScaleByAtomic ? p.absorption * atomicAbs : p.absorption;

    // If input energy array was provided, require it to include this energy
    // for consistent scaling; otherwise keep computed mu as-is.
    const muAdjusted =
      energyFallback && !energyFallback.has(E) ? p.absorption : mu;

    return {
      ...p,
      absorption: (muAdjusted * lambdaCm) / FOUR_PI,
    };
  });
}

