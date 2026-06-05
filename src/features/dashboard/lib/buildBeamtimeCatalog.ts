import {
  buildCatalogEntryFromHdr,
  buildPlaceholderCatalogEntry,
  catalogEntryEnrichmentStatus,
  scanThumbnailDataUrl,
  type StxmCatalogEntry,
  ximBasenamesForHdrBasename,
} from "~/lib/stxm";
import {
  isAllowedStxmFilename,
  validateStxmFilePair,
  validateStxmFileSize,
} from "~/lib/stxm/validateStxmFile";
import { readHdr } from "~/lib/stxm/readHdr";
import {
  countHdrFilesInDirectory,
  findXimFileForHdr,
  walkHdrFileRefs,
  type StxmDirectoryHandle,
  type StxmFileRef,
} from "./localDirectoryBrowser";
import type { StxmDirectoryLayout } from "./resolveDirectoryLayout";
import { getExperimentDirectory } from "./resolveDirectoryLayout";
import {
  buildStxmCatalogCheckpoint,
  catalogEntryFromCheckpointEntry,
  readStxmCatalogCheckpoint,
  summarizeCheckpointEntryCounts,
  writeStxmCatalogCheckpoint,
} from "./stxm-catalog-checkpoint";

/** Milliseconds without catalog progress before treating the walk as stalled. */
export const BEAMTIME_CATALOG_STALL_TIMEOUT_MS = 30_000;

/** @deprecated Use {@link BEAMTIME_CATALOG_STALL_TIMEOUT_MS}. */
export const BEAMTIME_CATALOG_BUILD_TIMEOUT_MS = BEAMTIME_CATALOG_STALL_TIMEOUT_MS;

const DEFAULT_CATALOG_BATCH_FLUSH_MS = 50;

/** Concurrent `.hdr` metadata reads during phase-2 catalog enrichment. */
export const HDR_PARSE_CONCURRENCY = 6;

export type StreamBeamtimeCatalogPhase =
  | "cache"
  | "listing"
  | "parsing"
  | "complete";

export type StreamBeamtimeCatalogProgress = {
  entries: StxmCatalogEntry[];
  discoveredCount: number;
  parsedCount: number;
  phase: StreamBeamtimeCatalogPhase;
  fromCache: boolean;
};

export type StreamBeamtimeCatalogOptions = {
  signal?: AbortSignal;
  batchFlushMs?: number;
  stallTimeoutMs?: number;
  /** When true, skips checkpoint hydration because the caller already painted cache rows. */
  skipInitialCheckpoint?: boolean;
  onProgress?: (progress: StreamBeamtimeCatalogProgress) => void;
};

export type StreamBeamtimeCatalogResult = {
  entries: StxmCatalogEntry[];
  complete: boolean;
  stalled: boolean;
};

/**
 * Inserts `entry` into `entries` sorted by `relativePath` when that path is not already present.
 *
 * @returns `true` when `entry` was inserted; `false` when a row with the same `relativePath` exists.
 */
export function insertCatalogEntrySorted(
  entries: StxmCatalogEntry[],
  entry: StxmCatalogEntry,
): boolean {
  if (entries.some((row) => row.relativePath === entry.relativePath)) {
    return false;
  }
  let low = 0;
  let high = entries.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    const midPath = entries[mid]?.relativePath ?? "";
    if (midPath.localeCompare(entry.relativePath) < 0) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  entries.splice(low, 0, entry);
  return true;
}

/**
 * Merges `additions` into `entries` by `relativePath`, preserving sorted `relativePath` order.
 */
export function mergeCatalogEntries(
  entries: StxmCatalogEntry[],
  additions: StxmCatalogEntry[],
): StxmCatalogEntry[] {
  const merged = entries.map((entry) => ({ ...entry }));
  for (const entry of additions) {
    insertCatalogEntrySorted(merged, entry);
  }
  return merged;
}

export type EnrichCatalogThumbnailsOptions = {
  signal?: AbortSignal;
  onProgress?: (entries: StxmCatalogEntry[]) => void;
};

async function readHdrText(ref: StxmFileRef): Promise<string | null> {
  try {
    const hdrFile = await ref.handle.getFile();
    validateStxmFileSize(hdrFile.size, "hdr");
    const hdrText = await hdrFile.text();
    readHdr(hdrText);
    return hdrText;
  } catch {
    return null;
  }
}

function buildFallbackParsedEntry(ref: StxmFileRef): StxmCatalogEntry {
  return {
    ...buildPlaceholderCatalogEntry(ref),
    scanType: "Unknown",
    enrichmentStatus: "parsed",
  };
}

