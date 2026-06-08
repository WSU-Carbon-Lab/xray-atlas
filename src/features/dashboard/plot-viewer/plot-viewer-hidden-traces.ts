import { PLOT_VIEWER_MAX_HIDDEN_TRACE_IDS } from "./plot-viewer-url-state";
import { parsePlotViewerTraceKey } from "./plot-viewer-trace-key";

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
    if (ids.length >= PLOT_VIEWER_MAX_HIDDEN_TRACE_IDS) {
      break;
    }
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
 * Builds a set for repeated hidden-trace membership checks in legend and plot filtering.
 */
export function plotViewerHiddenTraceIdSet(
  hiddenTraceIds: readonly string[],
): ReadonlySet<string> {
  return new Set(hiddenTraceIds);
}

/**
 * Returns true when `traceKey` is in `hiddenTraceIds`.
 */
export function isPlotViewerTraceHidden(
  hiddenTraceIds: readonly string[] | ReadonlySet<string>,
  traceKey: string,
): boolean {
  if (Array.isArray(hiddenTraceIds)) {
    return hiddenTraceIds.includes(traceKey);
  }
  return hiddenTraceIds.has(traceKey);
}

/**
 * Drops hidden-trace keys whose experiment id is not in `activeExperimentIds`.
 */
export function prunePlotViewerHiddenTraceIdsForDatasets(
  hiddenTraceIds: readonly string[],
  activeExperimentIds: readonly string[],
): string[] {
  const active = new Set(activeExperimentIds);
  return hiddenTraceIds.filter((traceKey) => {
    const parsed = parsePlotViewerTraceKey(traceKey);
    if (!parsed) {
      return false;
    }
    return active.has(parsed.experimentId);
  });
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
