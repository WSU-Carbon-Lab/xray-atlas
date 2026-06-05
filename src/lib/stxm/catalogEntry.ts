import { isNexafsLineScanType } from "./isNexafsLineScan";
import { loadStxm } from "./loadStxm";
import { readHdr } from "./readHdr";
import {
  parseHdrScanTypeFromText,
  scanTypeCategory,
  type StxmScanCategory,
} from "./scanType";
import { candidateXimNamesForHdr } from "./pairStxmFiles";

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
};

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
