import type { DatasetState } from "../types";

/**
 * Owns identity matching for contribute spectrum re-drops: an unsubmitted tab
 * whose `fileName` matches the incoming file is replaced in place instead of
 * minting a duplicate dataset. Persisted experiments are never overwritten.
 */

/**
 * Normalizes a contribute upload identity for case-insensitive filename matching.
 */
export function spectrumUploadIdentity(fileName: string): string {
  return fileName.trim().toLowerCase();
}

/**
 * Finds an unsubmitted dataset whose display `fileName` matches `identity`.
 */
export function findReplaceableUnsubmittedDataset(
  datasets: readonly DatasetState[],
  identity: string,
): DatasetState | undefined {
  const needle = spectrumUploadIdentity(identity);
  if (!needle) {
    return undefined;
  }
  return datasets.find(
    (dataset) =>
      !dataset.persistedExperimentId &&
      spectrumUploadIdentity(dataset.fileName) === needle,
  );
}

/**
 * Copies contributor metadata from an existing unsubmitted tab onto a freshly
 * parsed incoming dataset so a re-drop refreshes spectrum rows without losing
 * molecule, instrument, edge, attribution, or sample fields.
 */
export function applyIncomingSpectrumOntoUnsubmittedDataset(
  incoming: DatasetState,
  existing: DatasetState | undefined,
): DatasetState {
  if (!existing) {
    return incoming;
  }
  return {
    ...incoming,
    id: existing.id,
    moleculeId: existing.moleculeId ?? incoming.moleculeId,
    moleculeLocked: existing.moleculeLocked || incoming.moleculeLocked,
    instrumentId: existing.instrumentId || incoming.instrumentId,
    edgeId: existing.edgeId || incoming.edgeId,
    experimentType: existing.experimentType || incoming.experimentType,
    calibrationId: existing.calibrationId || incoming.calibrationId,
    referenceStandard: existing.referenceStandard || incoming.referenceStandard,
    isStandard: existing.isStandard || incoming.isStandard,
    attributions:
      existing.attributions.length > 0
        ? existing.attributions
        : incoming.attributions,
    collectedByUserIds:
      existing.collectedByUserIds.length > 0
        ? existing.collectedByUserIds
        : incoming.collectedByUserIds,
    sampleInfo: existing.sampleInfo,
    sampleAux: existing.sampleAux,
    sourcePaperPublications:
      existing.sourcePaperPublications.length > 0
        ? existing.sourcePaperPublications
        : incoming.sourcePaperPublications,
    pendingExperimentAuxFiles: existing.pendingExperimentAuxFiles,
    pendingSampleAuxFiles: existing.pendingSampleAuxFiles,
    computeKkDeltaOnSubmit: existing.computeKkDeltaOnSubmit,
  };
}

/**
 * Replaces the dataset with the same `id`, or appends when no match exists.
 */
export function upsertDatasetById(
  datasets: readonly DatasetState[],
  incoming: DatasetState,
): DatasetState[] {
  const index = datasets.findIndex((dataset) => dataset.id === incoming.id);
  if (index < 0) {
    return [...datasets, incoming];
  }
  const next = [...datasets];
  next[index] = incoming;
  return next;
}
