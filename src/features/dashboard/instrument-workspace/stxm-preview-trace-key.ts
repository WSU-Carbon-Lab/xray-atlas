/** Sentinel region id when preview cache stores only aggregate ingestion spectra. */
export const STXM_PREVIEW_AGGREGATE_REGION_ID = "__aggregate__";

const TRACE_KEY_SEPARATOR = "::";

/**
 * Builds a stable trace key for one STXM preview compare trace (scan plus region).
 */
export function buildStxmPreviewTraceKey(
  scanId: string,
  regionId: string,
): string {
  return `${scanId}${TRACE_KEY_SEPARATOR}${regionId}`;
}

/**
 * Parses a preview trace key produced by {@link buildStxmPreviewTraceKey}.
 */
export function parseStxmPreviewTraceKey(traceKey: string): {
  scanId: string;
  regionId: string;
} | null {
  const separatorIndex = traceKey.indexOf(TRACE_KEY_SEPARATOR);
  if (separatorIndex <= 0) {
    return null;
  }
  const scanId = traceKey.slice(0, separatorIndex);
  const regionId = traceKey.slice(separatorIndex + TRACE_KEY_SEPARATOR.length);
  if (scanId.length === 0 || regionId.length === 0) {
    return null;
  }
  return { scanId, regionId };
}

/**
 * Returns true when `traceKey` selects the aggregate ingestion trace for a scan.
 */
export function isStxmPreviewAggregateTraceKey(traceKey: string): boolean {
  const parsed = parseStxmPreviewTraceKey(traceKey);
  return parsed?.regionId === STXM_PREVIEW_AGGREGATE_REGION_ID;
}
