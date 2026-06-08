import type { PlotViewerUrlState } from "./plot-viewer-url-state";
import { PLOT_VIEWER_MAX_QUERY_LENGTH } from "./plot-viewer-url-state";

/**
 * Merges debounced catalog search text into plot viewer state before URL serialization.
 */
export function plotViewerStateForUrlWrite(
  state: PlotViewerUrlState,
  debouncedQuery: string,
): PlotViewerUrlState {
  return {
    ...state,
    query: debouncedQuery.trim().slice(0, PLOT_VIEWER_MAX_QUERY_LENGTH),
  };
}

/**
 * Debounces a string value by `delayMs`; returns the latest value after typing pauses.
 */
export function createDebouncedStringScheduler(
  delayMs: number,
  onDebounced: (value: string) => void,
): {
  schedule: (value: string) => void;
  cancel: () => void;
  flush: (value: string) => void;
} {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const cancel = () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  const schedule = (value: string) => {
    cancel();
    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      onDebounced(value.trim());
    }, delayMs);
  };

  const flush = (value: string) => {
    cancel();
    onDebounced(value.trim());
  };

  return { schedule, cancel, flush };
}
