import { z } from "zod";

/** Maximum spectrum energy samples per persisted STXM trace or ingestion row. */
export const STXM_MAX_ENERGY_SAMPLES = 20_000;

/** Maximum per-scan rows in ingest manifests and preview caches. */
export const STXM_MAX_SCAN_ROWS = 500;

/** Maximum compare trace keys stored on preview metadata. */
export const STXM_MAX_COMPARE_TRACE_KEYS = 200;

/** Maximum sample regions per scan in regions metadata. */
export const STXM_MAX_SAMPLE_REGIONS = 64;

/** Maximum intensity glitch records per scan. */
export const STXM_MAX_INTENSITY_GLITCHES = 2_000;

const finiteNumberArray = z
  .array(z.number().finite())
  .max(STXM_MAX_ENERGY_SAMPLES);

const scanKeyRecord = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.record(z.string().min(1).max(512), valueSchema).refine(
    (record) => Object.keys(record).length <= STXM_MAX_SCAN_ROWS,
    { message: `At most ${STXM_MAX_SCAN_ROWS} scan keys allowed` },
  );

export const stxmIngestStorageModeSchema = z.enum([
  "session_metadata_pending",
  "experiment_aux",
]);

export type StxmIngestStorageMode = z.infer<typeof stxmIngestStorageModeSchema>;

export const stxmIngestScanRecordSchema = z.object({
  id: z.string().uuid(),
  hdrFileName: z.string().min(1).max(512),
  ximFileName: z.string().min(1).max(512),
  hdrExperimentFileId: z.string().uuid().optional(),
  ximExperimentFileId: z.string().uuid().optional(),
  isNexafsLineScan: z.boolean(),
  paxisCount: z.number().int().positive().max(65_536),
  qaxisCount: z.number().int().positive().max(65_536),
  paxisName: z.string().max(128).optional(),
  qaxisName: z.string().max(128).optional(),
  energyMinEv: z.number().nullable(),
  energyMaxEv: z.number().nullable(),
  parsedAt: z.string().min(1).max(64),
  selected: z.boolean().default(false),
});

export type StxmIngestScanRecord = z.infer<typeof stxmIngestScanRecordSchema>;

export type StxmIngestScanSummary = StxmIngestScanRecord;

export const dashboardIngestStepMetadataSchema = z.object({
  scans: z.array(stxmIngestScanRecordSchema).max(STXM_MAX_SCAN_ROWS).default([]),
  storageMode: stxmIngestStorageModeSchema.default("session_metadata_pending"),
  activeScanId: z.string().uuid().nullable().optional(),
});

export const stxmRegionBoundsSchema = z.object({
  sampleLo: z.number(),
  sampleHi: z.number(),
  izeroLo: z.number(),
  izeroHi: z.number(),
});

export type StxmRegionBounds = z.infer<typeof stxmRegionBoundsSchema>;

export const stxmNormalizationWindowsSchema = z.object({
  preLo: z.number(),
  preHi: z.number(),
  postLo: z.number(),
  postHi: z.number(),
});

export type StxmNormalizationWindows = z.infer<
  typeof stxmNormalizationWindowsSchema
>;

export const stxmSampleRegionSchema = z.object({
  id: z.string().uuid(),
  sampleLo: z.number(),
  sampleHi: z.number(),
  spotLabel: z.string().max(128),
  role: z.enum(["pure", "edge", "custom"]).default("custom"),
});

export type StxmSampleRegionRecord = z.infer<typeof stxmSampleRegionSchema>;

export const stxmIzeroBoundsSchema = z.object({
  izeroLo: z.number(),
  izeroHi: z.number(),
});

export type StxmIzeroBoundsRecord = z.infer<typeof stxmIzeroBoundsSchema>;

export const stxmIntensityGlitchRecordSchema = z.object({
  energyIndex: z.number().int().nonnegative().max(STXM_MAX_ENERGY_SAMPLES),
  energyEv: z.number().nullable(),
  reason: z.enum([
    "it_exceeds_i0",
    "i0_below_neighbor_median",
    "it_above_neighbor_median",
    "paired_i0_it_spike",
  ]),
  i0: z.number(),
  it: z.number(),
});