function applyParsedCatalogRow(
  entries: StxmCatalogEntry[],
  parsed: StxmCatalogEntry,
): void {
  const index = entries.findIndex(
    (row) => row.relativePath === parsed.relativePath,
  );
  if (index >= 0) {
    entries[index] = parsed;
    return;
  }
  insertCatalogEntrySorted(entries, parsed);
}

/**
 * Parses placeholder catalog rows with bounded parallelism; leaves non-placeholder rows unchanged.
 */
export async function parsePlaceholderCatalogEntries(
  refs: StxmFileRef[],
  entries: StxmCatalogEntry[],
  options?: {
    signal?: AbortSignal;
    concurrency?: number;
    onRowParsed?: () => void;
  },
): Promise<void> {
  const concurrency = options?.concurrency ?? HDR_PARSE_CONCURRENCY;
  const pending = refs.filter((ref) => {
    const existing = entries.find((row) => row.relativePath === ref.relativePath);
    return (
      !existing || catalogEntryEnrichmentStatus(existing) === "placeholder"
    );
  });
  if (pending.length === 0) {
    return;
  }

  let cursor = 0;
  const worker = async () => {
    while (true) {
      if (options?.signal?.aborted) {
        return;
      }
      const index = cursor;
      cursor += 1;
      if (index >= pending.length) {
        return;
      }
      const ref = pending[index];
      if (!ref) {
        return;
      }
      const hdrText = await readHdrText(ref);
      const parsed = hdrText
        ? {
            ...buildCatalogEntryFromHdr(
              ref.name,
              ref.relativePath,
              hdrText,
              null,
            ),
            enrichmentStatus: "parsed" as const,
          }
        : buildFallbackParsedEntry(ref);
      applyParsedCatalogRow(entries, parsed);
      options?.onRowParsed?.();
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, pending.length) }, () =>
      worker(),
    ),
  );
}

function countParsedCatalogEntries(entries: StxmCatalogEntry[]): number {
  return entries.filter(
    (entry) => catalogEntryEnrichmentStatus(entry) !== "placeholder",
  ).length;
}

/**
 * Hydrates catalog rows from a checkpoint file without walking the experiment tree.
 */
export async function hydrateBeamtimeCatalogFromCheckpoint(
  root: StxmDirectoryHandle,
  layout: StxmDirectoryLayout,
  experimentName: string,
): Promise<StxmCatalogEntry[]> {
  const experimentDir = await getExperimentDirectory(root, layout, experimentName);
  const checkpoint = await readStxmCatalogCheckpoint(experimentDir);
  if (
    checkpoint?.experimentName !== experimentName ||
    (checkpoint?.entries.length ?? 0) === 0
  ) {
    return [];
  }
  return checkpoint.entries.map((row) => catalogEntryFromCheckpointEntry(row));
}

/**
 * Reads checkpoint scan counts for experiment folders when checkpoints exist.
 */
export async function readCheckpointScanCountsForExperiments(
  root: StxmDirectoryHandle,
  layout: StxmDirectoryLayout,
  experimentNames: string[],
): Promise<Map<string, { total: number; nexafs: number }>> {
  const counts = new Map<string, { total: number; nexafs: number }>();
  if (layout.mode === "single-experiment") {
    const experimentDir = await getExperimentDirectory(
      root,
      layout,
      layout.displayName,
    );
    const checkpoint = await readStxmCatalogCheckpoint(experimentDir);
    counts.set(
      layout.displayName,
      summarizeCheckpointEntryCounts(checkpoint),
    );
    return counts;
  }
  await Promise.all(
    experimentNames.map(async (name) => {
      try {
        const experimentDir = await root.getDirectoryHandle(name);
        const checkpoint = await readStxmCatalogCheckpoint(experimentDir);
        counts.set(name, summarizeCheckpointEntryCounts(checkpoint));
      } catch {
        counts.set(name, { total: 0, nexafs: 0 });
      }
    }),
  );
  return counts;
}

/**
 * Lists scan catalog entries from `.hdr` metadata only (no `.xim` reads or thumbnails).
 */
export async function buildBeamtimeCatalogFast(
  root: StxmDirectoryHandle,
  layout: StxmDirectoryLayout,
  experimentName: string,
): Promise<StxmCatalogEntry[]> {
  const result = await streamBeamtimeCatalogFast(root, layout, experimentName);
  return result.entries;
}

/**
 * Walks an experiment folder and reports `.hdr` catalog rows incrementally while parsing continues.
 *
 * Stalls only fail the walk when no rows have been discovered within `stallTimeoutMs`; partial
 * catalogs resolve successfully with `complete: false` and `stalled: true`.
 */
