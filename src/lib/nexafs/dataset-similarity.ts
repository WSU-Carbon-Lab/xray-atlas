/**
 * Scores how similar an upload spectrum is to an existing experiment the
 * contributor is already associated with (same molecule + overlapping energy).
 *
 * Energy-span Jaccard ranks near-duplicates. Merge candidacy additionally
 * requires compatible detection mode and overlapping polarization geometry
 * sets so a single transmission geometry is never suggested as redundant
 * with an angle-resolved yield series. Waveform comparison is out of scope.
 */

import { spectrumGeometryKeyFromPoint } from "~/lib/nexafs/spectrum-geometry-key";

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
 * Minimum geometry-key Jaccard for two experiments to be merge candidates.
 * A singleton θ/φ versus an angle series (1/5 = 0.2) stays below this floor.
 */
export const DATASET_SIMILARITY_GEOMETRY_MIN_JACCARD = 0.5;

/** Detection modes that must match when both experiments declare a type. */
export const NEXAFS_MERGE_EXPERIMENT_TYPES = [
  "TOTAL_ELECTRON_YIELD",
  "PARTIAL_ELECTRON_YIELD",
  "FLUORESCENT_YIELD",
  "TRANSMISSION",
] as const;

/** Experiment-type token used when gating merge candidacy. */
export type NexafsMergeExperimentType =
  (typeof NEXAFS_MERGE_EXPERIMENT_TYPES)[number];

/** Why a high energy-span score is still not a merge candidate. */
export type MergeCandidacyRejectReason =
  | "energy_span"
  | "geometry_sets"
  | "experiment_type";

/** Result of {@link evaluateMergeCandidacy}. */
export interface MergeCandidacyResult {
  /** True when energy, geometries, and detection mode all qualify. */
  ok: boolean;
  /** Rejection discriminant, or null when {@link ok} is true. */
  reason: MergeCandidacyRejectReason | null;
  /** Reader-facing explanation when {@link ok} is false. */
  detail: string;
}

/** One experiment row used to enumerate merge-candidate pairs. */
export interface SimilarPairCandidateRow {
  /** Experiment UUID. */
  id: string;
  /** Optional human slug. */
  canonicalslug: string | null;
  /** Upload time used to suggest Keep (newer) vs Absorb. */
  createdat: Date;
  /** Declared detection mode, or null when unset. */
  experimenttype: NexafsMergeExperimentType | null;
}

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

/**
 * Maps a stored or upload experiment-type string onto the merge-candidacy union.
 *
 * @param value - Prisma `ExperimentType`, contribute option, or null/empty.
 * @returns The token when it is one of {@link NEXAFS_MERGE_EXPERIMENT_TYPES}; otherwise null.
 */
export function parseNexafsMergeExperimentType(
  value: string | null | undefined,
): NexafsMergeExperimentType | null {
  if (value == null || value.length === 0) {
    return null;
  }
  for (const token of NEXAFS_MERGE_EXPERIMENT_TYPES) {
    if (value === token) {
      return token;
    }
  }
  return null;
}

/**
 * Collects unique polarization geometry keys from spectrum points.
 *
 * @param points - Rows that may carry finite `theta` and `phi`.
 * @returns Distinct `theta:phi` or `fixed` keys in first-seen order.
 */
export function uniqueGeometryKeysFromPoints(
  points: readonly { readonly theta?: number; readonly phi?: number }[],
): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const point of points) {
    const key = spectrumGeometryKeyFromPoint(point);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    keys.push(key);
  }
  return keys;
}

/**
 * Computes Jaccard overlap of two geometry-key sets.
 *
 * @param keysA - Geometry keys on the first experiment (`theta:phi` or `fixed`).
 * @param keysB - Geometry keys on the second experiment.
 * @returns Intersection / union in `[0, 1]`. Both empty yields `1` so missing
 *   polarization metadata does not hard-fail energy-only legacy rows; one empty
 *   set versus a non-empty set yields `0`.
 */
