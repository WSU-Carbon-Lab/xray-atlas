import { z } from "zod";

/** URL slug for the ALS Beamline 5.3.2.2 STXM instrument workspace. */
export const ALS_5322_INSTRUMENT_SLUG = "als-5322";

/** Reader-facing label for the ALS 5.3.2.2 workspace. */
export const ALS_5322_INSTRUMENT_LABEL = "ALS Beamline 5.3.2.2 STXM";

export const DASHBOARD_WORKSPACE_STEPS = [
  "ingest",
  "regions",
  "reduce",
  "fit",
  "export",
] as const;

export type DashboardWorkspaceStep = (typeof DASHBOARD_WORKSPACE_STEPS)[number];

export const dashboardProcessingSessionStatusSchema = z.enum([
  "draft",
  "processing",
  "ready",
  "archived",
]);

export type DashboardProcessingSessionStatus = z.infer<
  typeof dashboardProcessingSessionStatusSchema
>;

export const stxmIngestStorageModeSchema = z.enum([
  "session_metadata_pending",
  "experiment_aux",
]);

export type StxmIngestStorageMode = z.infer<typeof stxmIngestStorageModeSchema>;

export const stxmIngestScanRecordSchema = z.object({
  id: z.string().uuid(),
  hdrFileName: z.string().min(1),
  ximFileName: z.string().min(1),
  hdrExperimentFileId: z.string().uuid().optional(),
  ximExperimentFileId: z.string().uuid().optional(),
  isNexafsLineScan: z.boolean(),
  paxisCount: z.number().int().positive(),
  qaxisCount: z.number().int().positive(),
  paxisName: z.string().optional(),
  qaxisName: z.string().optional(),
  energyMinEv: z.number().nullable(),
  energyMaxEv: z.number().nullable(),
  parsedAt: z.string().min(1),
  selected: z.boolean().default(false),
});

export type StxmIngestScanRecord = z.infer<typeof stxmIngestScanRecordSchema>;

/** Alias used by dashboard ingest UI for parsed scan summaries. */
export type StxmIngestScanSummary = StxmIngestScanRecord;

/**
 * Ingest manifest on the processing session. Raw bytes live in experiment-aux
 * (`experiment_file` rows) once an experiment is linked; summaries and file ids
 * remain here for browser re-fetch and provenance.
 */
export const dashboardIngestStepMetadataSchema = z.object({
  scans: z.array(stxmIngestScanRecordSchema).default([]),
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

export const dashboardRegionsStepMetadataSchema = z.object({
  scanId: z.string().uuid().nullable().optional(),
  bounds: stxmRegionBoundsSchema.optional(),
  autoSuggested: z.boolean().optional(),
  weightingMode: z
    .enum(["inverse_count", "poisson_mle", "empirical"])
    .default("poisson_mle"),
});

export type DashboardRegionsStepMetadata = z.infer<
  typeof dashboardRegionsStepMetadataSchema
>;

export const regionSpectrumRecordSchema = z.object({
  regionLabel: z.string(),
  reductionMethod: z.enum(["two_region", "thickness_regression"]),
  weightingMode: z.enum(["inverse_count", "poisson_mle", "empirical"]),
  energyEv: z.array(z.number()),
  od: z.array(z.number()),
  odErr: z.array(z.number()),
  nPixels: z.number().int(),
  diagnostics: z.record(z.string(), z.number()).optional(),
});

export type RegionSpectrumRecord = z.infer<typeof regionSpectrumRecordSchema>;

export const dashboardReduceStepMetadataSchema = z.object({
  scanId: z.string().uuid(),
  spectra: z.array(regionSpectrumRecordSchema).default([]),
  computedAt: z.string().min(1),
  method: z.enum(["two_region", "thickness_regression"]).default("two_region"),
});

export type DashboardReduceStepMetadata = z.infer<
  typeof dashboardReduceStepMetadataSchema
>;

export const dashboardStepMetadataSchema = z.object({
  activeStep: z.enum(DASHBOARD_WORKSPACE_STEPS).optional(),
  ingest: dashboardIngestStepMetadataSchema.optional(),
  regions: dashboardRegionsStepMetadataSchema.optional(),
  reduce: dashboardReduceStepMetadataSchema.optional(),
  fit: z.record(z.string(), z.unknown()).optional(),
  export: z.record(z.string(), z.unknown()).optional(),
});

export type DashboardStepMetadata = z.infer<typeof dashboardStepMetadataSchema>;

/** Builds default step metadata for a newly created processing session. */
export function defaultDashboardStepMetadata(): DashboardStepMetadata {
  return {
    activeStep: "ingest",
    ingest: {
      scans: [],
      storageMode: "session_metadata_pending",
      activeScanId: null,
    },
    regions: {
      scanId: null,
      weightingMode: "poisson_mle",
    },
  };
}

/** Returns a short default session title from the current timestamp. */
export function defaultDashboardSessionTitle(now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 16).replace("T", " ");
  return `STXM session ${stamp}`;
}

/** Parses persisted JSON step metadata from the database with safe fallbacks. */
export function parseDashboardStepMetadata(value: unknown): DashboardStepMetadata {
  const parsed = dashboardStepMetadataSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }
  return defaultDashboardStepMetadata();
}

/** Human-readable labels for workspace stepper navigation. */
export const DASHBOARD_WORKSPACE_STEP_LABELS: Record<
  DashboardWorkspaceStep,
  string
> = {
  ingest: "Ingest",
  regions: "Regions",
  reduce: "Reduce",
  fit: "Fit",
  export: "Export",
};

export type DashboardStepGateState = {
  linkedExperimentId: string | null;
  stepMetadata: DashboardStepMetadata;
};

/**
 * Returns whether a workspace step is reachable given session link and ingest progress.
 */
export function isDashboardStepEnabled(
  step: DashboardWorkspaceStep,
  state: DashboardStepGateState,
): boolean {
  const scans = state.stepMetadata.ingest?.scans ?? [];
  const hasExperiment = Boolean(state.linkedExperimentId);
  const hasScans = scans.length > 0;
  const hasBounds = Boolean(state.stepMetadata.regions?.bounds);
  const hasReduction = (state.stepMetadata.reduce?.spectra.length ?? 0) > 0;

  switch (step) {
    case "ingest":
      return hasExperiment;
    case "regions":
      return hasExperiment && hasScans;
    case "reduce":
      return hasExperiment && hasScans && hasBounds;
    case "fit":
      return hasReduction;
    case "export":
      return hasReduction;
    default:
      return false;
  }
}

/** Explains why a step is locked when `isDashboardStepEnabled` is false. */
export function dashboardStepLockReason(
  step: DashboardWorkspaceStep,
  state: DashboardStepGateState,
): string | null {
  if (isDashboardStepEnabled(step, state)) {
    return null;
  }
  switch (step) {
    case "ingest":
      return "Link an Atlas experiment before ingesting line scans.";
    case "regions":
      return "Ingest at least one line scan before defining regions.";
    case "reduce":
      return "Define sample and izero regions before reducing spectra.";
    case "fit":
    case "export":
      return "Run reduction before blend fitting or export.";
    default:
      return "Complete prior steps first.";
  }
}