export async function streamBeamtimeCatalogFast(
  root: StxmDirectoryHandle,
  layout: StxmDirectoryLayout,
  experimentName: string,
  options?: StreamBeamtimeCatalogOptions,
): Promise<StreamBeamtimeCatalogResult> {
  const experimentDir = await getExperimentDirectory(root, layout, experimentName);
  const batchFlushMs = options?.batchFlushMs ?? DEFAULT_CATALOG_BATCH_FLUSH_MS;
  const stallTimeoutMs = options?.stallTimeoutMs ?? BEAMTIME_CATALOG_STALL_TIMEOUT_MS;
  let lastProgressAt = Date.now();
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let stalled = false;
  let complete = false;
  let phase: StreamBeamtimeCatalogPhase = "listing";
  let entries: StxmCatalogEntry[] = [];
  let refs: StxmFileRef[] = [];
  let fromCache = false;
  let hadCheckpoint = false;

  const touchProgress = () => {
    lastProgressAt = Date.now();
  };

  const flushProgress = () => {
    if (options?.signal?.aborted) {
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      return;
    }
    if (flushTimer !== null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    options?.onProgress?.({
      entries: entries.map((entry) => ({ ...entry })),
      discoveredCount: refs.length > 0 ? refs.length : entries.length,
      parsedCount: countParsedCatalogEntries(entries),
      phase,
      fromCache,
    });
    touchProgress();
  };

  const scheduleFlush = () => {
    if (flushTimer !== null) {
      return;
    }
    flushTimer = setTimeout(() => {
      if (options?.signal?.aborted) {
        flushTimer = null;
        return;
      }
      flushProgress();
    }, batchFlushMs);
  };

  const stallTimer = setInterval(() => {
    if (options?.signal?.aborted) {
      return;
    }
    if (Date.now() - lastProgressAt < stallTimeoutMs) {
      return;
    }
    stalled = true;
  }, 500);

  try {
    touchProgress();
    const checkpoint = options?.skipInitialCheckpoint
      ? null
      : await readStxmCatalogCheckpoint(experimentDir);
    if (
      checkpoint?.experimentName === experimentName &&
      (checkpoint.entries.length ?? 0) > 0
    ) {
      fromCache = true;
      hadCheckpoint = true;
      phase = "cache";
      entries = checkpoint.entries.map((row) => ({
        ...catalogEntryFromCheckpointEntry(row),
        thumbnailDataUrl: null,
      }));
      flushProgress();
    }

    phase = "listing";
    const checkpointByPath = new Map(
      checkpoint?.experimentName === experimentName
        ? checkpoint.entries.map((row) => [row.relativePath, row])
        : [],
    );
    const diskPaths = new Set<string>();
    refs = [];

    for await (const ref of walkHdrFileRefs(experimentDir, "", {
      onTraverse: touchProgress,
      signal: options?.signal,
    })) {
      if (options?.signal?.aborted) {
        break;
      }
      if (stalled) {
        break;
      }
      if (!isAllowedStxmFilename(ref.name) || diskPaths.has(ref.relativePath)) {
        continue;
      }
      diskPaths.add(ref.relativePath);
      refs.push(ref);
      touchProgress();

      if (entries.some((row) => row.relativePath === ref.relativePath)) {
        scheduleFlush();
        continue;
      }

      const cached = checkpointByPath.get(ref.relativePath);
      insertCatalogEntrySorted(
        entries,
        cached
          ? catalogEntryFromCheckpointEntry(cached)
          : buildPlaceholderCatalogEntry(ref),
      );
      scheduleFlush();
    }

    if (diskPaths.size > 0) {
      entries = entries.filter((entry) => diskPaths.has(entry.relativePath));
    }
    flushProgress();

    if (options?.signal?.aborted) {
      return {
        entries: entries.map((entry) => ({ ...entry })),
        complete: false,
        stalled,
      };
    }

    phase = "parsing";
    if (hadCheckpoint) {
      fromCache = true;
    }
    flushProgress();

    await parsePlaceholderCatalogEntries(refs, entries, {
      signal: options?.signal,
      onRowParsed: () => {
        touchProgress();
        scheduleFlush();
      },
    });
    phase = "complete";
    complete = !options?.signal?.aborted;
    fromCache = hadCheckpoint && complete;

    if (complete) {
      void writeStxmCatalogCheckpoint(
        experimentDir,
        buildStxmCatalogCheckpoint(experimentName, entries),
      );
    }
  } finally {
    clearInterval(stallTimer);
    if (flushTimer !== null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (!options?.signal?.aborted) {
      flushProgress();
    }
  }

  if (stalled && entries.length === 0) {
    throw new Error(
      `Scan listing timed out after ${stallTimeoutMs / 1000}s with no scans found`,
    );
  }

  return { entries: entries.map((entry) => ({ ...entry })), complete, stalled };
}

/**
 * Loads `.xim` previews for catalog rows in the background and reports progressive updates.
 */
export async function enrichBeamtimeCatalogThumbnails(
  root: StxmDirectoryHandle,
  layout: StxmDirectoryLayout,
  experimentName: string,
  entries: StxmCatalogEntry[],
  options?: EnrichCatalogThumbnailsOptions,
): Promise<StxmCatalogEntry[]> {
  const experimentDir = await getExperimentDirectory(root, layout, experimentName);
  const updated = entries.map((entry) => ({ ...entry }));

  for (let index = 0; index < updated.length; index += 1) {
    if (options?.signal?.aborted) {
      break;
    }
    const entry = updated[index];
    if (!entry || entry.thumbnailDataUrl) {
      continue;
    }
    const parts = entry.relativePath.split("/");
    const hdrName = parts.pop() ?? entry.basename;
    let directory = experimentDir;
    try {
      for (const segment of parts) {
        directory = await directory.getDirectoryHandle(segment);
      }
      const hdrHandle = await directory.getFileHandle(hdrName);
      const hdrFile = await hdrHandle.getFile();
      validateStxmFileSize(hdrFile.size, "hdr");
      const hdrText = await hdrFile.text();
      const ximNames = ximBasenamesForHdrBasename(hdrName);
      const hdrRef = { name: hdrName, relativePath: entry.relativePath, handle: hdrHandle };
      const ximHandle = await findXimFileForHdr(hdrRef, ximNames, directory);
      if (!ximHandle) {
        continue;
      }
      const ximFile = await ximHandle.getFile();
      if (!isAllowedStxmFilename(ximFile.name)) {
        continue;
      }
      validateStxmFileSize(ximFile.size, "xim");
      const ximBuffer = await ximFile.arrayBuffer();
      const enriched = buildCatalogEntryFromHdr(
        entry.basename,
        entry.relativePath,
        hdrText,
        ximBuffer,
      );
      const thumbnailDataUrl = await scanThumbnailDataUrl(
        hdrText,
        ximBuffer,
        hdrFile.size,
      );
      updated[index] = {
        ...enriched,
        thumbnailDataUrl,
        enrichmentStatus: "thumbnail",
      };
      options?.onProgress?.(updated.slice());
    } catch {
      continue;
    }
  }

  return updated;
}

/**
 * Builds a scan catalog for one experiment directory with optional line-scan thumbnails.
 */
export async function buildBeamtimeCatalog(
  root: StxmDirectoryHandle,
  layout: StxmDirectoryLayout,
  experimentName: string,
  withThumbnails = true,
): Promise<StxmCatalogEntry[]> {
  const entries = await buildBeamtimeCatalogFast(root, layout, experimentName);
  if (!withThumbnails) {
    return entries;
  }
  return enrichBeamtimeCatalogThumbnails(root, layout, experimentName, entries);
}

/**
 * Counts `.hdr` files per experiment folder without parsing header contents.
 */
export async function countHdrFilesInExperiments(
  root: StxmDirectoryHandle,
  layout: StxmDirectoryLayout,
  experimentNames: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (layout.mode === "single-experiment") {
    counts.set(layout.displayName, await countHdrFilesInDirectory(root));
    return counts;
  }
  for (const name of experimentNames) {
    try {
      const experimentDir = await root.getDirectoryHandle(name);
      counts.set(name, await countHdrFilesInDirectory(experimentDir));
    } catch {
      counts.set(name, 0);
    }
  }
  return counts;
}

/**
 * Loads paired `.hdr` and `.xim` files for a catalog entry from an experiment folder.
 */
export async function loadScanFilesFromCatalogEntry(
  root: StxmDirectoryHandle,
  layout: StxmDirectoryLayout,
  experimentName: string,
  entry: StxmCatalogEntry,
): Promise<{ hdrFile: File; ximFile: File } | null> {
  const experimentDir = await getExperimentDirectory(root, layout, experimentName);
  const parts = entry.relativePath.split("/");
  const hdrName = parts.pop() ?? entry.basename;
  let directory = experimentDir;
  for (const segment of parts) {
    directory = await directory.getDirectoryHandle(segment);
  }
  try {
    const hdrHandle = await directory.getFileHandle(hdrName);
    const hdrFile = await hdrHandle.getFile();
    const ximNames = ximBasenamesForHdrBasename(hdrName);
    for (const candidate of ximNames) {
      try {
        const ximHandle = await directory.getFileHandle(candidate);
        const ximFile = await ximHandle.getFile();
        validateStxmFilePair(hdrFile, ximFile);
        return { hdrFile, ximFile };
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}
