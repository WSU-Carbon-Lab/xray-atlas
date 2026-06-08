import { isNexafsLineScanType } from "./isNexafsLineScan";
import {
  parseHdrScanTypeFromText,
  scanTypeCategory,
  type StxmScanCategory,
} from "./scanType";

/** Bytes read from each `.hdr` file for scan-type classification (Type is near the top). */
export const HDR_SCAN_TYPE_PEEK_BYTES = 4096;

/** Result of a lightweight `.hdr` scan-type probe without axis parsing. */
export type HdrScanProbeResult = {
  scanType: string;
  category: StxmScanCategory;
  isNexafsLineScan: boolean;
};

/**
 * Classifies an STXM scan from a `.hdr` text prefix using only the `Type = "..."` field.
 *
 * @param hdrPeek - Leading bytes of `.hdr` content (typically the first 4 KiB).
 * @returns Scan type, UI category, and NEXAFS line-scan flag derived from the Type line.
 */
export function probeHdrScanFromText(hdrPeek: string): HdrScanProbeResult {
  const scanType = parseHdrScanTypeFromText(hdrPeek);
  const category = scanTypeCategory(scanType);
  return {
    scanType,
    category,
    isNexafsLineScan: isNexafsLineScanType(hdrPeek),
  };
}

/**
 * Returns true when a probe category is a line scan suitable for ingestion listing.
 */
export function isProbedLineScan(probe: HdrScanProbeResult): boolean {
  return probe.category === "line_scan" || probe.isNexafsLineScan;
}
