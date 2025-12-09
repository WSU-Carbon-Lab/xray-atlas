/**
 * Cursor utility functions for generating custom cursor data URLs from SVG icons.
 * Supports icons used in AnalysisToolbar for visual feedback during tool interactions.
 */

export type CursorType =
  | "pre-edge"
  | "post-edge"
  | "manual-peak"
  | "auto-peak"
  | "normalize"
  | "peaks"
  | "difference";

/**
 * SVG path data for ArrowLeftToLine icon (Pre Edge)
 * Source: lucide-react ArrowLeftToLine
 */
const ARROW_LEFT_TO_LINE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 19V5"/>
  <path d="m13 6-6 6 6 6"/>
  <path d="M7 12h14"/>
</svg>`;

/**
 * SVG path data for ArrowRightToLine icon (Post Edge)
 * Source: lucide-react ArrowRightToLine
 */
const ARROW_RIGHT_TO_LINE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M17 12H3"/>
  <path d="m11 18 6-6-6-6"/>
  <path d="M21 5v14"/>
</svg>`;

/**
 * SVG path data for PencilIcon (Manual Peak Mode)
 * Source: @heroicons/react/24/outline PencilIcon
 */
const PENCIL_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"/>
</svg>`;

/**
 * SVG path data for SparklesIcon (Auto Peak Detection)
 * Source: @heroicons/react/24/outline SparklesIcon
 */
const SPARKLES_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"/>
</svg>`;

/**
 * SVG path data for Square3Stack3DIcon (Normalize tool)
 * Source: @heroicons/react/24/outline Square3Stack3DIcon
 */
const SQUARE_3_STACK_3D_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" d="m3.75 4.5 7.5 4.25m0 0L3.75 3m7.5 1.5L12 2.25m-8.25 7.5 7.5 4.25M12 12l-8.25-4.25M12 12l7.5-4.25M12 12v8.25m0 0-7.5-4.25M12 20.25l7.5 4.25M12 20.25v-8.25m0 0L3.75 16.5m16.5 0L21 12m-5.25-7.5L21 3v8.25m-16.5 0L3 12v8.25"/>
</svg>`;

/**
 * SVG path data for Mountain icon (Peaks tool)
 * Source: lucide-react Mountain
 */
const MOUNTAIN_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="m8 3 4 8 5-5 5 15H2L8 3z"/>
</svg>`;

/**
 * SVG path data for Delta symbol (Difference tool)
 * Custom SVG for Δϴ symbol
 */
const DELTA_THETA_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <text x="12" y="18" font-family="Arial, sans-serif" font-size="16" font-weight="bold" text-anchor="middle" fill="currentColor">Δϴ</text>
</svg>`;

/**
 * Converts SVG string to a data URL for use with CSS cursor property.
 * @param svgString - The SVG markup as a string
 * @param hotSpotX - X coordinate of the cursor hot spot (default: 12, center of 24x24)
 * @param hotSpotY - Y coordinate of the cursor hot spot (default: 12, center of 24x24)
 * @returns CSS cursor value with data URL and hot spot coordinates
 */
function svgToCursorDataUrl(
  svgString: string,
  hotSpotX = 12,
  hotSpotY = 12,
): string {
  // Encode SVG string for use in data URL
  const encodedSvg = encodeURIComponent(svgString);
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
  return `url("${dataUrl}") ${hotSpotX} ${hotSpotY}, auto`;
}

/**
 * Cached cursor data URLs to avoid recomputation
 */
const cursorCache = new Map<CursorType, string>();

/**
 * Gets the cursor CSS value for a given cursor type.
 * Results are cached for performance.
 * @param cursorType - The type of cursor to generate
 * @returns CSS cursor value with data URL and fallback
 */
export function getCursorForType(cursorType: CursorType): string {
  // Return cached value if available
  if (cursorCache.has(cursorType)) {
    return cursorCache.get(cursorType)!;
  }

  let svgString: string;
  let hotSpotX = 12;
  let hotSpotY = 12;

  switch (cursorType) {
    case "pre-edge":
      svgString = ARROW_LEFT_TO_LINE_SVG;
      break;
    case "post-edge":
      svgString = ARROW_RIGHT_TO_LINE_SVG;
      break;
    case "manual-peak":
      svgString = PENCIL_ICON_SVG;
      break;
    case "auto-peak":
      svgString = SPARKLES_ICON_SVG;
      break;
    case "normalize":
      svgString = SQUARE_3_STACK_3D_ICON_SVG;
      break;
    case "peaks":
      svgString = MOUNTAIN_ICON_SVG;
      break;
    case "difference":
      svgString = DELTA_THETA_ICON_SVG;
      break;
    default:
      // Fallback to default cursor
      return "auto";
  }

  const cursorValue = svgToCursorDataUrl(svgString, hotSpotX, hotSpotY);
  cursorCache.set(cursorType, cursorValue);
  return cursorValue;
}
