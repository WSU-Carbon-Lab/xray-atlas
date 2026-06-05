import {
  buildCatalogEntryFromHdr,
  scanThumbnailDataUrl,
  type StxmCatalogEntry,
  ximBasenamesForHdrBasename,
} from "~/lib/stxm";
import {
  isAllowedStxmFilename,
  validateStxmFilePair,
  validateStxmFileSize,
  validateStxmHdrMetadata,
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

/** Milliseconds without catalog progress before treating the walk as stalled. */
export const BEAMTIME_CATALOG_STALL_TIMEOUT_MS = 30_000;

/** @deprecated Use {@link BEAMTIME_CATALOG_STALL_TIMEOUT_MS}. */
export const BEAMTIME_CATALOG_BUILD_TIMEOUT_MS = BEAMTIME_CATALOG_STALL_TIMEOUT_MS;

const DEFAULT_CATALOG_BATCH_FLUSH_MS = 50;

export type StreamBeamtimeCatalogProgress = {
  entries: StxmCatalogEntry[];
  discoveredCount: number;
};

export type StreamBeamtimeCatalogOptions = {
  signal?: AbortSignal;
  batchFlushMs?: number;
  stallTimeoutMs?: number;
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

async function readHdrEntry(
  ref: StxmFileRef,
): Promise<{ hdrText: string; hdrByteLength: number } | null> {
  try {
    const hdrFile = await ref.handle.getFile();
    validateStxmFileSize(hdrFile.size, "hdr");
    const hdrText = await hdrFile.text();
    validateStxmHdrMetadata(readHdr(hdrText));
    return { hdrText, hdrByteLength: hdrFile.size };
  } catch {
    return null;
  }
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
  const entries: StxmCatalogEntry[] = [];
  const seenPaths = new Set<string>();
  const batchFlushMs = options?.batchFlushMs ?? DEFAULT_CATALOG_BATCH_FLUSH_MS;
  const stallTimeoutMs = options?.stallTimeoutMs ?? BEAMTIME_CATALOG_STALL_TIMEOUT_MS;
  let lastProgressAt = Date.now();
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let stalled = false;
  let complete = false;
  let fatalStallError: Error | null = null;

  const touchProgress = () => {
    lastProgressAt = Date.now();
  };

  const flushProgress = () => {
    if (flushTimer !== null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    options?.onProgress?.({
      entries: entries.map((entry) => ({ ...entry })),
      discoveredCount: entries.length,
    });
    touchProgress();
  };

  const scheduleFlush = () => {
    if (flushTimer !== null) {
      return;
    }
    flushTimer = setTimeout(() => {
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
    if (entries.length === 0) {
      fatalStallError = new Error(
        `Scan listing timed out after ${stallTimeoutMs / 1000}s with no scans found`,
      );
    }
  }, 500);

  try {
    for await (const ref of walkHdrFileRefs(experimentDir)) {
      if (options?.signal?.aborted || stalled) {
        break;
      }
      if (!isAllowedStxmFilename(ref.name) || seenPaths.has(ref.relativePath)) {
        continue;
      }
      seenPaths.add(ref.relativePath);
      touchProgress();
      const hdr = await readHdrEntry(ref);
      if (!hdr) {
        continue;
      }
      insertCatalogEntrySorted(
        entries,
        buildCatalogEntryFromHdr(ref.name, ref.relativePath, hdr.hdrText, null),
      );
      scheduleFlush();
      touchProgress();
    }
    complete = !stalled && !options?.signal?.aborted;
  } finally {
    clearInterval(stallTimer);
    if (flushTimer !== null) {
      clearTimeout(flushTimer);
    }
    flushProgress();
  }

  if (fatalStallError) {
    throw fatalStallError;
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
