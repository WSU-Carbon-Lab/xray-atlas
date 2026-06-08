import { isNexafsLineScanType } from "./isNexafsLineScan";
import { loadStxm } from "./loadStxm";
import type { HdrScanProbeResult } from "./probeHdrScan";
import { readHdr } from "./readHdr";
import {
  parseHdrScanTypeFromText,
  scanTypeCategory,
  type StxmScanCategory,
} from "./scanType";
import { candidateXimNamesForHdr } from "./pairStxmFiles";

/** Progressive scan-grid enrichment phase for a catalog row. */
export type StxmCatalogEnrichmentStatus = "placeholder" | "parsed" | "thumbnail";

export type StxmCatalogEntry = {
  basename: string;
  relativePath: string;
  scanType: string;
  category: StxmScanCategory;
  isNexafsLineScan: boolean;
  paxisCount: number | null;
  qaxisCount: number | null;
  energyMinEv: number | null;
  energyMaxEv: number | null;
  thumbnailDataUrl: string | null;
  /** Omitted on legacy rows; inferred as parsed or thumbnail from thumbnail data. */
  enrichmentStatus?: StxmCatalogEnrichmentStatus;
};

/**
 * Resolves the enrichment phase for UI grouping and icon transitions.
 */
export function catalogEntryEnrichmentStatus(
  entry: StxmCatalogEntry,
): StxmCatalogEnrichmentStatus {
  if (entry.enrichmentStatus) {
    return entry.enrichmentStatus;
  }
  return entry.thumbnailDataUrl ? "thumbnail" : "parsed";
}

/**
 * Builds a placeholder catalog row from a directory listing ref before `.hdr` parsing.
 */
export function buildPlaceholderCatalogEntry(input: {
  name: string;
  relativePath: string;
}): StxmCatalogEntry {
  return {
    basename: input.name,
    relativePath: input.relativePath,
    scanType: "",
    category: "other",
    isNexafsLineScan: false,
    paxisCount: null,
    qaxisCount: null,
    energyMinEv: null,
    energyMaxEv: null,
    thumbnailDataUrl: null,
    enrichmentStatus: "placeholder",
  };
}

/**
 * Replaces the row at `relativePath` with `parsed` when present; otherwise inserts sorted.
 */
export function applyParsedCatalogEntry(
  entries: StxmCatalogEntry[],
  parsed: StxmCatalogEntry,
): StxmCatalogEntry[] {
  const next = parsed.enrichmentStatus
    ? parsed
    : { ...parsed, enrichmentStatus: "parsed" as const };
  const index = entries.findIndex(
    (row) => row.relativePath === next.relativePath,
  );
  if (index >= 0) {
    const merged = entries.map((row) => ({ ...row }));
    merged[index] = next;
    return merged;
  }
  const merged = entries.map((row) => ({ ...row }));
  insertCatalogEntrySortedInPlace(merged, next);
  return merged;
}

function insertCatalogEntrySortedInPlace(
  entries: StxmCatalogEntry[],
  entry: StxmCatalogEntry,
): void {
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
}

function energyFromHeader(hdrText: string): {
  energyMinEv: number | null;
  energyMaxEv: number | null;
} {
  try {
    const header = readHdr(hdrText);
    const p = header.paxisPoints;
    const q = header.qaxisPoints;
    const pName = header.paxisName?.toLowerCase() ?? "";
    const qName = header.qaxisName?.toLowerCase() ?? "";
    const energyAxis =
      pName.includes("energy") || pName.endsWith("ev")
        ? p
        : qName.includes("energy") || qName.endsWith("ev")
          ? q
          : null;
    if (!energyAxis || energyAxis.length === 0) {
      return { energyMinEv: null, energyMaxEv: null };
    }
    const lo = Math.min(...energyAxis);
    const hi = Math.max(...energyAxis);
    return { energyMinEv: lo, energyMaxEv: hi };
  } catch {
    return { energyMinEv: null, energyMaxEv: null };
  }
}

/**
 * Builds a catalog row from a lightweight header probe without reading axis point arrays.
 */
export function buildCatalogEntryFromProbe(
  basename: string,
  relativePath: string,
  probe: HdrScanProbeResult,
): StxmCatalogEntry {
  return {
    basename,
    relativePath,
    scanType: probe.scanType,
    category: probe.category,
    isNexafsLineScan: probe.isNexafsLineScan,
    paxisCount: null,
    qaxisCount: null,
    energyMinEv: null,
    energyMaxEv: null,
    thumbnailDataUrl: null,
    enrichmentStatus: "parsed",
  };
}

/**
 * Builds a catalog entry from `.hdr` text and optional paired `.xim` bytes for NEXAFS validation.
 */
export function buildCatalogEntryFromHdr(
  basename: string,
  relativePath: string,
  hdrText: string,
  ximBuffer: ArrayBuffer | null,
): StxmCatalogEntry {
  const scanType = parseHdrScanTypeFromText(hdrText);
  const category = scanTypeCategory(scanType);
  let isNexafsLineScan = false;
  let paxisCount: number | null = null;
  let qaxisCount: number | null = null;
  let energyMinEv: number | null = null;
  let energyMaxEv: number | null = null;

  if (isNexafsLineScanType(hdrText)) {
    if (ximBuffer) {
      try {
        const loaded = loadStxm(hdrText, ximBuffer);
        isNexafsLineScan = loaded.isNexafsLineScan;
        paxisCount = loaded.header.paxisCount;
        qaxisCount = loaded.header.qaxisCount;
        energyMinEv = loaded.energyMinEv;
        energyMaxEv = loaded.energyMaxEv;
      } catch {
        isNexafsLineScan = false;
      }
    } else {
      isNexafsLineScan = true;
    }
  }

  if (energyMinEv === null) {
    const energy = energyFromHeader(hdrText);
    energyMinEv = energy.energyMinEv;
    energyMaxEv = energy.energyMaxEv;
  }

  try {
    const header = readHdr(hdrText);
    paxisCount ??= header.paxisCount;
    qaxisCount ??= header.qaxisCount;
  } catch {
    // header counts optional for catalog display
  }

  return {
    basename,
    relativePath,
    scanType,
    category,
    isNexafsLineScan,
    paxisCount,
    qaxisCount,
    energyMinEv,
    energyMaxEv,
    thumbnailDataUrl: null,
  };
}

/** Returns candidate `.xim` basenames for a `.hdr` basename. */
export function ximBasenamesForHdrBasename(hdrBasename: string): string[] {
  return candidateXimNamesForHdr(hdrBasename);
}

/**
 * Groups catalog entries by scan category in stable display order.
 */
export function groupCatalogEntries(
  entries: StxmCatalogEntry[],
): Map<StxmScanCategory, StxmCatalogEntry[]> {
  const grouped = new Map<StxmScanCategory, StxmCatalogEntry[]>();
  for (const category of [
    "line_scan",
    "image_scan",
    "fixed_point",
    "focus_scan",
    "stack",
    "other",
  ] as StxmScanCategory[]) {
    grouped.set(category, []);
  }
  for (const entry of entries) {
    const bucket = grouped.get(entry.category) ?? grouped.get("other");
    bucket?.push(entry);
  }
  return grouped;
}
