import { prunePlotViewerHiddenTraceIdsForDatasets } from "./plot-viewer-hidden-traces";
import type { PlotViewerUrlState } from "./plot-viewer-url-state";
import { normalizePlotViewerDatasetIds } from "./plot-viewer-url-state";

/**
 * Applies a new dataset id list and prunes hidden-trace keys that no longer belong to a selected experiment.
 */
export function plotViewerUrlStateWithDatasets(
  current: PlotViewerUrlState,
  experimentIds: readonly string[],
): PlotViewerUrlState {
  const datasets = normalizePlotViewerDatasetIds(experimentIds);
  return {
    ...current,
    datasets,
    hiddenTraceIds: prunePlotViewerHiddenTraceIdsForDatasets(
      current.hiddenTraceIds,
      datasets,
    ),
  };
}

/**
 * Toggles one experiment in the dataset list and prunes orphaned hidden-trace keys on removal.
 */
export function plotViewerUrlStateToggleDataset(
  current: PlotViewerUrlState,
  experimentId: string,
  nextGeometryKeys?: string[],
): PlotViewerUrlState {
  const selected = new Set(current.datasets);
  if (selected.has(experimentId)) {
    selected.delete(experimentId);
  } else {
    selected.add(experimentId);
  }
  const next = plotViewerUrlStateWithDatasets(current, [...selected]);
  if (nextGeometryKeys !== undefined) {
    return { ...next, geometryKeys: nextGeometryKeys };
  }
  return next;
}
