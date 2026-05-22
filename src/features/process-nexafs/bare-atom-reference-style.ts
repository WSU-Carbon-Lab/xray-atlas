/**
 * Theme-aware stroke color for Henke/CXRO bare-atom reference overlays on spectrum plots.
 *
 * @param isDark When true, uses white for contrast on dark chart backgrounds; otherwise black.
 */
export function bareAtomReferenceStrokeColor(isDark: boolean): string {
  return isDark ? "#ffffff" : "#000000";
}
