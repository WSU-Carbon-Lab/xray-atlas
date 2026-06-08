/**
 * Builds a stable trace override key from experiment id and geometry key.
 */
export function buildPlotViewerTraceKey(
  experimentId: string,
  geometryKey: string,
): string {
  return `${experimentId.trim()}:${geometryKey.trim()}`;
}

/**
 * Parses a trace key produced by {@link buildPlotViewerTraceKey}.
 */
export function parsePlotViewerTraceKey(traceKey: string): {
  experimentId: string;
  geometryKey: string;
} | null {
  const separatorIndex = traceKey.indexOf(":");
  if (separatorIndex <= 0 || separatorIndex >= traceKey.length - 1) {
    return null;
  }
  return {
    experimentId: traceKey.slice(0, separatorIndex),
    geometryKey: traceKey.slice(separatorIndex + 1),
  };
}
