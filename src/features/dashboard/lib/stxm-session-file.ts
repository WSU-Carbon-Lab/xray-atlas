import { z } from "zod";
import { STXM_MAX_SCAN_ROWS } from "~/features/dashboard/connectors/stxm/step-metadata";
import {
  dashboardIngestionResultSchema,
  dashboardPreviewRegionSpectrumSchema,
  dashboardPreviewStepMetadataSchema,
  dashboardReduceStepMetadataSchema,
  dashboardRegionsStepMetadataSchema,
  resolveIngestionMetadataForScan,
  resolveRegionsMetadataForScanWithIngestionFallback,
  type DashboardIngestionResult,
  type DashboardPreviewRegionSpectrum,
  type DashboardPreviewStepMetadata,
  type DashboardReduceStepMetadata,
  type DashboardRegionsStepMetadata,
  type DashboardStepMetadata,
} from "~/lib/dashboard-processing-session";
import { stxmExportStepMetadataSchema } from "./stxm-export-metadata";
import type { StxmDirectoryHandle } from "./fileSystemAccessTypes";

/** Hidden session filename written beside STXM scans in each experiment folder. */
export const STXM_SESSION_FILENAME = ".xray-atlas-stxm-session.json";

/** Schema version for {@link STXM_SESSION_FILENAME} payloads. */
export const STXM_SESSION_VERSION = 1 as const;

/** Per-scan plot UI settings persisted across reloads. */
export const stxmSessionPlotSettingsSchema = z.object({
  plotScaleMode: z.enum(["linear", "log"]).optional(),
  rawSignalTransform: z
    .enum(["signal", "reciprocal", "log_reciprocal"])
    .optional(),
  regionEditorTrayOpen: z.boolean().optional(),
  plotChannel: z.string().optional(),
});

export type StxmSessionPlotSettings = z.infer<
  typeof stxmSessionPlotSettingsSchema
>;

/** Per-scan ingestion workspace state stored in the sidecar JSON. */
export const stxmSessionScanEntrySchema = z.object({
  regions: dashboardRegionsStepMetadataSchema.optional(),
  reduce: dashboardReduceStepMetadataSchema.optional(),
  export: stxmExportStepMetadataSchema.optional(),
  ingestion: dashboardIngestionResultSchema.optional(),
  regionSpectra: z.array(dashboardPreviewRegionSpectrumSchema).optional(),
  plotSettings: stxmSessionPlotSettingsSchema.optional(),
});

export type StxmSessionScanEntry = z.infer<typeof stxmSessionScanEntrySchema>;

/** On-disk STXM processing session for one experiment directory. */
export const stxmSessionFileSchema = z.object({
  version: z.literal(STXM_SESSION_VERSION),
  updatedAt: z.string().min(1),
  experimentName: z.string().min(1),
  scans: z
    .record(z.string().min(1).max(512), stxmSessionScanEntrySchema)
    .refine((record) => Object.keys(record).length <= STXM_MAX_SCAN_ROWS, {
      message: `At most ${STXM_MAX_SCAN_ROWS} scan keys allowed`,
    })
    .default({}),
  preview: dashboardPreviewStepMetadataSchema.optional(),
});

export type StxmSessionFile = z.infer<typeof stxmSessionFileSchema>;

/** Default preview metadata when the session file omits a preview block. */
export function defaultStxmSessionPreview(): DashboardPreviewStepMetadata {
  return {
    spectra: [],
    standardOverlays: [],
    compareScanIds: [],
    compareTraceKeys: [],
    atlasExperiments: [],
    atlasGeometryByExperimentId: {},
  };
}

/**
 * Builds an empty session document for `experimentName`.
 *
 * @param experimentName - Beamtime or experiment folder label shown in the workspace.
 */
export function createEmptyStxmSessionFile(
  experimentName: string,
): StxmSessionFile {
  return {
    version: STXM_SESSION_VERSION,
    updatedAt: new Date().toISOString(),
    experimentName,
    scans: {},
    preview: defaultStxmSessionPreview(),
  };
}

/**
 * Parses session JSON from an experiment folder; returns `null` when invalid or unsupported.
 *
 * @param text - Raw UTF-8 JSON read from {@link STXM_SESSION_FILENAME}.
 */
