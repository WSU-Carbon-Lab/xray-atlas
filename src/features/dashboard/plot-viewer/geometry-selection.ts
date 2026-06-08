import type { SpectrumPoint } from "~/components/plots/types";
import { collectGeometryOptions, geometryKeyFromPoint } from "./geometry-keys";

/**
 * Collects stable geometry keys present in `points`.
 */
export function geometryKeysForPoints(
  points: readonly SpectrumPoint[],
): string[] {
  return collectGeometryOptions(points).map((option) => option.key);
}

/**
 * Unions `addedDatasetKeys` into `currentKeys`; when `currentKeys` is empty, returns a copy of `addedDatasetKeys`.
 */
export function mergeGeometryKeysOnDatasetAdd(
  currentKeys: readonly string[],
  addedDatasetKeys: readonly string[],
): string[] {
  if (addedDatasetKeys.length === 0) {
    return [...currentKeys];
  }
  if (currentKeys.length === 0) {
    return [...addedDatasetKeys];
  }
  const merged = new Set(currentKeys);
  for (const key of addedDatasetKeys) {
    merged.add(key);
  }
  return [...merged];
}

/**
 * Drops keys that belonged only to a removed dataset while preserving keys still required by `remainingKeysUnion`.
 */
export function pruneGeometryKeysOnDatasetRemove(
  currentKeys: readonly string[],
  removedDatasetKeys: readonly string[],
  remainingKeysUnion: ReadonlySet<string>,
): string[] {
  const removed = new Set(removedDatasetKeys);
  return currentKeys.filter((key) => {
    if (remainingKeysUnion.has(key)) {
      return true;
    }
    return !removed.has(key);
  });
}

/**
 * Intersects `currentKeys` with loaded dataset geometries, then merges keys when a newly loaded
 * dataset does not overlap the surviving selection.
 */
export function reconcileGeometryKeysAfterSpectraLoad(
  datasetIds: readonly string[],
  currentKeys: readonly string[],
  spectraByExperimentId: ReadonlyMap<string, SpectrumPoint[]>,
): string[] {
  const validUnion = unionGeometryKeysForDatasets(
    datasetIds,
    spectraByExperimentId,
  );
  let next = currentKeys.filter((key) => validUnion.has(key));
  for (const experimentId of datasetIds) {
    const points = spectraByExperimentId.get(experimentId);
    if (points == null || points.length === 0) {
      continue;
    }
    const datasetKeys = geometryKeysForPoints(points);
    if (datasetKeys.length === 0) {
      continue;
    }
    const hasOverlap = datasetKeys.some((key) => next.includes(key));
    if (!hasOverlap) {
      next = mergeGeometryKeysOnDatasetAdd(next, datasetKeys);
    }
  }
  return next.filter((key) => validUnion.has(key));
}

/**
 * Returns true when two geometry key lists contain the same keys regardless of order.
 */
export function geometryKeySetsEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const rightSet = new Set(right);
  return left.every((key) => rightSet.has(key));
}

/**
 * Builds the union of geometry keys across `datasetIds` using loaded spectrum rows.
 */
export function unionGeometryKeysForDatasets(
  datasetIds: readonly string[],
  spectraByExperimentId: ReadonlyMap<string, SpectrumPoint[]>,
): Set<string> {
  const union = new Set<string>();
  for (const experimentId of datasetIds) {
    for (const key of geometryKeysForPoints(
      spectraByExperimentId.get(experimentId) ?? [],
    )) {
      union.add(key);
    }
  }
  return union;
}

export { geometryKeyFromPoint };
