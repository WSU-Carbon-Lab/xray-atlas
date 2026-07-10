import type { SpectrumPoint } from "~/components/plots/types";
import type { DatasetState, NormalizationRanges } from "../types";
import { buildSpectrumPointsWithDerivedForUpload } from "./uploadDerivedSpectrum";
import {
  buildQualityScores,
  buildValidationSummary,
  type ExperimentQualityScores,
  type ValidationSummary,
} from "~/server/nexafs/normalizationMetadata";

export type UploadDatasetDiagnostics = {
  derivedPoints: SpectrumPoint[];
  validationSummary: ValidationSummary;
  qualityScores: ExperimentQualityScores;
};

/**
 * Maps contribute-upload normalization scope and region handles to persisted normalization range JSON.
 *
 * @param dataset Upload draft carrying `normalizationScope` and unified pre/post windows.
 * @returns `null` when scope is `none`; otherwise unified pre/post pairs matching submit payloads.
 */
export function uploadNormalizationRangesForDataset(
  dataset: Pick<DatasetState, "normalizationScope" | "normalizationRegions">,
): NormalizationRanges {
  if (dataset.normalizationScope === "none") {
    return null;
  }
  return {
    pre: dataset.normalizationRegions.pre,
    post: dataset.normalizationRegions.post,
  };
}

/**
 * Recomputes validation checks and quality subscores from the upload draft after normalization,
 * bare-atom derivation, and optional uploaded auxiliary columns are applied.
 *
 * Uses the same {@link buildValidationSummary} and {@link buildQualityScores} helpers as ingest
 * and browse normalization save so preview and persistence stay aligned.
 *
 * @param dataset Contribute-flow dataset state including spectrum rows and normalization windows.
 * @returns Diagnostics bundle, or `null` when no finite spectrum rows exist yet.
 */
export function computeUploadDatasetDiagnostics(
  dataset: DatasetState,
): UploadDatasetDiagnostics | null {
  if (dataset.spectrumPoints.length === 0) {
    return null;
  }

  const derivedPoints = buildSpectrumPointsWithDerivedForUpload(dataset);
  if (derivedPoints.length === 0) {
    return null;
  }

  const ranges = uploadNormalizationRangesForDataset(dataset);
  const scope = dataset.normalizationScope;
  const doiPresent = dataset.sourcePaperPublications.length > 0;

  const validationSummary = buildValidationSummary({
    points: derivedPoints,
    ranges,
    scope,
    override: {
      bypass: dataset.validationOverride.bypass,
      reason: dataset.validationOverride.reason,
    },
  });

  const qualityScores = buildQualityScores({
    points: derivedPoints,
    ranges,
    scope,
    doiPresent,
  });

  return {
    derivedPoints,
    validationSummary,
    qualityScores,
  };
}
