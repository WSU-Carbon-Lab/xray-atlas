import type { SpectrumPoint } from "~/components/plots/types";
import type { DatasetState } from "../types";
import { computeBetaIndex } from "./betaIndex";
import {
  computeNormalizationForExperiment,
  computeZeroOneNormalization,
  interpolateBareMu,
} from "./core";
import { defaultNormalizationRangesFromSpectrum } from "./normalizationDefaults";

export function buildSpectrumPointsWithDerivedForUpload(
  dataset: DatasetState,
): SpectrumPoint[] {
  const points = dataset.spectrumPoints;
  if (points.length === 0) return [];

  let pre = dataset.normalizationRegions.pre;
  let post = dataset.normalizationRegions.post;
  if (!pre || !post) {
    const fallback = defaultNormalizationRangesFromSpectrum(points);
    if (fallback) {
      pre = pre ?? fallback.pre;
      post = post ?? fallback.post;
    }
  }

  const next: SpectrumPoint[] = points.map((p) => ({ ...p }));

  if (pre && post) {
    const z = computeZeroOneNormalization(points, pre, post);
    if (z) {
      for (let i = 0; i < next.length; i++) {
        const v = z.normalizedPoints[i]?.absorption;
        if (typeof v === "number" && Number.isFinite(v)) {
          const base = points[i]!;
          next[i] = { ...base, ...next[i], od: v };
        }
      }
    }
  }

  const barePts = dataset.bareAtomPoints;
  if (pre && post && barePts && barePts.length > 0) {
    const preCount = points.filter(
      (p) => p.energy >= pre[0] && p.energy <= pre[1],
    ).length;
    const postCount = points.filter(
      (p) => p.energy >= post[0] && p.energy <= post[1],
    ).length;
    if (preCount > 0 && postCount > 0) {
      const massComp = computeNormalizationForExperiment(
        points,
        barePts,
        preCount,
        postCount,
      );
      if (massComp) {
        for (let i = 0; i < next.length; i++) {
          const v = massComp.normalizedPoints[i]?.absorption;
          if (typeof v === "number" && Number.isFinite(v)) {
            const base = points[i]!;
            next[i] = { ...base, ...next[i], massabsorption: v };
          }
        }
        const uniqueEnergies = Array.from(
          new Set(points.map((p) => p.energy)),
        ).sort((a, b) => a - b);
        const atomicPoints = uniqueEnergies.map((E) => ({
          energy: E,
          absorption: interpolateBareMu(barePts, E),
        }));
        const energyEv = points.map((p) => p.energy);
        const betaArr = computeBetaIndex(
          massComp.normalizedPoints,
          energyEv,
          atomicPoints,
        );
        for (let i = 0; i < next.length; i++) {
          const v = betaArr[i]?.absorption;
          if (typeof v === "number" && Number.isFinite(v)) {
            const base = points[i]!;
            next[i] = { ...base, ...next[i], beta: v };
          }
        }
      }
    }
  }

  return next;
}
