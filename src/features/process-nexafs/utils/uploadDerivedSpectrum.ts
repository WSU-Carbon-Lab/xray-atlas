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
    const massComp = computeNormalizationForExperiment(
      points,
      barePts,
      pre,
      post,
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

  return next;
}

/**
 * Reports whether an upload **draft** dataset can run the same browser-side beta→delta
 * Kramers–Kronig path as submit-time {@link buildSpectrumPointsWithDerivedForUpload} followed by
 * {@link applyKkDeltaToSpectrumPoints} from `~/features/kk-calc`: every derived row must carry a
 * finite `beta` after OD / mass-absorption / beta derivation from normalization windows and bare
 * atom data. Returns false when there are no points or when any derived row lacks finite beta.
 *
 * @param dataset Contribute-flow dataset state (spectrum grid, normalization regions, bare atom).
 */
export function uploadDatasetHasFiniteBetaForKkOnEveryRow(
  dataset: DatasetState,
): boolean {
  const derived = buildSpectrumPointsWithDerivedForUpload(dataset);
  if (derived.length === 0) {
    return false;
  }
  return derived.every(
    (p) => typeof p.beta === "number" && Number.isFinite(p.beta),
  );
}
