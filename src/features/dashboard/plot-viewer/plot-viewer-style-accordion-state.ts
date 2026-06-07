const STORAGE_KEY = "plot-viewer-style-accordion:v1";

function parseExpandedKeys(raw: string | null): Set<string> {
  if (!raw) {
    return new Set();
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(
      parsed.filter((value): value is string => typeof value === "string"),
    );
  } catch {
    return new Set();
  }
}

function hasSessionStorage(): boolean {
  return typeof globalThis.sessionStorage !== "undefined";
}

/**
 * Reads persisted plot-viewer style accordion expansion ids from sessionStorage.
 */
export function readPlotViewerStyleAccordionExpandedKeys(): Set<string> {
  if (!hasSessionStorage()) {
    return new Set();
  }
  return parseExpandedKeys(globalThis.sessionStorage.getItem(STORAGE_KEY));
}

/**
 * Persists plot-viewer style accordion expansion ids to sessionStorage.
 */
export function writePlotViewerStyleAccordionExpandedKeys(
  keys: Iterable<string>,
): void {
  if (!hasSessionStorage()) {
    return;
  }
  try {
    globalThis.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  } catch {
    // Quota or private browsing; ignore.
  }
}
