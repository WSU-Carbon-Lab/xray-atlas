/**
 * Scores how similar an upload spectrum is to an existing experiment the
 * contributor is already associated with (same molecule + overlapping energy).
 *
 * Excludes channel-by-channel waveform comparison; energy-span Jaccard plus
 * molecule identity drive the score. Deliberately excludes instrument/edge
 * mismatches from hard failure so near-duplicates still surface.
 */

/** Similarity payload for one candidate experiment. */
export interface DatasetSimilarityMatch {
  /** Existing experiment id. */
  experimentId: string;
  /** Optional human slug when present. */
  canonicalSlug: string | null;
  /** Similarity in `[0, 1]` (1 = identical energy span on same molecule). */
  score: number;
  /** Candidate spectrum min energy (eV). */
  minEv: number;
  /** Candidate spectrum max energy (eV). */
  maxEv: number;
}

/** One redundant pair of already-uploaded experiments on the same molecule. */
export interface DatasetSimilarPair {
  /** First experiment id (stable ordering: createdat desc then id). */
  aId: string;
  /** Second experiment id. */
  bId: string;
  /** Optional human slug for A. */
  aSlug: string | null;
  /** Optional human slug for B. */
  bSlug: string | null;
  /** Energy-span Jaccard in `[0, 1]`. */
  score: number;
  /** Display percent 0–100. */
  percent: number;
  /** A spectrum min energy (eV). */
  minEvA: number;
  /** A spectrum max energy (eV). */
  maxEvA: number;
  /** B spectrum min energy (eV). */
  minEvB: number;
  /** B spectrum max energy (eV). */
  maxEvB: number;
  /** Suggested keep id (newer of the two by createdat when known). */
  suggestedKeepId: string;
  /** Suggested absorb id (the other of the pair). */
  suggestedAbsorbId: string;
}

/** Default soft-warn threshold for contribute submit duplicate-like uploads. */
export const DATASET_SIMILARITY_WARN_THRESHOLD = 0.72;

/**
 * Computes Jaccard overlap of two closed energy intervals.
 *
 * @param aMin - First span lower bound (eV).
 * @param aMax - First span upper bound (eV).
 * @param bMin - Second span lower bound (eV).
 * @param bMax - Second span upper bound (eV).
 * @returns Overlap / union in `[0, 1]`, or `0` when either span is empty / inverted.
 */
export function energySpanJaccard(
  aMin: number,
  aMax: number,
  bMin: number,
  bMax: number,
): number {
  if (
    !Number.isFinite(aMin) ||
    !Number.isFinite(aMax) ||
    !Number.isFinite(bMin) ||
    !Number.isFinite(bMax) ||
    aMax < aMin ||
    bMax < bMin
  ) {
    return 0;
  }
  const overlapMin = Math.max(aMin, bMin);
  const overlapMax = Math.min(aMax, bMax);
  const overlap = Math.max(0, overlapMax - overlapMin);
  const union = Math.max(aMax, bMax) - Math.min(aMin, bMin);
  if (union <= 0) {
    return aMin === bMin && aMax === bMax ? 1 : 0;
  }
  return overlap / union;
}

/**
 * Builds a 0–100 display score from a unit Jaccard similarity.
 *
 * @param score - Unit interval similarity from {@link energySpanJaccard}.
 * @returns Integer percent in `0…100`.
 */
export function datasetSimilarityPercent(score: number): number {
  if (!Number.isFinite(score) || score <= 0) {
    return 0;
  }
  return Math.min(100, Math.round(score * 100));
}

/**
 * Picks the highest-scoring match at or above `threshold`.
 *
 * @param matches - Candidate similarity rows.
 * @param threshold - Inclusive unit threshold (default {@link DATASET_SIMILARITY_WARN_THRESHOLD}).
 * @returns Best match, or `null` when none meet the threshold.
 */
export function bestSimilarityAboveThreshold(
  matches: readonly DatasetSimilarityMatch[],
  threshold: number = DATASET_SIMILARITY_WARN_THRESHOLD,
): DatasetSimilarityMatch | null {
  const ranked = similaritiesAboveThreshold(matches, threshold);
  return ranked[0] ?? null;
}

/**
 * Lists matches at or above `threshold`, highest score first.
 *
 * @param matches - Candidate similarity rows.
 * @param threshold - Inclusive unit threshold (default {@link DATASET_SIMILARITY_WARN_THRESHOLD}).
 * @returns Sorted copy of qualifying matches (empty when none qualify).
 */
export function similaritiesAboveThreshold(
  matches: readonly DatasetSimilarityMatch[],
  threshold: number = DATASET_SIMILARITY_WARN_THRESHOLD,
): DatasetSimilarityMatch[] {
  return [...matches]
    .filter((match) => match.score >= threshold)
    .sort((a, b) => b.score - a.score);
}
