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
  spotLabel: z.string(),
  role: z.enum(["pure", "edge", "custom"]).default("custom"),
});

export type StxmSampleRegionRecord = z.infer<typeof stxmSampleRegionSchema>;

export const stxmIzeroBoundsSchema = z.object({
  izeroLo: z.number(),
  izeroHi: z.number(),
});

export type StxmIzeroBoundsRecord = z.infer<typeof stxmIzeroBoundsSchema>;

export const stxmIntensityGlitchRecordSchema = z.object({
  energyIndex: z.number().int().nonnegative(),
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
  scanId: z.string().min(1).nullable().optional(),
  bounds: stxmRegionBoundsSchema.optional(),
  sampleRegions: z.array(stxmSampleRegionSchema).optional(),
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
  formula: z.string().optional(),
  thicknessCm: z.number().positive().optional(),
  normalization: stxmNormalizationWindowsSchema.optional(),
  linkedMoleculeId: z.string().uuid().optional(),
  linkedMoleculeLabel: z.string().optional(),
  linkedMoleculeFormula: z.string().optional(),
  regionEditorTrayOpen: z.boolean().optional(),
  intensityGlitches: z.array(stxmIntensityGlitchRecordSchema).optional(),
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
  scanId: z.string().min(1),
  spectra: z.array(regionSpectrumRecordSchema).default([]),
  computedAt: z.string().min(1),
  method: z.enum(["two_region", "thickness_regression"]).default("two_region"),
});

export type DashboardReduceStepMetadata = z.infer<
  typeof dashboardReduceStepMetadataSchema
>;

export const dashboardIngestionResultSchema = z.object({
  scanId: z.string().min(1),
  computedAt: z.string().min(1),
  weightingMode: z.enum(["inverse_count", "poisson_mle", "empirical"]),
  formula: z.string().nullable().optional(),
  thicknessCm: z.number().optional(),
  normalization: stxmNormalizationWindowsSchema,
  normalizationScale: z.number().optional(),
  energyEv: z.array(z.number()),
  i0: z.array(z.number()).optional(),
  iSample: z.array(z.number()).optional(),
  od: z.array(z.number()),
  odErr: z.array(z.number()),
  odNormalized: z.array(z.number()).optional(),
  massAbsorption: z.array(z.number()).optional(),
  beta: z.array(z.number()).optional(),
  delta: z.array(z.number()).optional(),
  kkEngineLabel: z.string().nullable().optional(),
});

export type DashboardIngestionResult = z.infer<
  typeof dashboardIngestionResultSchema
>;

export const dashboardPreviewSpectrumEntrySchema = z.object({
  scanId: z.string().min(1),
  scanLabel: z.string().min(1),
  keptAt: z.string().min(1),
  edgeLabel: z.string().optional(),
  hdrFileName: z.string().optional(),
  ximFileName: z.string().optional(),
  moleculeId: z.string().uuid().optional(),
  moleculeName: z.string().optional(),
  /** Incident polarization θ in degrees when known from hdr metadata or scan naming. */
  incidentThetaDeg: z.number().finite().optional(),
});

export const dashboardPreviewAtlasEntrySchema = z.object({
  experimentId: z.string().uuid(),
  label: z.string().min(1),
  addedAt: z.string().min(1),
  moleculeName: z.string().optional(),
  edgeLabel: z.string().optional(),
  instrumentName: z.string().optional(),
  facilityName: z.string().optional(),
});

export type DashboardPreviewAtlasEntry = z.infer<
  typeof dashboardPreviewAtlasEntrySchema
>;

export type DashboardPreviewSpectrumEntry = z.infer<
  typeof dashboardPreviewSpectrumEntrySchema
>;

export const dashboardStandardOverlaySchema = z.object({
  experimentId: z.string().uuid(),
  label: z.string().min(1),
  enabled: z.boolean().default(true),
});

export type DashboardStandardOverlay = z.infer<
  typeof dashboardStandardOverlaySchema
>;

/** Downsampled per-region spectrum series kept in preview session cache. */
export const dashboardPreviewRegionSpectrumSchema = z.object({
  regionId: z.string().min(1),
  spotLabel: z.string(),
  isIzero: z.boolean().optional(),
  color: z.string().optional(),
  energyEv: z.array(z.number()),
  signal: z.array(z.number()).optional(),
  signalErr: z.array(z.number()).optional(),
  od: z.array(z.number()).optional(),
  odErr: z.array(z.number()).optional(),
  odNormalized: z.array(z.number()).optional(),
  massAbsorption: z.array(z.number()).optional(),
  beta: z.array(z.number()).optional(),
  delta: z.array(z.number()).optional(),
});

