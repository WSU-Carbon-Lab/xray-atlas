const STORAGE_KEY = "xray-atlas-plot-viewer-colors:v1";

/**
 * Reads per-experiment color overrides from sessionStorage for the plot viewer.
 */
export function readPlotViewerColorOverrides(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim().length > 0) {
        result[key] = value.trim();
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Persists or clears one experiment color override in sessionStorage.
 */
export function writePlotViewerColorOverride(
  experimentId: string,
  color: string | null,
): Record<string, string> {
  const current = readPlotViewerColorOverrides();
  if (color == null || color.trim().length === 0) {
    delete current[experimentId];
  } else {
    current[experimentId] = color.trim();
  }
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      return current;
    }
  }
  return current;
}
