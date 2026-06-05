/**
 * Shared pixel layout for the STXM ingestion plot and region editor.
 *
 * Keeps spectrum plot widget height and region-editor column width in one place
 * so `StxmMultiRegionEditor` and `StxmIngestionPlotPanel` stay aligned without
 * importing each other. The region heatmap canvas fills the editor body below
 * its toolbar via `ResizeObserver`, within this shared total height.
 */

/** Total height for the ingestion spectrum plot widget and region editor column. */
export const STXM_INGESTION_SPECTRUM_HEIGHT_PX = 600;

/** Total width of the region editor column (heatmap plus row-sum trace). */
export const STXM_REGION_EDITOR_MAX_WIDTH_PX = 180;
