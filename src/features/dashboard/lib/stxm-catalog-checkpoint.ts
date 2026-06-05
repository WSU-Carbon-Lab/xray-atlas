import type { StxmCatalogEntry } from "~/lib/stxm";
import type { StxmScanCategory } from "~/lib/stxm/scanType";
import type { StxmDirectoryHandle } from "./fileSystemAccessTypes";
import type { StxmFileRef } from "./localDirectoryBrowser";
import {
  buildPlaceholderCatalogEntry,
  catalogEntryEnrichmentStatus,
} from "~/lib/stxm";

/** Hidden checkpoint filename written beside STXM scans in each experiment folder. */
export const STXM_CATALOG_CHECKPOINT_FILENAME = ".xray-atlas-stxm-catalog.json";

/** Schema version for {@link STXM_CATALOG_CHECKPOINT_FILENAME} payloads. */
export const STXM_CATALOG_CHECKPOINT_VERSION = 1 as const;

/** Minimal hdr-derived metadata persisted per scan for fast re-open. */
export type StxmCatalogCheckpointEntry = {
  relativePath: string;
  basename: string;
  scanType: string;
  category: StxmScanCategory;
  isNexafsLineScan: boolean;
  paxisCount: number | null;
  qaxisCount: number | null;
  energyMinEv: number | null;
  energyMaxEv: number | null;
};

/** On-disk checkpoint for one experiment directory. */
export type StxmCatalogCheckpoint = {
  version: typeof STXM_CATALOG_CHECKPOINT_VERSION;
  generatedAt: string;
  experimentName: string;
  entries: StxmCatalogCheckpointEntry[];
};

const SCAN_CATEGORIES: readonly StxmScanCategory[] = [
  "line_scan",
  "image_scan",
  "focus_scan",
  "fixed_point",
  "stack",
  "other",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === "number";
}

function isScanCategory(value: unknown): value is StxmScanCategory {
  return (
    typeof value === "string" &&
    (SCAN_CATEGORIES as readonly string[]).includes(value)
  );
}

function isCheckpointEntry(value: unknown): value is StxmCatalogCheckpointEntry {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.relativePath === "string" &&
    typeof value.basename === "string" &&
    typeof value.scanType === "string" &&
    isScanCategory(value.category) &&
    typeof value.isNexafsLineScan === "boolean" &&
    isNullableNumber(value.paxisCount) &&
    isNullableNumber(value.qaxisCount) &&
    isNullableNumber(value.energyMinEv) &&
    isNullableNumber(value.energyMaxEv)
  );
}

/**
 * Parses checkpoint JSON from an experiment folder; returns `null` when invalid or unsupported.
 */
export function parseStxmCatalogCheckpoint(text: string): StxmCatalogCheckpoint | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!isRecord(parsed)) {
      return null;
    }
    if (parsed.version !== STXM_CATALOG_CHECKPOINT_VERSION) {
      return null;
    }
    if (typeof parsed.generatedAt !== "string") {
      return null;
    }
    if (typeof parsed.experimentName !== "string") {
      return null;
    }
    if (!Array.isArray(parsed.entries)) {
      return null;
    }
    const entries: StxmCatalogCheckpointEntry[] = [];
    for (const row of parsed.entries) {
      if (!isCheckpointEntry(row)) {
        return null;
      }
      entries.push(row);
    }
    entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    return {
      version: STXM_CATALOG_CHECKPOINT_VERSION,
      generatedAt: parsed.generatedAt,
      experimentName: parsed.experimentName,
      entries,
    };
  } catch {
    return null;
  }
}

/**
 * Serializes a checkpoint document for {@link STXM_CATALOG_CHECKPOINT_FILENAME}.
 */
export function serializeStxmCatalogCheckpoint(
  checkpoint: StxmCatalogCheckpoint,
): string {
  return `${JSON.stringify(checkpoint, null, 2)}\n`;
}

/**
 * Converts a parsed catalog row into checkpoint metadata (omits thumbnails and runtime-only fields).
 */
