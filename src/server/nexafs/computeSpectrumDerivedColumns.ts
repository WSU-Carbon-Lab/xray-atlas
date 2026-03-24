import type { SpectrumPoint } from "~/components/plots/types";
import type { BareAtomPoint } from "~/features/process-nexafs/types";
import {
  computeNormalizationForExperiment,
  computeZeroOneNormalization,
  interpolateBareMu,
} from "~/features/process-nexafs/utils/core";
import { defaultNormalizationRangesFromSpectrum } from "~/features/process-nexafs/utils/normalizationDefaults";
import { computeBetaIndex } from "~/features/process-nexafs/utils/betaIndex";
import { computeBareAtomAbsorption } from "~/server/utils/cxro";

export function coalesceUploadedOrDerived(
  uploaded: number | undefined,
  derived: number | null,
): number | null {
  if (typeof uploaded === "number" && Number.isFinite(uploaded)) {
    return uploaded;
  }
  if (typeof derived === "number" && Number.isFinite(derived)) {
    return derived;
  }
  return null;
}

export type SpectrumDerivedScalarColumns = {
  od: Array<number | null>;
  massabsorption: Array<number | null>;
  beta: Array<number | null>;
};

function nullColumn(n: number): Array<number | null> {
  return Array.from({ length: n }, () => null);
}

export async function computeSpectrumDerivedScalarColumns(
  points: SpectrumPoint[],
  chemicalFormula: string | null,
): Promise<SpectrumDerivedScalarColumns> {
  const n = points.length;
  if (n === 0) {
    return { od: [], massabsorption: [], beta: [] };
  }
  let od = nullColumn(n);
  let massabsorption = nullColumn(n);
  let beta = nullColumn(n);
  const ranges = defaultNormalizationRangesFromSpectrum(points);
  if (ranges) {
    const odComp = computeZeroOneNormalization(points, ranges.pre, ranges.post);
    if (odComp) {
      od = odComp.normalizedPoints.map((p) => p.absorption);
    }
  }
  const formula = chemicalFormula?.trim() ?? "";
  if (!formula || !ranges) {
    return { od, massabsorption, beta };
  }
  let barePoints: BareAtomPoint[] = [];
  try {
    const bareMu = await computeBareAtomAbsorption(formula, { density: 1 });
    barePoints = bareMu
      .map((p) => ({ energy: p.energyEv, absorption: p.mu }))
      .sort((a, b) => a.energy - b.energy);
  } catch {
    return { od, massabsorption, beta };
  }
  if (barePoints.length === 0) {
    return { od, massabsorption, beta };
  }
  const preCount = points.filter(
    (p) => p.energy >= ranges.pre[0] && p.energy <= ranges.pre[1],
  ).length;
  const postCount = points.filter(
    (p) => p.energy >= ranges.post[0] && p.energy <= ranges.post[1],
  ).length;
  const massComp = computeNormalizationForExperiment(
    points,
    barePoints,
    preCount,
    postCount,
  );
  if (!massComp) {
    return { od, massabsorption, beta };
  }
  massabsorption = massComp.normalizedPoints.map((p) => p.absorption);
  const uniqueEnergies = Array.from(new Set(points.map((p) => p.energy))).sort(
    (a, b) => a - b,
  );
  const atomicPoints = uniqueEnergies.map((E) => ({
    energy: E,
    absorption: interpolateBareMu(barePoints, E),
  }));
  const energyEv = points.map((p) => p.energy);
  const betaComp = computeBetaIndex(
    massComp.normalizedPoints,
    energyEv,
    atomicPoints,
  );
  beta = betaComp.map((p) => p.absorption);
  return { od, massabsorption, beta };
}
