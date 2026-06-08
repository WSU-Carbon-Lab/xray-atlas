import { parsePlotViewerTraceKey } from "~/features/dashboard/plot-viewer/plot-viewer-trace-key";
import { parseStxmPreviewTraceKey } from "./stxm-preview-trace-key";

const UUID_PREFIX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export type PreviewCompareTraceSource = "stxm" | "atlas";

/**
 * Classifies a preview compare trace key as local STXM cache or Atlas catalog geometry.
 */
export function previewCompareTraceSource(
  traceKey: string,
): PreviewCompareTraceSource {
  const atlasParsed = parsePlotViewerTraceKey(traceKey);
  if (atlasParsed && UUID_PREFIX.test(atlasParsed.experimentId)) {
    return "atlas";
  }
  return "stxm";
}

/**
 * Splits mixed preview compare trace keys into STXM and Atlas buckets preserving order.
 */
export function partitionPreviewCompareTraceKeys(traceKeys: readonly string[]): {
  stxmTraceKeys: string[];
  atlasTraceKeys: string[];
} {
  const stxmTraceKeys: string[] = [];
  const atlasTraceKeys: string[] = [];
  for (const traceKey of traceKeys) {
    if (previewCompareTraceSource(traceKey) === "atlas") {
      atlasTraceKeys.push(traceKey);
    } else {
      stxmTraceKeys.push(traceKey);
    }
  }
  return { stxmTraceKeys, atlasTraceKeys };
}

/**
 * Returns true when `traceKey` belongs to an Atlas experiment compare trace.
 */
export function isAtlasPreviewCompareTraceKey(traceKey: string): boolean {
  return previewCompareTraceSource(traceKey) === "atlas";
}

/**
 * Parses an Atlas preview trace key into experiment and geometry ids; returns null for STXM keys.
 */
export function parseAtlasPreviewCompareTraceKey(traceKey: string): {
  experimentId: string;
  geometryKey: string;
} | null {
  if (!isAtlasPreviewCompareTraceKey(traceKey)) {
    return null;
  }
  return parsePlotViewerTraceKey(traceKey);
}

/**
 * Returns true when `traceKey` belongs to a cached STXM scan compare trace.
 */
export function isStxmPreviewCompareTraceKey(traceKey: string): boolean {
  return parseStxmPreviewTraceKey(traceKey) != null;
}
