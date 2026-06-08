import { z } from "zod";
import {
  ALS_5322_INSTRUMENT_LABEL,
  ALS_5322_INSTRUMENT_SLUG,
} from "~/features/dashboard/connectors/registry";
import {
  dashboardIngestStepMetadataSchema,
  dashboardIngestionResultSchema,
  dashboardLcfFitResultSchema,
  dashboardLcfStepMetadataSchema,
  dashboardPreviewAtlasEntrySchema,
  dashboardPreviewRegionSpectrumSchema,
  dashboardPreviewSpectrumEntrySchema,
  dashboardPreviewStepMetadataSchema,
  dashboardReduceStepMetadataSchema,
  dashboardRegionsStepMetadataSchema,
  dashboardStandardOverlaySchema,
  regionSpectrumRecordSchema,
  stxmIngestScanRecordSchema,
  stxmIngestStorageModeSchema,
  stxmIntensityGlitchRecordSchema,
  stxmIzeroBoundsSchema,
  stxmNormalizationWindowsSchema,
  stxmRegionBoundsSchema,
  stxmSampleRegionSchema,
  type DashboardIngestionResult,
  type DashboardLcfStepMetadata,
  type DashboardPreviewAtlasEntry,
  type DashboardPreviewRegionSpectrum,
  type DashboardPreviewSpectrumEntry,
  type DashboardPreviewStepMetadata,
  type DashboardReduceStepMetadata,
  type DashboardRegionsStepMetadata,
  type DashboardStandardOverlay,
  type RegionSpectrumRecord,
  type StxmIngestScanRecord,
  type StxmIngestScanSummary,
  type StxmIngestStorageMode,
  type StxmIntensityGlitchRecord,
  type StxmIzeroBoundsRecord,
  type StxmNormalizationWindows,
  type StxmRegionBounds,
  type StxmSampleRegionRecord,
} from "~/features/dashboard/connectors/stxm/step-metadata";

export { ALS_5322_INSTRUMENT_LABEL, ALS_5322_INSTRUMENT_SLUG };
export {
  dashboardIngestStepMetadataSchema,
  dashboardIngestionResultSchema,
  dashboardLcfFitResultSchema,
  dashboardLcfStepMetadataSchema,
  dashboardPreviewAtlasEntrySchema,
  dashboardPreviewRegionSpectrumSchema,
  dashboardPreviewSpectrumEntrySchema,
  dashboardPreviewStepMetadataSchema,
  dashboardReduceStepMetadataSchema,
  dashboardRegionsStepMetadataSchema,
  dashboardStandardOverlaySchema,
  regionSpectrumRecordSchema,
  stxmIngestScanRecordSchema,
  stxmIngestStorageModeSchema,
  stxmIntensityGlitchRecordSchema,
  stxmIzeroBoundsSchema,
  stxmNormalizationWindowsSchema,
  stxmRegionBoundsSchema,
  stxmSampleRegionSchema,
};
export type {
  DashboardIngestionResult,
  DashboardLcfStepMetadata,
  DashboardPreviewAtlasEntry,
  DashboardPreviewRegionSpectrum,
  DashboardPreviewSpectrumEntry,
  DashboardPreviewStepMetadata,
  DashboardReduceStepMetadata,
  DashboardRegionsStepMetadata,
  DashboardStandardOverlay,
  RegionSpectrumRecord,
  StxmIngestScanRecord,
  StxmIngestScanSummary,
  StxmIngestStorageMode,
  StxmIntensityGlitchRecord,
  StxmIzeroBoundsRecord,
  StxmNormalizationWindows,
  StxmRegionBounds,
  StxmSampleRegionRecord,
};

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
    .record(z.string().max(512), dashboardRegionsStepMetadataSchema)
    .refine((record) => Object.keys(record).length <= 500, {
      message: "At most 500 per-scan region cache entries allowed",
    })
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
