import type { PlotViewerUrlState } from "./plot-viewer-url-state";

/**
 * True when the plot viewer should load and show catalog Results (search text or any facet).
 */
export function hasActivePlotViewerCatalogFilter(
  debouncedQuery: string,
  facets: PlotViewerUrlState["facets"],
): boolean {
  return (
    debouncedQuery.length > 0 ||
    facets.mol.length > 0 ||
    facets.edge.length > 0 ||
    facets.instrument.length > 0 ||
    facets.facility.length > 0
  );
}