export function catalogEntryToCheckpointEntry(
  entry: StxmCatalogEntry,
): StxmCatalogCheckpointEntry {
  return {
    relativePath: entry.relativePath,
    basename: entry.basename,
    scanType: entry.scanType,
    category: entry.category,
    isNexafsLineScan: entry.isNexafsLineScan,
    paxisCount: entry.paxisCount,
    qaxisCount: entry.qaxisCount,
    energyMinEv: entry.energyMinEv,
    energyMaxEv: entry.energyMaxEv,
  };
}

/**
 * Hydrates a catalog row from checkpoint metadata with `enrichmentStatus` `parsed`.
 */
export function catalogEntryFromCheckpointEntry(
  entry: StxmCatalogCheckpointEntry,
): StxmCatalogEntry {
  return {
    ...entry,
    thumbnailDataUrl: null,
    enrichmentStatus: "parsed",
  };
}

/**
 * Builds a checkpoint payload from parsed catalog rows (skips placeholders and thumbnail-only state).
 */
export function buildStxmCatalogCheckpoint(
  experimentName: string,
  entries: StxmCatalogEntry[],
): StxmCatalogCheckpoint {
  const parsed = entries
    .filter((entry) => catalogEntryEnrichmentStatus(entry) !== "placeholder")
    .map(catalogEntryToCheckpointEntry)
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return {
    version: STXM_CATALOG_CHECKPOINT_VERSION,
    generatedAt: new Date().toISOString(),
    experimentName,
    entries: parsed,
  };
}

/**
 * Merges checkpoint rows with a fresh directory listing: cached metadata for known paths,
 * placeholders for new paths, and drops checkpoint rows missing from disk.
 */
export function reconcileCatalogWithDiskListing(
  diskRefs: StxmFileRef[],
  checkpointEntries: StxmCatalogCheckpointEntry[] | null,
): StxmCatalogEntry[] {
  const checkpointByPath = new Map(
    (checkpointEntries ?? []).map((entry) => [entry.relativePath, entry]),
  );
  return diskRefs.map((ref) => {
    const cached = checkpointByPath.get(ref.relativePath);
    if (cached) {
      return catalogEntryFromCheckpointEntry(cached);
    }
    return buildPlaceholderCatalogEntry(ref);
  });
}

/**
 * Merges freshly parsed rows into `entries` by `relativePath`, preserving sort order.
 */
export function mergeParsedCatalogEntries(
  entries: StxmCatalogEntry[],
  parsedRows: StxmCatalogEntry[],
): StxmCatalogEntry[] {
  if (parsedRows.length === 0) {
    return entries.map((entry) => ({ ...entry }));
  }
  const parsedByPath = new Map(
    parsedRows.map((row) => [row.relativePath, row]),
  );
  return entries.map((entry) => {
    const parsed = parsedByPath.get(entry.relativePath);
    if (!parsed) {
      return { ...entry };
    }
    return {
      ...parsed,
      enrichmentStatus: "parsed" as const,
      thumbnailDataUrl: entry.thumbnailDataUrl ?? parsed.thumbnailDataUrl,
    };
  });
}

/**
 * Reads {@link STXM_CATALOG_CHECKPOINT_FILENAME} from `directory`; returns `null` when missing or invalid.
 */
export async function readStxmCatalogCheckpoint(
  directory: StxmDirectoryHandle,
): Promise<StxmCatalogCheckpoint | null> {
  try {
    const handle = await directory.getFileHandle(STXM_CATALOG_CHECKPOINT_FILENAME);
    const file = await handle.getFile();
    const text = await file.text();
    return parseStxmCatalogCheckpoint(text);
  } catch {
    return null;
  }
}

/**
 * Writes {@link STXM_CATALOG_CHECKPOINT_FILENAME} beside scans; fails silently when the folder is read-only.
 */
export async function writeStxmCatalogCheckpoint(
  directory: StxmDirectoryHandle,
  checkpoint: StxmCatalogCheckpoint,
): Promise<boolean> {
  try {
    const handle = await directory.getFileHandle(STXM_CATALOG_CHECKPOINT_FILENAME, {
      create: true,
    });
    if (!handle.createWritable) {
      return false;
    }
    const writable = await handle.createWritable();
    await writable.write(serializeStxmCatalogCheckpoint(checkpoint));
    await writable.close();
    return true;
  } catch {
    return false;
  }
}
