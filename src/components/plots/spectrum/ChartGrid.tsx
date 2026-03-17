"use client";

import { memo } from "react";
import { GridRows, GridColumns } from "@visx/grid";
import type { PlotDimensions } from "../types";
import type { ChartThemeColors } from "../config";
import { PLOT_CONFIG } from "../config";
import type { ChartScales } from "./types";

export const ChartGrid = memo(function ChartGrid({
  scales,
  dimensions,
  themeColors,
}: {
  scales: ChartScales;
  dimensions: PlotDimensions;
  themeColors: ChartThemeColors;
}) {
  if (!scales || !dimensions) return null;

  const gridColor = themeColors.grid;

  const plotWidth =
    dimensions.width - dimensions.margins.left - dimensions.margins.right;
  const plotHeight =
    dimensions.height - dimensions.margins.top - dimensions.margins.bottom;

  return (
    <g>
      <GridRows
        scale={scales.yScale}
        width={plotWidth}
        left={0}
        top={0}
        stroke={gridColor}
        strokeWidth={PLOT_CONFIG.grid.strokeWidth}
        strokeDasharray={PLOT_CONFIG.grid.strokeDasharray}
        numTicks={8}
      />
      <GridColumns
        scale={scales.xScale}
        height={plotHeight}
        left={0}
        top={0}
        stroke={gridColor}
        strokeWidth={PLOT_CONFIG.grid.strokeWidth}
        strokeDasharray={PLOT_CONFIG.grid.strokeDasharray}
        numTicks={10}
      />
    </g>
  );
});