export type StxmIntensityGlitchRecord = z.infer<
  typeof stxmIntensityGlitchRecordSchema
>;

export const dashboardRegionsStepMetadataSchema = z.object({
  scanId: z.string().min(1).max(512).nullable().optional(),
  bounds: stxmRegionBoundsSchema.optional(),
  sampleRegions: z
    .array(stxmSampleRegionSchema)
    .max(STXM_MAX_SAMPLE_REGIONS)
    .optional(),
  izeroBounds: stxmIzeroBoundsSchema.optional(),
  pureRegionId: z.string().uuid().optional(),
  plotScaleMode: z.enum(["linear", "log"]).optional(),
  rawSignalTransform: z
    .enum(["signal", "reciprocal", "log_reciprocal"])
    .optional(),
  i0PlotScale: z.enum(["linear", "log_i", "log_inv"]).optional(),
  autoSuggested: z.boolean().optional(),
  weightingMode: z
    .enum(["inverse_count", "poisson_mle", "empirical"])
    .default("poisson_mle"),
  formula: z.string().max(256).optional(),
  thicknessCm: z.number().positive().optional(),
  normalization: stxmNormalizationWindowsSchema.optional(),
  linkedMoleculeId: z.string().uuid().optional(),
  linkedMoleculeLabel: z.string().max(256).optional(),
  linkedMoleculeFormula: z.string().max(256).optional(),
  regionEditorTrayOpen: z.boolean().optional(),
  intensityGlitches: z
    .array(stxmIntensityGlitchRecordSchema)
    .max(STXM_MAX_INTENSITY_GLITCHES)
    .optional(),
});

export type DashboardRegionsStepMetadata = z.infer<
  typeof dashboardRegionsStepMetadataSchema
>;

export const regionSpectrumRecordSchema = z.object({
  regionLabel: z.string().max(128),
  reductionMethod: z.enum(["two_region", "thickness_regression"]),
  weightingMode: z.enum(["inverse_count", "poisson_mle", "empirical"]),
  energyEv: finiteNumberArray,
  od: finiteNumberArray,
  odErr: finiteNumberArray,
  nPixels: z.number().int(),
  diagnostics: z.record(z.string(), z.number()).optional(),
});

export type RegionSpectrumRecord = z.infer<typeof regionSpectrumRecordSchema>;

export const dashboardReduceStepMetadataSchema = z.object({
  scanId: z.string().min(1).max(512),
  spectra: z.array(regionSpectrumRecordSchema).max(STXM_MAX_SAMPLE_REGIONS).default([]),
  computedAt: z.string().min(1).max(64),
  method: z.enum(["two_region", "thickness_regression"]).default("two_region"),
});

export type DashboardReduceStepMetadata = z.infer<
  typeof dashboardReduceStepMetadataSchema
>;

export const dashboardIngestionResultSchema = z.object({
  scanId: z.string().min(1).max(512),
  computedAt: z.string().min(1).max(64),
  weightingMode: z.enum(["inverse_count", "poisson_mle", "empirical"]),
  formula: z.string().nullable().optional(),
  thicknessCm: z.number().optional(),
  normalization: stxmNormalizationWindowsSchema,
  normalizationScale: z.number().optional(),
  energyEv: finiteNumberArray,
  i0: finiteNumberArray.optional(),
  iSample: finiteNumberArray.optional(),
  od: finiteNumberArray,
  odErr: finiteNumberArray,
  odNormalized: finiteNumberArray.optional(),
  massAbsorption: finiteNumberArray.optional(),
  beta: finiteNumberArray.optional(),
  delta: finiteNumberArray.optional(),
  kkEngineLabel: z.string().nullable().optional(),
});

export type DashboardIngestionResult = z.infer<
  typeof dashboardIngestionResultSchema
>;

export const dashboardPreviewSpectrumEntrySchema = z.object({
  scanId: z.string().min(1).max(512),
  scanLabel: z.string().min(1).max(512),
  keptAt: z.string().min(1).max(64),
  edgeLabel: z.string().max(128).optional(),
  hdrFileName: z.string().max(512).optional(),
  ximFileName: z.string().max(512).optional(),
  moleculeId: z.string().uuid().optional(),
  moleculeName: z.string().max(256).optional(),
  incidentThetaDeg: z.number().finite().optional(),
});

