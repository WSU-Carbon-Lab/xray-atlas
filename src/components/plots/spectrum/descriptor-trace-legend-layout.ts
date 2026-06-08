import { LEGEND_SWATCH_WIDTH } from "./LegendSwatch";
import {
  LEGEND_BORDER_PX,
  LEGEND_FONT_FAMILY,
  LEGEND_FONT_SIZE,
  LEGEND_GAP,
  LEGEND_HEADER_BLOCK_HEIGHT,
  LEGEND_HEADER_FONT_SIZE,
  LEGEND_INSET,
  LEGEND_PADDING,
  LEGEND_ROW_HEIGHT,
  geometryLegendPanelDimensions,
} from "./spectrum-geometry-legend-layout";
import type { DescriptorTraceLegendColumn, DescriptorTraceLegendRow } from "../types";

const MEASURE_SUBPIXEL_BUFFER_PX = 2;
const COLUMN_GAP_PX = 8;

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

export function descriptorTraceLegendGridTemplateColumns(
  descriptorColumnCount: number,
): string {
  const descriptorCols = Array.from({ length: descriptorColumnCount }, () => "1fr").join(
    " ",
  );
  return `${LEGEND_SWATCH_WIDTH}px ${descriptorCols}`.trim();
}

export function computeDescriptorTraceLegendWidth(input: {
  plotWidth: number;
  channelColumnTitle: string;
  columns: readonly DescriptorTraceLegendColumn[];
  rows: readonly DescriptorTraceLegendRow[];
}): number {
  const measureHeader = (text: string) =>
    measureTextWidthPx(text, LEGEND_HEADER_FONT_SIZE, 600);
  const measureCell = (text: string) =>
    measureTextWidthPx(text, LEGEND_FONT_SIZE, 500);

  const channelHeaderWidth = measureHeader(input.channelColumnTitle);
  const channelColWidth = Math.max(channelHeaderWidth, LEGEND_SWATCH_WIDTH);

  let descriptorWidth = 0;
  for (const column of input.columns) {
    const header = measureHeader(column.title);
    const cells = input.rows.map(
      (row) => measureCell(row.cells[column.id] ?? "—"),
    );
    descriptorWidth += Math.max(header, ...cells, 32);
  }

  const columnGaps = input.columns.length * COLUMN_GAP_PX + LEGEND_GAP * 2;
  const gridContentWidth = channelColWidth + descriptorWidth + columnGaps;
  const panelWidth = LEGEND_PADDING * 2 + gridContentWidth;
  const boxWidth =
    panelWidth + LEGEND_BORDER_PX * 2 + MEASURE_SUBPIXEL_BUFFER_PX;

  return Math.min(
    Math.max(0, input.plotWidth - LEGEND_INSET * 2),
    Math.ceil(boxWidth),
  );
}

export function computeDescriptorTraceLegendBoxHeight(rowCount: number): number {
  const rowGaps = rowCount > 0 ? (rowCount - 1) * LEGEND_GAP : 0;
  const panelHeight =
    LEGEND_PADDING * 2 +
    LEGEND_HEADER_BLOCK_HEIGHT +
    rowCount * LEGEND_ROW_HEIGHT +
    rowGaps;
  return panelHeight + LEGEND_BORDER_PX * 2;
}

export { geometryLegendPanelDimensions, LEGEND_INSET };
