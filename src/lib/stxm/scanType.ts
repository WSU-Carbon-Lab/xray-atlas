const HDR_TYPE_PATTERN = /Type\s*=\s*"([^"]*)"/;

export const STXM_SCAN_CATEGORIES = [
  "line_scan",
  "image_scan",
  "fixed_point",
  "focus_scan",
  "stack",
  "other",
] as const;

export type StxmScanCategory = (typeof STXM_SCAN_CATEGORIES)[number];

const CATEGORY_LABELS: Record<StxmScanCategory, string> = {
  line_scan: "LINE SCANS",
  image_scan: "IMAGE SCANS",
  fixed_point: "FIXED POINT",
  focus_scan: "FOCUS SCANS",
  stack: "STACKS",
  other: "OTHER",
};

/** Stable UI sort order for grouped scan lists. */
export const STXM_SCAN_CATEGORY_ORDER: StxmScanCategory[] = [
  "line_scan",
  "image_scan",
  "fixed_point",
  "focus_scan",
  "stack",
  "other",
];

/**
 * Parses the STXM `Type = "..."` field from raw `.hdr` text.
 */
export function parseHdrScanTypeFromText(hdrText: string): string {
  const match = HDR_TYPE_PATTERN.exec(hdrText);
  return match?.[1]?.trim() ?? "Unknown";
}

/**
 * Maps a header Type string to a stable UI grouping key aligned with the Python stxm package.
 */
export function scanTypeCategory(scanType: string): StxmScanCategory {
  const lowered = scanType.toLowerCase();
  if (lowered.includes("nexafs line scan") || lowered.includes("line scan")) {
    return "line_scan";
  }
  if (lowered.includes("image scan")) {
    return "image_scan";
  }
  if (lowered.includes("focus scan")) {
    return "focus_scan";
  }
  if (lowered.includes("fixed point") || lowered.includes("fixed-point")) {
    return "fixed_point";
  }
  if (lowered.includes("stack")) {
    return "stack";
  }
  return "other";
}

/** Returns the uppercase group header label for a scan category. */
export function scanCategoryLabel(category: StxmScanCategory): string {
  return CATEGORY_LABELS[category];
}
