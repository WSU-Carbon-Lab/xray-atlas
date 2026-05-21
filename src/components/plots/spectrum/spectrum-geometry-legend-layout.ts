import { LEGEND_SWATCH_WIDTH } from "./LegendSwatch";

export const LEGEND_INSET = 12;
export const LEGEND_GAP = 4;
export const LEGEND_PADDING = 8;
export const LEGEND_BORDER_PX = 1;
export const LEGEND_HEADER_FONT_SIZE = 11;
export const LEGEND_HEADER_MARGIN_BOTTOM = 6;
export const LEGEND_HEADER_BLOCK_HEIGHT =
  LEGEND_HEADER_FONT_SIZE + LEGEND_HEADER_MARGIN_BOTTOM;
export const LEGEND_ROW_HEIGHT = 14;
export const LEGEND_FONT_SIZE = 13;
export const LEGEND_FONT_FAMILY = "var(--font-sans), system-ui, sans-serif";

const MEASURE_SUBPIXEL_BUFFER_PX = 2;

/** Extra space between swatch block and angle column (legacy layout slack). */
export const LEGEND_TRACE_TO_ANGLE_EXTRA_PX = 24;

function measureTextWidthPx(
  text: string,
  fontSize: number,
  fontWeight: number,
): number {
  if (typeof document === "undefined" || text.length === 0) {
    return 0;
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return 0;
  }
  ctx.font = `${fontWeight} ${fontSize}px ${LEGEND_FONT_FAMILY}`;
  return ctx.measureText(text).width;
}

export function computeGeometryLegendBoxHeight(rowCount: number): number {
  const rowGaps = rowCount > 0 ? (rowCount - 1) * LEGEND_GAP : 0;
  const panelHeight =
    LEGEND_PADDING * 2 +
    LEGEND_HEADER_BLOCK_HEIGHT +
    rowCount * LEGEND_ROW_HEIGHT +
    rowGaps;
  return panelHeight + LEGEND_BORDER_PX * 2;
}

export type GeometryLegendWidthInput = {
  plotWidth: number;
  angleColumnTitle: string;
  angleLabels: readonly string[];
  headerCol1: string;
  headerCol2: string | null;
  isLinked: boolean;
  linkedAreaBandLegend: boolean;
};

/**
 * Estimates the minimum legend box width from grid column sizes and measured
 * header/angle text so the SVG frame and foreignObject fit content before
 * ResizeObserver refinement.
 */
export function computeGeometryLegendWidth(input: GeometryLegendWidthInput): number {
  const {
    plotWidth,
    angleLabels,
    headerCol1,
    headerCol2,
    isLinked,
    linkedAreaBandLegend,
  } = input;

  const measureHeader = (text: string) =>
    measureTextWidthPx(text, LEGEND_HEADER_FONT_SIZE, 600);
  const measureAngle = (text: string) =>
    measureTextWidthPx(text, LEGEND_FONT_SIZE, 500);

  const angleColWidth =
    angleLabels.length > 0
      ? Math.max(...angleLabels.map((label) => measureAngle(label)))
      : 40;

  const headerWidth = isLinked
    ? Math.max(measureHeader(headerCol1), measureHeader(headerCol2 ?? ""))
    : measureHeader(headerCol1);

  const swatchColumnCount = linkedAreaBandLegend ? 1 : isLinked ? 2 : 1;

  const gridContentWidth =
    LEGEND_SWATCH_WIDTH * swatchColumnCount +
    headerWidth +
    angleColWidth +
    LEGEND_TRACE_TO_ANGLE_EXTRA_PX;

  const panelWidth = LEGEND_PADDING * 2 + gridContentWidth;
  const boxWidth =
    panelWidth + LEGEND_BORDER_PX * 2 + MEASURE_SUBPIXEL_BUFFER_PX;

  return Math.min(
    Math.max(0, plotWidth - LEGEND_INSET * 2),
    Math.ceil(boxWidth),
  );
}

export function geometryLegendPanelDimensions(boxWidth: number, boxHeight: number): {
  panelWidth: number;
  panelHeight: number;
} {
  return {
    panelWidth: Math.max(0, boxWidth - LEGEND_BORDER_PX * 2),
    panelHeight: Math.max(0, boxHeight - LEGEND_BORDER_PX * 2),
  };
}
