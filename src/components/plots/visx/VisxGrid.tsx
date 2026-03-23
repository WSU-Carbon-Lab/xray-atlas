/**
 * Grid components for visx visualization
 */

import { memo } from "react";
import { GridRows, GridColumns } from "@visx/grid";
import type { VisxScales } from "../hooks/useVisxScales";
import type { PlotDimensions } from "../types";
import { THEME_COLORS, GRID_CONFIG } from "../constants";
import type { ChartThemeColors } from "../hooks/useChartTheme";

export const VisxGrid = memo(function VisxGrid({
  scales,
  dimensions,
  isDark,
  themeColors: themeColorsProp,
}: {
  scales: VisxScales;
  dimensions: PlotDimensions;
  isDark: boolean;
  themeColors?: ChartThemeColors;
}) {
  if (!scales || !dimensions) return null;

  const themeColors = themeColorsProp ?? (isDark ? THEME_COLORS.dark : THEME_COLORS.light);
  const gridColor = themeColors.grid;

  const plotWidth =
    dimensions.width - dimensions.margins.left - dimensions.margins.right;
  const plotHeight =
    dimensions.height - dimensions.margins.top - dimensions.margins.bottom;
  const top = dimensions.margins.top;
  const left = dimensions.margins.left;

  return (
    <g>
      {/* Horizontal grid lines */}
      <GridRows
        scale={scales.yScale}
        width={plotWidth}
        left={left}
        top={top}
        stroke={gridColor}
        strokeWidth={GRID_CONFIG.strokeWidth}
        strokeDasharray={GRID_CONFIG.strokeDasharray}
        numTicks={8}
      />
      <GridColumns
        scale={scales.xScale}
        height={plotHeight}
        left={left}
        top={top}
        stroke={gridColor}
        strokeWidth={GRID_CONFIG.strokeWidth}
        strokeDasharray={GRID_CONFIG.strokeDasharray}
        numTicks={10}
      />
    </g>
  );
});