export const dashboardPreviewAtlasEntrySchema = z.object({
  experimentId: z.string().uuid(),
  label: z.string().min(1).max(256),
  addedAt: z.string().min(1).max(64),
  moleculeName: z.string().max(256).optional(),
  edgeLabel: z.string().max(128).optional(),
  instrumentName: z.string().max(256).optional(),
  facilityName: z.string().max(256).optional(),
});

export type DashboardPreviewAtlasEntry = z.infer<
  typeof dashboardPreviewAtlasEntrySchema
>;

export type DashboardPreviewSpectrumEntry = z.infer<
  typeof dashboardPreviewSpectrumEntrySchema
>;

export const dashboardStandardOverlaySchema = z.object({
  experimentId: z.string().uuid(),
  label: z.string().min(1).max(256),
  enabled: z.boolean().default(true),
});

export type DashboardStandardOverlay = z.infer<
  typeof dashboardStandardOverlaySchema
>;

export const dashboardPreviewRegionSpectrumSchema = z.object({
  regionId: z.string().min(1).max(128),
  spotLabel: z.string().max(128),
  isIzero: z.boolean().optional(),
  color: z.string().max(64).optional(),
  energyEv: finiteNumberArray,
  signal: finiteNumberArray.optional(),
  signalErr: finiteNumberArray.optional(),
  od: finiteNumberArray.optional(),
  odErr: finiteNumberArray.optional(),
  odNormalized: finiteNumberArray.optional(),
  massAbsorption: finiteNumberArray.optional(),
  beta: finiteNumberArray.optional(),
  delta: finiteNumberArray.optional(),
});

export type DashboardPreviewRegionSpectrum = z.infer<
  typeof dashboardPreviewRegionSpectrumSchema
>;

export const dashboardPreviewStepMetadataSchema = z.object({
  spectra: z
    .array(dashboardPreviewSpectrumEntrySchema)
    .max(STXM_MAX_SCAN_ROWS)
    .default([]),
  standardOverlays: z
    .array(dashboardStandardOverlaySchema)
    .max(64)
    .default([]),
  compareScanIds: z.array(z.string().max(512)).max(STXM_MAX_SCAN_ROWS).default([]),
  compareTraceKeys: z
    .array(z.string().max(512))
    .max(STXM_MAX_COMPARE_TRACE_KEYS)
    .default([]),
  atlasExperiments: z
    .array(dashboardPreviewAtlasEntrySchema)
    .max(64)
    .default([]),
  atlasGeometryByExperimentId: z
    .record(z.string(), z.array(z.string().max(128)).max(32))
    .optional(),
  ingestionCache: scanKeyRecord(dashboardIngestionResultSchema).optional(),
  regionSpectraCache: scanKeyRecord(
    z.array(dashboardPreviewRegionSpectrumSchema).max(STXM_MAX_SAMPLE_REGIONS),
  ).optional(),
});

export type DashboardPreviewStepMetadata = z.infer<
  typeof dashboardPreviewStepMetadataSchema
>;

export const dashboardLcfFitResultSchema = z.object({
  fractions: z.array(z.number().finite()).max(32),
  referenceLabels: z.array(z.string().max(256)).max(32),
  reducedChiSquare: z.number(),
  computedAt: z.string().min(1).max(64),
});

export const dashboardLcfStepMetadataSchema = z.object({
  targetTraceKey: z.string().max(512).nullable().optional(),
  componentTraceKeys: z
    .array(z.string().max(512))
    .max(STXM_MAX_COMPARE_TRACE_KEYS)
    .default([]),
  initialWeights: z.array(z.number().finite()).max(32).optional(),
  channel: z
    .enum(["od", "od_normalized", "mass_absorption", "beta", "delta"])
    .optional(),
  energyMinEv: z.number().optional(),
  energyMaxEv: z.number().optional(),
  sumToOne: z.boolean().default(true),
  lastResult: dashboardLcfFitResultSchema.optional(),
});

export type DashboardLcfStepMetadata = z.infer<
  typeof dashboardLcfStepMetadataSchema
>;
