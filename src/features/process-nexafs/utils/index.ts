export {
  toNumber,
  extractAtomsFromFormula,
  extractGeometryPairs,
  formatStatNumber,
  analyzeNumericColumns,
  computeZeroOneNormalization,
  computeNormalizationForExperiment,
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
} from "./filenameParser";
export type { ParsedFilename } from "./filenameParser";
export { parseNexafsJson } from "./jsonParser";
export type { NEXAFSJsonData } from "./jsonParser";
export { detectPeaks, convertToPeakData } from "./peakDetection";
export type {
  PeakDetectionOptions,
  DetectedPeak,
} from "./peakDetection";
export { calculateDifferenceSpectra } from "./differenceSpectra";
export type { DifferenceSpectrum } from "./differenceSpectra";
export { calculateBareAtomAbsorption } from "./bareAtomCalculation";
export { parseCSVFile } from "./csv";
export { computeBetaIndex } from "./betaIndex";
export { defaultNormalizationRangesFromSpectrum } from "./normalizationDefaults";
export { detectAuxiliarySpectrumColumnNames } from "./auxiliarySpectrumColumns";
export {
  filterSpectrumPointsByGeometry,
  buildAutoDetectedPeakList,
  mergePeaksPreservingManualAndSteps,
} from "./autoDetectPeaksFromSpectrum";
export type { SelectedGeometry } from "./autoDetectPeaksFromSpectrum";
