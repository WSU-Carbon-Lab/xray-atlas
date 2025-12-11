/**
 * Grid components for visx visualization
 */

import { memo } from "react";
import { GridRows, GridColumns } from "@visx/grid";
import type { VisxScales } from "../../hooks/useVisxScales";
import type { PlotDimensions } from "../../core/types";
import { THEME_COLORS } from "../../core/constants";

export const VisxGrid = memo(function VisxGrid({
  scales,
  dimensions,
  isDark,
}: {
  scales: VisxScales;
  dimensions: PlotDimensions;
  isDark: boolean;
}) {
  if (!scales || !dimensions) return null;

  const themeColors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;
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
        strokeWidth={1}
        strokeDasharray="none"
        numTicks={8}
      />
      {/* Vertical grid lines */}
      <GridColumns
        scale={scales.xScale}
        height={plotHeight}
        left={left}
        top={top}
        stroke={gridColor}
        strokeWidth={1}
        strokeDasharray="none"
        numTicks={10}
      />
    </g>
  );
});
