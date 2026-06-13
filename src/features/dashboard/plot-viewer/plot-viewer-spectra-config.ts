/** Default row cap for plot-viewer spectrum loads (per experiment). */
export const PLOT_VIEWER_SPECTRUM_ROW_LIMIT = 5000;

/** Maximum concurrent experiment spectrum fetches in the plot viewer. */
export const PLOT_VIEWER_SPECTRUM_FETCH_CONCURRENCY = 3;

/** Debounce window for selection-driven spectrum refetches (milliseconds). */
export const PLOT_VIEWER_SPECTRUM_DEBOUNCE_MS = 250;

/** React Query stale window for cached spectrum rows (milliseconds). */
export const PLOT_VIEWER_SPECTRUM_STALE_MS = 5 * 60_000;

/** React Query garbage-collection window for cached spectrum rows (milliseconds). */
export const PLOT_VIEWER_SPECTRUM_GC_MS = 30 * 60_000;
