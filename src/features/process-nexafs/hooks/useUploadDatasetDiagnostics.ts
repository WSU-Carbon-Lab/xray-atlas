"use client";

import { useMemo } from "react";
import type { DatasetState } from "../types";
import {
  computeUploadDatasetDiagnostics,
  type UploadDatasetDiagnostics,
} from "../utils/upload-dataset-diagnostics";

/**
 * Memoized upload diagnostics that refresh when spectrum data, normalization windows, scope,
 * uploaded channels, bare-atom inputs, or source-publication presence change.
 *
 * @param dataset Active contribute-upload dataset draft.
 * @returns Latest validation and quality scores, or `null` before spectrum rows exist.
 */
export function useUploadDatasetDiagnostics(
  dataset: DatasetState,
): UploadDatasetDiagnostics | null {
  const dependencyKey = useMemo(
    () =>
      [
        dataset.spectrumPoints.length,
        dataset.normalizationScope,
        dataset.normalizationRegions.pre?.[0] ?? "",
        dataset.normalizationRegions.pre?.[1] ?? "",
        dataset.normalizationRegions.post?.[0] ?? "",
        dataset.normalizationRegions.post?.[1] ?? "",
        dataset.validationOverride.bypass,
        dataset.validationOverride.reason,
        dataset.sourcePaperPublications.length,
        dataset.columnMappings.od ?? "",
        dataset.columnMappings.massabsorption ?? "",
        dataset.columnMappings.beta ?? "",
        dataset.columnMappings.rawabsError ?? "",
        dataset.columnMappings.odError ?? "",
        dataset.columnMappings.massabsorptionError ?? "",
        dataset.columnMappings.betaError ?? "",
        dataset.bareAtomPoints?.length ?? 0,
        dataset.normalizationTypes.absorption,
        dataset.normalizationTypes.beta,
        dataset.normalizationTypes.od,
      ].join("|"),
    [
      dataset.spectrumPoints.length,
      dataset.normalizationScope,
      dataset.normalizationRegions.pre,
      dataset.normalizationRegions.post,
      dataset.validationOverride.bypass,
      dataset.validationOverride.reason,
      dataset.sourcePaperPublications.length,
      dataset.columnMappings.od,
      dataset.columnMappings.massabsorption,
      dataset.columnMappings.beta,
      dataset.columnMappings.rawabsError,
      dataset.columnMappings.odError,
      dataset.columnMappings.massabsorptionError,
      dataset.columnMappings.betaError,
      dataset.bareAtomPoints?.length,
      dataset.normalizationTypes.absorption,
      dataset.normalizationTypes.beta,
      dataset.normalizationTypes.od,
    ],
  );

  return useMemo(
    () => computeUploadDatasetDiagnostics(dataset),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dependencyKey tracks normalization, channels, and spectrum inputs.
    [dependencyKey],
  );
}
