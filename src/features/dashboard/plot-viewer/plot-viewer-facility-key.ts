/**
 * Canonical lowercase facility facet key for plot-viewer catalog filtering and URL state.
 */
export function normalizePlotViewerFacilityKey(
  name: string | null | undefined,
): string {
  return (name?.trim() ?? "Unknown facility").toLowerCase();
}

/**
 * Returns true when `facilityName` matches one of the selected facility facet keys (case-insensitive).
 * An empty `selectedFacilityKeys` list matches every group.
 */
export function plotViewerGroupMatchesFacilityFacet(
  facilityName: string | null | undefined,
  selectedFacilityKeys: readonly string[],
): boolean {
  if (selectedFacilityKeys.length === 0) {
    return true;
  }
  const allowed = new Set(
    selectedFacilityKeys.map((value) => value.trim().toLowerCase()),
  );
  return allowed.has(normalizePlotViewerFacilityKey(facilityName));
}
