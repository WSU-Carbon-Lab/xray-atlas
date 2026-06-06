const STORAGE_KEY = "xray-atlas-plot-viewer-pins:v1";

/**
 * Reads session-local pinned experiment ids for the plot viewer (MVP stub).
 */
export function readPlotViewerPins(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

/**
 * Persists session-local pinned experiment ids for the plot viewer.
 */
export function writePlotViewerPins(experimentIds: readonly string[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...experimentIds]));
  } catch {
    return;
  }
}

/**
 * Toggles one experiment id in the session pin list and returns the updated list.
 */
export function togglePlotViewerPin(experimentId: string): string[] {
  const current = readPlotViewerPins();
  const next = current.includes(experimentId)
    ? current.filter((id) => id !== experimentId)
    : [...current, experimentId];
  writePlotViewerPins(next);
  return next;
}
