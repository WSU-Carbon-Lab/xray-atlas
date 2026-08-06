export {
  toNumber,
  extractAtomsFromFormula,
  extractGeometryPairs,
  formatStatNumber,
  analyzeNumericColumns,
  computeZeroOneNormalization,
  computeNormalizationForExperiment,
  interpolateBareMu,
  rangesApproximatelyEqual,
  countPointsWithinRange,
  buildSpectrumStats,
} from "./core";
export type {
  NumericColumnReport,
  BareAtomPointLegacy,
  NormalizationComputation,
} from "./core";
export {
  parseNexafsFilename,
  normalizeEdge,
  normalizeExperimentMode,
  normalizeFacilityToken,
  matchInstrumentIdFromParsedNexafsFilename,
  isSpectrumUploadFileName,
  moleculeLookupTokens,
  experimentTypeFromParsedFilename,
} from "./filenameParser";
export type {
  ParsedFilename,
  InstrumentMatchOption,
  ExperimentTypeFromFilename,
} from "./filenameParser";
export { parseNexafsJson } from "./jsonParser";
export type { NEXAFSJsonData, NexafsJsonDocumentMetadata } from "./jsonParser";
export { buildNexafsUploadAutofill } from "./nexafsUploadAutofill";
export { detectPeaks, convertToPeakData } from "./peakDetection";
export type { PeakDetectionOptions, DetectedPeak } from "./peakDetection";
export { calculateDifferenceSpectra } from "./differenceSpectra";
export type { DifferenceSpectrum } from "./differenceSpectra";
export {
  calculateBareAtomAbsorption,
  calculateBareAtomDelta,
  warmBareAtomCacheForFormula,
} from "./bareAtomCalculation";
export {
  buildBareAtomReferenceCurve,
  type BareAtomReferenceDataView,
} from "./buildBareAtomReferenceCurve";
export { parseCSVFile, parseNexafsCsvText } from "./csv";
export type { ParseNexafsCsvOptions, ParsedNexafsCsv } from "./csv";
export {
  detectCsvParseChallenges,
  detectSpectrumColumnNames,
  csvParseNeedsUserHelp,
} from "./csvParseChallenge";
export type {
  CsvParseChallenge,
  CsvParseChallengeCode,
} from "./csvParseChallenge";
export {
  isValidPolarDeg,
  isValidAzimuthDeg,
  parseFiniteAngleDegrees,
  describeInvalidPolarizationGeometry,
  POLAR_DEG_MIN,
  POLAR_DEG_MAX,
  AZIMUTH_DEG_MIN,
  AZIMUTH_DEG_MAX_EXCLUSIVE,
} from "./polarizationAngle";
export { computeBetaIndex } from "./betaIndex";
export { defaultNormalizationRangesFromSpectrum } from "./normalizationDefaults";
export {
  mapDbSpectrumRowsToPoints,
  mapDbSpectrumRowsToAnnotated,
  type DbSpectrumRowWithPolarization,
  type AnnotatedSpectrumRow,
} from "./mapDbSpectrumRowsToPoints";
export {
  groupSpectrumByPolarizationThetaPhi,
  phiLeafEnergySubtitle,
  type SpectrumPolarizationNode,
  type SpectrumThetaNode,
  type SpectrumPhiLeaf,
} from "./groupSpectrumByPolarizationThetaPhi";
export {
  buildNexafsSpectrumExportCsv,
  spectrumPointsToDetailedCsv,
  type NexafsSpectrumCsvExportOptions,
  type NexafsSpectrumExportBuildResult,
} from "./spectrumExportCsv";
export {
  buildSpectrumPointsWithDerivedForUpload,
  uploadDatasetHasFiniteBetaForKkOnEveryRow,
} from "./uploadDerivedSpectrum";
export { resolveHenkeMergeDomainForUploadDataset } from "./resolveHenkeMergeDomainForUploadDataset";
export {
  computeUploadDatasetDiagnostics,
  uploadNormalizationRangesForDataset,
  type UploadDatasetDiagnostics,
} from "./upload-dataset-diagnostics";
export { detectAuxiliarySpectrumColumnNames } from "./auxiliarySpectrumColumns";
export {
  filterSpectrumPointsByGeometry,
  buildAutoDetectedPeakList,
  mergePeaksPreservingManualAndSteps,
} from "./autoDetectPeaksFromSpectrum";
export type { SelectedGeometry } from "./autoDetectPeaksFromSpectrum";