export function geometryKeySetJaccard(
  keysA: readonly string[],
  keysB: readonly string[],
): number {
  const setA = new Set(keysA);
  const setB = new Set(keysB);
  if (setA.size === 0 && setB.size === 0) {
    return 1;
  }
  if (setA.size === 0 || setB.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const key of setA) {
    if (setB.has(key)) {
      intersection += 1;
    }
  }
  const union = setA.size + setB.size - intersection;
  if (union <= 0) {
    return 0;
  }
  return intersection / union;
}

/**
 * Reports whether two declared detection modes may be merged.
 *
 * Transmission versus TEY/PEY/FY is never compatible. Unset types do not block.
 *
 * @param typeA - First experiment type, or null when unknown.
 * @param typeB - Second experiment type, or null when unknown.
 */
export function areExperimentTypesMergeCompatible(
  typeA: NexafsMergeExperimentType | null,
  typeB: NexafsMergeExperimentType | null,
): boolean {
  if (typeA == null || typeB == null) {
    return true;
  }
  return typeA === typeB;
}

function isSingletonVersusAngleSeries(
  keysA: readonly string[],
  keysB: readonly string[],
): boolean {
  const sizeA = new Set(keysA).size;
  const sizeB = new Set(keysB).size;
  return (sizeA === 1 && sizeB > 1) || (sizeB === 1 && sizeA > 1);
}

/**
 * Builds reader-facing copy for a merge-candidacy rejection.
 *
 * @param reason - Discriminant from {@link evaluateMergeCandidacy}.
 * @param keysA - Geometry keys on the first experiment.
 * @param keysB - Geometry keys on the second experiment.
 */
