import type { PlotViewerStyledTrace } from "./plot-viewer-styled-traces";

export type PlotViewerSubplotPanel = {
  geometryKey: string;
  angleLabel: string;
  geometrySortKey: string;
  traces: PlotViewerStyledTrace[];
};

/**
 * Partitions styled overlay traces into one small-multiples panel per geometry key.
 */
export function partitionPlotViewerTracesByGeometry(
  traces: readonly PlotViewerStyledTrace[],
): PlotViewerSubplotPanel[] {
  if (traces.length === 0) {
    return [];
  }

  const byGeometry = new Map<string, PlotViewerStyledTrace[]>();
  for (const trace of traces) {
    const bucket = byGeometry.get(trace.geometryKey);
    if (bucket) {
      bucket.push(trace);
    } else {
      byGeometry.set(trace.geometryKey, [trace]);
    }
  }

  return [...byGeometry.entries()]
    .map(([geometryKey, panelTraces]) => {
      const sorted = panelTraces
        .slice()
        .sort((left, right) => left.datasetOrder - right.datasetOrder);
      const head = sorted[0];
      return {
        geometryKey,
        angleLabel: head?.descriptors.thetaPhi ?? geometryKey,
        geometrySortKey: head?.geometrySortKey ?? geometryKey,
        traces: sorted,
      };
    })
    .slice()
    .sort((left, right) =>
      left.geometrySortKey.localeCompare(right.geometrySortKey),
    );
}
