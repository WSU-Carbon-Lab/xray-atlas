/**
 * Shared pixel layout for the STXM ingestion plot and region editor.
 *
 * Keeps spectrum SVG height and region-editor column width in one place so
 * `StxmMultiRegionEditor` and `StxmIngestionPlotPanel` stay aligned without
 * importing each other.
 */

/** SVG height for the ingestion spectrum plot; matches the region heatmap canvas. */
export const STXM_INGESTION_SPECTRUM_HEIGHT_PX = 600;

/** Total width of the region editor column (heatmap plus row-sum trace). */
export const STXM_REGION_EDITOR_MAX_WIDTH_PX = 180;
