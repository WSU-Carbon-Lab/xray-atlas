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
} from "./filenameParser";
export type { ParsedFilename, InstrumentMatchOption } from "./filenameParser";
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
export { parseCSVFile } from "./csv";
export { computeBetaIndex, computeBetaFromMassAbsorption } from "./betaIndex";
export {
  betaFromMassAbsorption,
  massAbsorptionFromBeta,
  massAbsorptionFromF2,
  massAbsorptionFromEpsilon2,
  HC_EV_CM,
  FOUR_PI,
} from "./opticalConstants";
export {
  buildMassAbsorptionHubPoints,
  deriveOdAndBetaFromHub,
  resolveNormalizationWindowsForHub,
} from "./representationToMassAbsorption";
export {
  classifyColumnFillStatus,
  inferPrimaryRepresentation,
  resolvePrimaryAbsorptionColumn,
  datasetHasResolvablePrimary,
  uploadedChannelsFromDataset,
} from "./channelCompleteness";
export {
  buildUploadScaleSanityWarnings,
  buildProcessedPrimaryBareAtomAgreement,
  isProcessedPrimaryRepresentation,
} from "./uploadScaleSanity";
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
  resolveFormulaMassGPerMol,
} from "./uploadDerivedSpectrum";
export { resolveHenkeMergeDomainForUploadDataset } from "./resolveHenkeMergeDomainForUploadDataset";
export { detectAuxiliarySpectrumColumnNames } from "./auxiliarySpectrumColumns";
export {
  filterSpectrumPointsByGeometry,
  buildAutoDetectedPeakList,
  mergePeaksPreservingManualAndSteps,
} from "./autoDetectPeaksFromSpectrum";
export type { SelectedGeometry } from "./autoDetectPeaksFromSpectrum";