export function parseStxmSessionFile(text: string): StxmSessionFile | null {
  try {
    const parsed: unknown = JSON.parse(text);
    const result = stxmSessionFileSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/**
 * Serializes a session document for {@link STXM_SESSION_FILENAME}.
 *
 * @param session - Validated session payload to write atomically.
 */
export function serializeStxmSessionFile(session: StxmSessionFile): string {
  return `${JSON.stringify(session, null, 2)}\n`;
}

/**
 * Reads {@link STXM_SESSION_FILENAME} from `directory`; returns `null` when missing or invalid.
 *
 * @param directory - Experiment folder handle with read access.
 */
export async function readStxmSessionFile(
  directory: StxmDirectoryHandle,
): Promise<StxmSessionFile | null> {
  try {
    const handle = await directory.getFileHandle(STXM_SESSION_FILENAME);
    const file = await handle.getFile();
    const text = await file.text();
    return parseStxmSessionFile(text);
  } catch {
    return null;
  }
}

/**
 * Writes {@link STXM_SESSION_FILENAME} beside scans; returns false when the folder is read-only.
 *
 * @param directory - Experiment folder handle; write permission required for success.
 * @param session - Document to persist in full (callers merge in memory first).
 */
export async function writeStxmSessionFile(
  directory: StxmDirectoryHandle,
  session: StxmSessionFile,
): Promise<boolean> {
  try {
    const handle = await directory.getFileHandle(STXM_SESSION_FILENAME, {
      create: true,
    });
    if (!handle.createWritable) {
      return false;
    }
    const writable = await handle.createWritable();
    const payload: StxmSessionFile = {
      ...session,
      updatedAt: new Date().toISOString(),
    };
    await writable.write(serializeStxmSessionFile(payload));
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Merges one scan entry into `session` without dropping unrelated scans or preview state.
 *
 * @param session - Current in-memory session document.
 * @param scanId - Catalog relative path or hdr basename used as the scan key.
 * @param patch - Partial scan fields to upsert.
 */
export function mergeStxmSessionScanEntry(
  session: StxmSessionFile,
  scanId: string,
  patch: Partial<StxmSessionScanEntry>,
): StxmSessionFile {
  const existing = session.scans[scanId] ?? {};
  return {
    ...session,
    scans: {
      ...session.scans,
      [scanId]: {
        ...existing,
        ...patch,
      },
    },
  };
}

/**
 * Merges preview-level metadata into `session`, preserving per-scan rows.
 *
 * @param session - Current in-memory session document.
 * @param preview - Preview compare and Atlas overlay state to store at file root.
 */
export function mergeStxmSessionPreview(
  session: StxmSessionFile,
  preview: DashboardPreviewStepMetadata,
): StxmSessionFile {
  return {
    ...session,
    preview,
  };
}

/**
 * Merges preview compare metadata and overwrites per-scan ingestion and region spectra from the preview caches.
 *
 * Callers use this after {@link buildStxmPreviewCacheUpdate} so normalized OD, mu, and beta written to
 * `preview.ingestionCache` / `preview.regionSpectraCache` replace stale scan rows instead of being ignored.
 *
 * @param session - Current in-memory session document.
 * @param preview - Preview metadata including ingestion and region spectra caches to mirror onto scan rows.
 */
export function applyPreviewCacheToSessionScans(
  session: StxmSessionFile,
  preview: DashboardPreviewStepMetadata,
): StxmSessionFile {
  let next = mergeStxmSessionPreview(session, preview);
  for (const [scanKey, ingestion] of Object.entries(
    preview.ingestionCache ?? {},
  )) {
    next = mergeStxmSessionScanEntry(next, scanKey, { ingestion });
  }
  for (const [scanKey, regionSpectra] of Object.entries(
    preview.regionSpectraCache ?? {},
  )) {
    next = mergeStxmSessionScanEntry(next, scanKey, { regionSpectra });
  }
  return next;
}

/**
 * Resolves per-scan region metadata from the session file with ingestion normalization fallback.
 *
 * @param session - Loaded session document, or null before first read completes.
 * @param scanId - Active scan key.
 */
export function resolveStxmSessionRegions(
  session: StxmSessionFile | null | undefined,
  scanId: string,
): DashboardRegionsStepMetadata | undefined {
  if (!session) {
    return undefined;
  }
  const entry = session.scans[scanId];
  const preview = session.preview ?? defaultStxmSessionPreview();
  return resolveRegionsMetadataForScanWithIngestionFallback(
    {
      regionsCache: Object.fromEntries(
        Object.entries(session.scans)
          .filter(([, row]) => row.regions)
          .map(([key, row]) => [key, row.regions!]),
      ),
      preview: {
        ...preview,
        ingestionCache: Object.fromEntries(
          Object.entries(session.scans)
            .filter(([, row]) => row.ingestion)
            .map(([key, row]) => [key, row.ingestion!]),
        ),
      },
    },
    scanId,
  );
}

/**
 * Resolves persisted aggregate ingestion for one scan from the session file.
 *
 * @param session - Loaded session document, or null before first read completes.
 * @param scanId - Active scan key.
 */
export function resolveStxmSessionIngestion(
  session: StxmSessionFile | null | undefined,
  scanId: string,
): DashboardIngestionResult | undefined {
  if (!session) {
    return undefined;
  }
  const entry = session.scans[scanId];
  if (entry?.ingestion) {
    return entry.ingestion;
  }
  const preview = session.preview ?? defaultStxmSessionPreview();
  const fromPreviewRoot = preview.ingestionCache?.[scanId];
  if (fromPreviewRoot) {
    return fromPreviewRoot;
  }
  return resolveIngestionMetadataForScan(
    {
      preview: {
        ...preview,
        ingestionCache: Object.fromEntries(
          Object.entries(session.scans)
            .filter(([, row]) => row.ingestion)
            .map(([key, row]) => [key, row.ingestion!]),
        ),
      },
    },
    scanId,
  );
}

/**
 * Returns downsampled per-region spectra cached for one scan.
 *
 * @param session - Loaded session document, or null before first read completes.
 * @param scanId - Active scan key.
 */
export function resolveStxmSessionRegionSpectra(
  session: StxmSessionFile | null | undefined,
  scanId: string,
): DashboardPreviewRegionSpectrum[] | undefined {
  const fromScan = session?.scans[scanId]?.regionSpectra;
  if (fromScan?.length) {
    return fromScan;
  }
  return session?.preview?.regionSpectraCache?.[scanId];
}

/**
 * Returns reduce-step metadata for one scan when present.
 *
 * @param session - Loaded session document, or null before first read completes.
 * @param scanId - Active scan key.
 */
export function resolveStxmSessionReduce(
  session: StxmSessionFile | null | undefined,
  scanId: string,
): DashboardReduceStepMetadata | undefined {
  return session?.scans[scanId]?.reduce;
}

/**
 * Returns export/upload metadata for one scan when present.
 *
 * @param session - Loaded session document, or null before first read completes.
 * @param scanId - Active scan key.
 */
export function resolveStxmSessionExport(
  session: StxmSessionFile | null | undefined,
  scanId: string,
): StxmSessionScanEntry["export"] | undefined {
  return session?.scans[scanId]?.export;
}

/**
 * Returns preview compare state from the session file root.
 *
 * @param session - Loaded session document, or null before first read completes.
 */
export function resolveStxmSessionPreview(
  session: StxmSessionFile | null | undefined,
): DashboardPreviewStepMetadata {
  const preview = session?.preview ?? defaultStxmSessionPreview();
  const ingestionCache = Object.fromEntries(
    Object.entries(session?.scans ?? {})
      .filter(([, row]) => row.ingestion)
      .map(([key, row]) => [key, row.ingestion!]),
  );
  const regionSpectraCache = Object.fromEntries(
    Object.entries(session?.scans ?? {})
      .filter(([, row]) => row.regionSpectra?.length)
      .map(([key, row]) => [key, row.regionSpectra!]),
  );
  return {
    ...preview,
    ingestionCache:
      Object.keys(ingestionCache).length > 0 ? ingestionCache : preview.ingestionCache,
    regionSpectraCache:
      Object.keys(regionSpectraCache).length > 0
        ? regionSpectraCache
        : preview.regionSpectraCache,
  };
}

/**
 * Imports legacy dashboard session DB metadata into a session file when disk state is empty.
 *
 * Copies `regionsCache`, top-level regions/ingestion, and preview caches from the server session
 * into scan-keyed rows. Does not overwrite existing scan entries already present on disk.
 *
 * @param session - Parsed or empty session file for the experiment folder.
 * @param legacy - Prior `stepMetadata` loaded from the dashboard processing session API.
 */
export function importLegacyDashboardMetadataIntoSessionFile(
  session: StxmSessionFile,
  legacy: DashboardStepMetadata | undefined,
): StxmSessionFile {
  if (!legacy) {
    return session;
  }
  let next = { ...session, scans: { ...session.scans } };

  const regionsByScan = { ...(legacy.regionsCache ?? {}) };
  if (legacy.regions?.scanId) {
    regionsByScan[legacy.regions.scanId] = legacy.regions;
  } else if (legacy.regions && !legacy.regions.scanId) {
    const fallbackScanId = legacy.workspace?.selectedScanRelativePath;
    if (fallbackScanId) {
      regionsByScan[fallbackScanId] = legacy.regions;
    }
  }

  for (const [scanId, regions] of Object.entries(regionsByScan)) {
    if (next.scans[scanId]) {
      next = mergeStxmSessionScanEntry(next, scanId, {
        regions: next.scans[scanId]?.regions ?? regions,
      });
    } else {
      next = mergeStxmSessionScanEntry(next, scanId, { regions });
    }
  }

  const preview = legacy.preview;
  if (preview) {
    next = mergeStxmSessionPreview(next, {
      ...defaultStxmSessionPreview(),
      ...preview,
    });
    for (const [scanId, ingestion] of Object.entries(
      preview.ingestionCache ?? {},
    )) {
      next = mergeStxmSessionScanEntry(next, scanId, {
        ingestion: next.scans[scanId]?.ingestion ?? ingestion,
      });
    }
    for (const [scanId, regionSpectra] of Object.entries(
      preview.regionSpectraCache ?? {},
    )) {
      next = mergeStxmSessionScanEntry(next, scanId, {
        regionSpectra: next.scans[scanId]?.regionSpectra ?? regionSpectra,
      });
    }
  }

  if (legacy.ingestion?.scanId) {
    const scanId = legacy.ingestion.scanId;
    next = mergeStxmSessionScanEntry(next, scanId, {
      ingestion: next.scans[scanId]?.ingestion ?? legacy.ingestion,
    });
  }

  if (legacy.reduce?.scanId) {
    const scanId = legacy.reduce.scanId;
    next = mergeStxmSessionScanEntry(next, scanId, {
      reduce: next.scans[scanId]?.reduce ?? legacy.reduce,
    });
  }

  return next;
}
