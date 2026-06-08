export const STXM_IZERO_COLOR = "#2563eb";

export const STXM_REGION_COLORS = [
  "#16a34a",
  "#0891b2",
  "#ea580c",
  "#c026d3",
  "#65a30d",
  "#ca8a04",
] as const;

/**
 * Returns the stroke color for a sample region at the given zero-based index.
 */
export function stxmRegionSeriesColor(regionIndex: number): string {
  return STXM_REGION_COLORS[regionIndex % STXM_REGION_COLORS.length] ?? "#16a34a";
}

/**
 * Returns the stroke color for the izero reference series.
 */
export function stxmIzeroSeriesColor(): string {
  return STXM_IZERO_COLOR;
}