export type DashboardPreviewRegionSpectrum = z.infer<
  typeof dashboardPreviewRegionSpectrumSchema
>;

export const dashboardPreviewStepMetadataSchema = z.object({
  spectra: z.array(dashboardPreviewSpectrumEntrySchema).default([]),
  standardOverlays: z.array(dashboardStandardOverlaySchema).default([]),
  compareScanIds: z.array(z.string()).default([]),
  compareTraceKeys: z.array(z.string()).default([]),
  atlasExperiments: z.array(dashboardPreviewAtlasEntrySchema).default([]),
  atlasGeometryByExperimentId: z.record(z.string(), z.array(z.string())).optional(),
  ingestionCache: z
    .record(z.string(), dashboardIngestionResultSchema)
    .optional(),
  regionSpectraCache: z
    .record(z.string(), z.array(dashboardPreviewRegionSpectrumSchema))
    .optional(),
});

export type DashboardPreviewStepMetadata = z.infer<
  typeof dashboardPreviewStepMetadataSchema
>;

export const dashboardLcfFitResultSchema = z.object({
  fractions: z.array(z.number()),
  referenceLabels: z.array(z.string()),
  reducedChiSquare: z.number(),
  computedAt: z.string().min(1),
});

export const dashboardLcfStepMetadataSchema = z.object({
  targetTraceKey: z.string().nullable().optional(),
  componentTraceKeys: z.array(z.string()).default([]),
  /** Slider warm-start weights aligned with `componentTraceKeys` (fraction units). */
  initialWeights: z.array(z.number()).optional(),
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

export const DASHBOARD_WORKSPACE_TABS = [
  "experiment",
  "ingestion",
  "preview_spectra",
  "lcf",
] as const;

export type DashboardWorkspaceTab = (typeof DASHBOARD_WORKSPACE_TABS)[number];

export const dashboardWorkspaceContextSchema = z.object({
  folderRootName: z.string().optional(),
  folderHandleKey: z.string().optional(),
  beamtimeName: z.string().nullable().optional(),
  selectedScanRelativePath: z.string().nullable().optional(),
  selectedScanBasename: z.string().nullable().optional(),
  activeTab: z.enum(DASHBOARD_WORKSPACE_TABS).default("experiment"),
});

export type DashboardWorkspaceContext = z.infer<
  typeof dashboardWorkspaceContextSchema
>;

export const dashboardStepMetadataSchema = z.object({
  workspace: dashboardWorkspaceContextSchema.optional(),
  activeStep: z.enum(DASHBOARD_WORKSPACE_STEPS).optional(),
  ingest: dashboardIngestStepMetadataSchema.optional(),
  regions: dashboardRegionsStepMetadataSchema.optional(),
  /** Per-scan region locator metadata keyed by scan id (relative path or basename). */
  regionsCache: z
    .record(z.string(), dashboardRegionsStepMetadataSchema)
    .optional(),
  reduce: dashboardReduceStepMetadataSchema.optional(),
  ingestion: dashboardIngestionResultSchema.optional(),
  preview: dashboardPreviewStepMetadataSchema.optional(),
  lcf: dashboardLcfStepMetadataSchema.optional(),
  fit: z.record(z.string(), z.unknown()).optional(),
  export: z.record(z.string(), z.unknown()).optional(),
});

export type DashboardStepMetadata = z.infer<typeof dashboardStepMetadataSchema>;

/** Builds default step metadata for a newly created processing session. */
export function defaultDashboardStepMetadata(): DashboardStepMetadata {
  return {
    workspace: {
      activeTab: "experiment",
      beamtimeName: null,
      selectedScanRelativePath: null,
      selectedScanBasename: null,
    },
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

type RegionsMetadataLookup = Pick<
  DashboardStepMetadata,
  "regions" | "regionsCache"
>;

/**
 * Resolves persisted region locator metadata for one scan from per-scan cache with legacy fallback.
 *
 * Reads `regionsCache[scanId]` first. When cache misses, uses top-level `regions` only when its
 * `scanId` matches `scanId` or is unset. Returns undefined when no stored locators exist for the scan.
 *
 * @param metadata - Session step metadata carrying `regionsCache` and legacy `regions`.
 * @param scanId - Active scan key (catalog relative path or hdr basename).
 */
export function resolveRegionsMetadataForScan(
  metadata: RegionsMetadataLookup | undefined,
  scanId: string,
): DashboardRegionsStepMetadata | undefined {
  const cached = metadata?.regionsCache?.[scanId];
  if (cached) {
    return { ...cached, scanId };
  }
  const legacy = metadata?.regions;
  if (!legacy) {
    return undefined;
  }
  if (legacy.scanId && legacy.scanId !== scanId) {
    return undefined;
  }
  return { ...legacy, scanId };
}

type LinkedMoleculeLookup = Pick<
  DashboardStepMetadata,
  "regions" | "regionsCache" | "preview" | "ingestion"
>;

export type LinkedMoleculePersistFields = {
  id: string;
  label?: string;
  formula?: string;
};

/**
 * Merges linked-molecule identity into per-scan regions metadata without dropping existing region locators.
 *
 * @param scanId - Active scan key written onto the payload.
 * @param base - Existing per-scan regions row, if any.
 * @param weightingMode - Default weighting when `base` omits it.
 * @param linkedMolecule - Selected Atlas molecule fields, or `null` to clear stored linkage.
 */
export function mergeLinkedMoleculeIntoRegionsMetadata(
  scanId: string,
  base: DashboardRegionsStepMetadata | undefined,
  weightingMode: DashboardRegionsStepMetadata["weightingMode"],
  linkedMolecule: LinkedMoleculePersistFields | null,
): DashboardRegionsStepMetadata {
  const next: DashboardRegionsStepMetadata = {
    weightingMode: base?.weightingMode ?? weightingMode,
    ...base,
    scanId,
  };
  if (linkedMolecule) {
    next.linkedMoleculeId = linkedMolecule.id;
    next.linkedMoleculeLabel = linkedMolecule.label;
    next.linkedMoleculeFormula = linkedMolecule.formula;
  } else {
    delete next.linkedMoleculeId;
    delete next.linkedMoleculeLabel;
    delete next.linkedMoleculeFormula;
  }
  return next;
}

/**
 * Resolves per-scan linked molecule identity from regions cache, preview spectra rows, or legacy export.
 *
 * Prefers `regionsCache[scanId]` molecule fields, then the matching preview spectrum entry, then legacy
 * top-level regions when `scanId` matches. Does not read session-wide export metadata so scan switches do
 * not bleed molecule selection across line scans.
 */
export function resolveLinkedMoleculeForScan(
  metadata: LinkedMoleculeLookup | undefined,
  scanId: string,
): {
  linkedMoleculeId: string | null;
  linkedMoleculeLabel: string | null;
  linkedMoleculeFormula: string | null;
} {
  const regionsRow = resolveRegionsMetadataForScan(metadata, scanId);
  if (regionsRow?.linkedMoleculeId) {
    return {
      linkedMoleculeId: regionsRow.linkedMoleculeId,
      linkedMoleculeLabel: regionsRow.linkedMoleculeLabel ?? null,
      linkedMoleculeFormula: regionsRow.linkedMoleculeFormula ?? null,
    };
  }
  const previewRow = metadata?.preview?.spectra.find(
    (entry) => entry.scanId === scanId && entry.moleculeId,
  );
  if (previewRow?.moleculeId) {
    return {
      linkedMoleculeId: previewRow.moleculeId,
      linkedMoleculeLabel: previewRow.moleculeName ?? null,
      linkedMoleculeFormula: null,
    };
  }
  return {
    linkedMoleculeId: null,
    linkedMoleculeLabel: null,
    linkedMoleculeFormula: null,
  };
}

type IngestionMetadataLookup = Pick<
  DashboardStepMetadata,
  "ingestion" | "preview"
>;

/**
 * Resolves persisted ingestion results for one scan from preview cache with legacy top-level fallback.
 *
 * Reads `preview.ingestionCache[scanId]` first. When cache misses, uses top-level `ingestion` only when its
 * `scanId` matches `scanId`. Returns undefined when no stored ingestion exists for the scan.
 *
 * @param metadata - Session step metadata carrying `preview.ingestionCache` and legacy `ingestion`.
 * @param scanId - Active scan key (catalog relative path or hdr basename).
 */
export function resolveIngestionMetadataForScan(
  metadata: IngestionMetadataLookup | undefined,
  scanId: string,
): DashboardIngestionResult | undefined {
  const cached = metadata?.preview?.ingestionCache?.[scanId];
  if (cached) {
    return cached;
  }
  const legacy = metadata?.ingestion;
  if (!legacy) {
    return undefined;
  }
  if (legacy.scanId !== scanId) {
    return undefined;
  }
  return legacy;
}

/**
 * Merges per-scan region metadata with normalization windows from persisted ingestion when locators omit them.
 */
export function resolveRegionsMetadataForScanWithIngestionFallback(
  metadata: LinkedMoleculeLookup | undefined,
  scanId: string,
): DashboardRegionsStepMetadata | undefined {
  const regionsRow = resolveRegionsMetadataForScan(metadata, scanId);
  if (regionsRow?.normalization) {
    return regionsRow;
  }
  const ingestion = resolveIngestionMetadataForScan(metadata, scanId);
  if (!regionsRow && !ingestion?.normalization) {
    return regionsRow;
  }
  return {
    ...(regionsRow ?? { weightingMode: "poisson_mle" as const }),
    scanId,
    normalization: regionsRow?.normalization ?? ingestion?.normalization,
  };
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

/** Human-readable labels for workspace tab navigation. */
export const DASHBOARD_WORKSPACE_TAB_LABELS: Record<
  DashboardWorkspaceTab,
  string
> = {
  experiment: "Experiment",
  ingestion: "Ingestion",
  preview_spectra: "Preview spectra",
  lcf: "LC fitting",
};

export type DashboardStepGateState = {
  stepMetadata: DashboardStepMetadata;
  hasSelectedLocalScan: boolean;
};

/**
 * Returns whether a legacy workspace step is reachable (local-folder flow; no experiment link).
 */
export function isDashboardStepEnabled(
  step: DashboardWorkspaceStep,
  state: DashboardStepGateState,
): boolean {
  const hasBounds = Boolean(state.stepMetadata.regions?.bounds);
  const hasReduction = (state.stepMetadata.reduce?.spectra.length ?? 0) > 0;
  const hasScan = state.hasSelectedLocalScan;

  switch (step) {
    case "ingest":
      return hasScan;
    case "regions":
      return hasScan;
    case "reduce":
      return hasScan && hasBounds;
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
    case "regions":
      return "Select a line scan from your beamtime folder.";
    case "reduce":
      return "Define sample and izero regions before reducing spectra.";
    case "fit":
    case "export":
      return "Run reduction before blend fitting or export.";
    default:
      return "Complete prior steps first.";
  }
}

/** Minimal session fields used to group workspace shortcut duplicates. */
export type DashboardWorkspaceSessionRef = {
  id: string;
  instrumentSlug: string;
  stepMetadata: DashboardStepMetadata;
  updatedAt: Date | string;
};

/**
 * Builds a stable workspace identity key for recent-work deduplication.
 *
 * Sessions sharing instrument, folder handle (or root name), and beamtime
 * folder name are treated as the same shortcut; empty beamtime groups
 * multiple opens of the same root folder.
 */
export function dashboardWorkspaceShortcutKey(
  session: Pick<DashboardWorkspaceSessionRef, "instrumentSlug" | "stepMetadata">,
): string {
  const workspace = session.stepMetadata.workspace;
  const folderKey =
    workspace?.folderHandleKey?.trim() ??
    workspace?.folderRootName?.trim() ??
    "";
  const beamtime = workspace?.beamtimeName?.trim() ?? "";
  return `${session.instrumentSlug}\u0000${folderKey}\u0000${beamtime}`;
}

function sessionUpdatedAtMs(updatedAt: Date | string): number {
  return new Date(updatedAt).getTime();
}

/**
 * Returns the newest session per workspace shortcut key, ordered by recency.
 */
export function selectRecentWorkspaceSessions<T extends DashboardWorkspaceSessionRef>(
  sessions: T[],
  limit: number,
): T[] {
  const newestByKey = new Map<string, T>();
  const sorted = [...sessions].sort(
    (left, right) =>
      sessionUpdatedAtMs(right.updatedAt) - sessionUpdatedAtMs(left.updatedAt),
  );
  for (const session of sorted) {
    const key = dashboardWorkspaceShortcutKey(session);
    if (!newestByKey.has(key)) {
      newestByKey.set(key, session);
    }
  }
  return [...newestByKey.values()]
    .sort(
      (left, right) =>
        sessionUpdatedAtMs(right.updatedAt) -
        sessionUpdatedAtMs(left.updatedAt),
    )
    .slice(0, limit);
}

/**
 * Lists session ids to delete when multiple rows share a workspace shortcut key.
 *
 * Keeps the row with the latest `updatedAt` in each duplicate group.
 */
export function workspaceSessionDuplicateIdsToDelete<
  T extends DashboardWorkspaceSessionRef,
>(sessions: T[]): string[] {
  const groups = new Map<string, T[]>();
  for (const session of sessions) {
    const key = dashboardWorkspaceShortcutKey(session);
    const group = groups.get(key) ?? [];
    group.push(session);
    groups.set(key, group);
  }
  const idsToDelete: string[] = [];
  for (const group of groups.values()) {
    if (group.length <= 1) {
      continue;
    }
    const sorted = [...group].sort(
      (left, right) =>
        sessionUpdatedAtMs(right.updatedAt) -
        sessionUpdatedAtMs(left.updatedAt),
    );
    for (const row of sorted.slice(1)) {
      idsToDelete.push(row.id);
    }
  }
  return idsToDelete;
}
