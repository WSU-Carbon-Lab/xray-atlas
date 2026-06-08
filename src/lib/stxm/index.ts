export {
  regionMeanAndSigma,
  regionSumAndSigma,
  type RegionMeanSigmaResult,
  type RegionSumSigmaResult,
  type StxmWeightingMode,
} from "./estimators";
export { isNexafsLineScanType, NEXAFS_LINE_SCAN_TYPE } from "./isNexafsLineScan";
export { loadStxm } from "./loadStxm";
export { downsampleHeatmap, percentile, valueToGrayscaleByte } from "./heatmap";
export {
  applyParsedCatalogEntry,
  buildCatalogEntryFromHdr,
  buildCatalogEntryFromProbe,
  buildPlaceholderCatalogEntry,
  catalogEntryEnrichmentStatus,
  groupCatalogEntries,
  ximBasenamesForHdrBasename,
  type StxmCatalogEnrichmentStatus,
  type StxmCatalogEntry,
} from "./catalogEntry";
export {
  EXPERIMENT_FOLDER_PATTERN,
  experimentSortKey,
  isExperimentFolderName,
  listBeamtimeExperimentFolders,
  sortExperimentFolderNames,
  summarizeBeamtimeFolders,
  type BeamtimeFolderSummary,
} from "./experimentFolder";
export {
  candidateXimNamesForHdr,
  discoverStxmPairsFromAuxFiles,
  mapAuxFilesByFilename,
  type DiscoveredStxmPair,
  type StxmAuxFileRef,
} from "./pairStxmFiles";
export {
  parseHdrScanTypeFromText,
  scanCategoryLabel,
  scanTypeCategory,
  STXM_SCAN_CATEGORY_ORDER,
  type StxmScanCategory,
} from "./scanType";
export { lineScanThumbnailDataUrl, scanThumbnailDataUrl } from "./scanThumbnail";
export {
  isAllowedStxmFilename,
  stxmFileKindFromName,
  StxmValidationError,
  STXM_ALLOWED_EXTENSIONS,
  STXM_MAX_HDR_BYTES,
  STXM_MAX_XIM_BYTES,
  STXM_MAX_AXIS_POINTS,
  validateStxmFilePair,
  validateStxmFileSize,
  validateStxmHdrMetadata,
  validateStxmXimValueCount,
} from "./validateStxmFile";
export {
  buildStxmEnergyValidityMask,
  detectStxmIntensityGlitches,
  type DetectStxmIntensityGlitchesOptions,
  type StxmIntensityGlitch,
  type StxmIntensityGlitchReason,
} from "./detect-stxm-intensity-glitches";
export { orientScan } from "./orientScan";
export {
  HDR_SCAN_TYPE_PEEK_BYTES,
  isProbedLineScan,
  probeHdrScanFromText,
  type HdrScanProbeResult,
} from "./probeHdrScan";
export { readHdr } from "./readHdr";
export { readXim } from "./readXim";
export {
  autoSampleIzeroRegions,
  barBoundsFromThreeRegions,
  sampleIzeroMasks,
  segmentedRegionBoundsFromImage,
  type StxmSegmentedRegionBounds,
} from "./regions";
export {
  clampDraggedSampleEdgeOutsideIzero,
  clampSampleEdgeOutsideIzeroInterior,
  enforceAllSampleRegionsOutsideIzero,
  enforceSampleRegionOutsideIzero,
  sampleRangeOverlapsIzeroInterior,
} from "./region-izero-constraints";
export { nexafsBeerLambert, type NexafsBeerLambertResult } from "./nexafs";
export {
  bareAtomBetaFromMassAbsorption,
  betaFromNormalizedMassAbsorption,
  fitBareAtomBackground,
  massAbsorptionFromOdFit,
  odErrToBetaErr,
  odToBeta,
  type BareAtomBackgroundFit,
  type FitBareAtomBackgroundOptions,
} from "./absorption";
export {
  energyRegionMask,
  normalizeNexafsOd,
  preEdgeSubtract,
  postEdgeNormalize,
  suggestNormalizationWindows,
  HC_EV_CM,
  type StxmNormalizationMetadata,
  type StxmNormalizationWindows,
} from "./normalization";
export {
  reduceByRegression,
  reduceLoadedScanTwoRegion,
  reduceTwoRegion,
  regionSpectrumToRecord,
  thicknessProxyFromReferenceOd,
  type RegionSpectrum,
  type StxmReductionMethod,
} from "./reduction";
export {
  parseIncidentThetaDegFromHdrText,
  parseIncidentThetaDegFromScanLabel,
  resolveIncidentThetaDegForScan,
} from "./parse-incident-theta-from-hdr";
export {
  commonEnergyGrid,
  interpolateSpectrumLinear,
  sigmaWithFloor,
} from "./lcf-spectrum-grid";
export {
  fitLcf,
  lcfEnergyOverlapRange,
  prepareLcfGrid,
  previewLcfModel,
  type LcfFitOptions,
  type LcfFitResult,
  type LcfFractionBound,
  type LcfSpectrum,
} from "./lcf";
export type {
  StxmHdrMetadata,
  StxmLoadSummary,
  StxmOrientedScan,
} from "./types";