export function describeMergeCandidacyReject(
  reason: MergeCandidacyRejectReason,
  keysA: readonly string[],
  keysB: readonly string[],
): string {
  switch (reason) {
    case "energy_span":
      return "Energy spans do not overlap enough to treat these as the same measurement.";
    case "experiment_type":
      return "Detection modes differ (for example transmission versus TEY). Keep both as unique experiments.";
    case "geometry_sets":
      if (isSingletonVersusAngleSeries(keysA, keysB)) {
        return "One dataset is a single geometry; the other is an angle series. Absorb-only θ/φ would be copied onto Keep, which is not a redundant merge.";
      }
      return "Polarization geometry sets overlap too little to treat these as the same experiment.";
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

/**
 * Decides whether two datasets are merge candidates.
 *
 * Energy Jaccard must meet `energyThreshold`. When both sides declare a
 * detection mode they must be equal. Geometry-key Jaccard must meet
 * {@link DATASET_SIMILARITY_GEOMETRY_MIN_JACCARD} so a singleton transmission
 * geometry is not merged with an angle-resolved series that happens to share
 * one θ/φ and a similar C K energy span.
 *
 * @param args.energyScore - {@link energySpanJaccard} in `[0, 1]`.
 * @param args.energyThreshold - Inclusive energy floor (default {@link DATASET_SIMILARITY_WARN_THRESHOLD}).
 * @param args.geometryKeysA - Distinct geometry keys on the first dataset.
 * @param args.geometryKeysB - Distinct geometry keys on the second dataset.
 * @param args.experimentTypeA - Declared type on the first dataset, or null.
 * @param args.experimentTypeB - Declared type on the second dataset, or null.
 * @param args.geometryMinJaccard - Inclusive geometry floor (default {@link DATASET_SIMILARITY_GEOMETRY_MIN_JACCARD}).
 */
export function evaluateMergeCandidacy(args: {
  energyScore: number;
  energyThreshold?: number;
  geometryKeysA: readonly string[];
  geometryKeysB: readonly string[];
  experimentTypeA: NexafsMergeExperimentType | null;
  experimentTypeB: NexafsMergeExperimentType | null;
  geometryMinJaccard?: number;
}): MergeCandidacyResult {
  const energyThreshold =
    args.energyThreshold ?? DATASET_SIMILARITY_WARN_THRESHOLD;
  const geometryMinJaccard =
    args.geometryMinJaccard ?? DATASET_SIMILARITY_GEOMETRY_MIN_JACCARD;
  if (!(args.energyScore >= energyThreshold)) {
    return {
      ok: false,
      reason: "energy_span",
      detail: describeMergeCandidacyReject(
        "energy_span",
        args.geometryKeysA,
        args.geometryKeysB,
      ),
    };
  }
  if (
    !areExperimentTypesMergeCompatible(
      args.experimentTypeA,
      args.experimentTypeB,
    )
  ) {
    return {
      ok: false,
      reason: "experiment_type",
      detail: describeMergeCandidacyReject(
        "experiment_type",
        args.geometryKeysA,
        args.geometryKeysB,
      ),
    };
  }
  const geometryScore = geometryKeySetJaccard(
    args.geometryKeysA,
    args.geometryKeysB,
  );
  if (geometryScore < geometryMinJaccard) {
    return {
      ok: false,
      reason: "geometry_sets",
      detail: describeMergeCandidacyReject(
        "geometry_sets",
        args.geometryKeysA,
        args.geometryKeysB,
      ),
    };
  }
  return { ok: true, reason: null, detail: "" };
}

/**
 * Enumerates merge-candidate pairs from energy spans, geometry keys, and types.
 *
 * Sorts by energy Jaccard descending. Does not slice; callers apply `limit`.
 *
 * @param rows - Experiments already authorized for edit on this molecule.
 * @param energyById - Min/max `energyev` per experiment id.
 * @param geometryKeysById - Distinct geometry keys per experiment id.
 * @param threshold - Inclusive energy Jaccard floor.
 */
export function enumerateDatasetSimilarPairs(args: {
  rows: readonly SimilarPairCandidateRow[];
  energyById: ReadonlyMap<
    string,
    { minEv: number | null; maxEv: number | null }
  >;
  geometryKeysById: ReadonlyMap<string, readonly string[]>;
  threshold: number;
}): DatasetSimilarPair[] {
  const pairs: DatasetSimilarPair[] = [];
  for (let i = 0; i < args.rows.length; i++) {
    const a = args.rows[i]!;
    const energyA = args.energyById.get(a.id);
    if (
      energyA?.minEv == null ||
      energyA.maxEv == null ||
      !Number.isFinite(energyA.minEv) ||
      !Number.isFinite(energyA.maxEv)
    ) {
      continue;
    }
    const keysA = args.geometryKeysById.get(a.id) ?? [];
    for (let j = i + 1; j < args.rows.length; j++) {
      const b = args.rows[j]!;
      const energyB = args.energyById.get(b.id);
      if (
        energyB?.minEv == null ||
        energyB.maxEv == null ||
        !Number.isFinite(energyB.minEv) ||
        !Number.isFinite(energyB.maxEv)
      ) {
        continue;
      }
      const score = energySpanJaccard(
        energyA.minEv,
        energyA.maxEv,
        energyB.minEv,
        energyB.maxEv,
      );
      const keysB = args.geometryKeysById.get(b.id) ?? [];
      const candidacy = evaluateMergeCandidacy({
        energyScore: score,
        energyThreshold: args.threshold,
        geometryKeysA: keysA,
        geometryKeysB: keysB,
        experimentTypeA: a.experimenttype,
        experimentTypeB: b.experimenttype,
      });
      if (!candidacy.ok) {
        continue;
      }
      const aIsNewer = a.createdat >= b.createdat;
      pairs.push({
        aId: a.id,
        bId: b.id,
        aSlug: a.canonicalslug,
        bSlug: b.canonicalslug,
        score,
        percent: datasetSimilarityPercent(score),
        minEvA: energyA.minEv,
        maxEvA: energyA.maxEv,
        minEvB: energyB.minEv,
        maxEvB: energyB.maxEv,
        suggestedKeepId: aIsNewer ? a.id : b.id,
        suggestedAbsorbId: aIsNewer ? b.id : a.id,
      });
    }
  }
  pairs.sort((left, right) => right.score - left.score);
  return pairs;
}
