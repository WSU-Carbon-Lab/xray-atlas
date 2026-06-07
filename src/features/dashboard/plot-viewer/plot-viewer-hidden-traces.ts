/**
 * Parses comma-separated trace keys from the `hidden` plot-viewer URL param.
 */
export function parsePlotViewerHiddenTraceIds(
  searchParams: URLSearchParams,
): string[] {
  const raw = searchParams.get("hidden");
  if (!raw) {
    return [];
  }
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    ids.push(trimmed);
  }
  return ids;
}

/**
 * Writes hidden trace keys to `hidden`, omitting the param when the list is empty.
 */
export function writePlotViewerHiddenTraceIds(
  searchParams: URLSearchParams,
  hiddenTraceIds: readonly string[],
): void {
  if (hiddenTraceIds.length > 0) {
    searchParams.set("hidden", hiddenTraceIds.join(","));
  } else {
    searchParams.delete("hidden");
  }
}

/**
 * Toggles one trace key in a hidden-trace list; returns a new array.
 */
export function togglePlotViewerHiddenTraceId(
  hiddenTraceIds: readonly string[],
  traceKey: string,
): string[] {
  const hidden = new Set(hiddenTraceIds);
  if (hidden.has(traceKey)) {
    hidden.delete(traceKey);
  } else {
    hidden.add(traceKey);
  }
  return [...hidden];
}

/**
 * Returns true when `traceKey` is in `hiddenTraceIds`.
 */
export function isPlotViewerTraceHidden(
  hiddenTraceIds: readonly string[],
  traceKey: string,
): boolean {
  return hiddenTraceIds.includes(traceKey);
}

/**
 * Filters styled traces by hidden keys; when every trace would be removed, returns the
 * original list so the plot never renders empty solely from legend toggles.
 */
export function filterPlotViewerTracesByHiddenIds<T extends { traceKey: string }>(
  traces: readonly T[],
  hiddenTraceIds: readonly string[],
): T[] {
  if (hiddenTraceIds.length === 0 || traces.length === 0) {
    return [...traces];
  }
  const hidden = new Set(hiddenTraceIds);
  const visible = traces.filter((trace) => !hidden.has(trace.traceKey));
  return visible.length > 0 ? visible : [...traces];
}
