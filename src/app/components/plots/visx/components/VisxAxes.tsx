/**
 * Axis components for visx visualization
 */

import { memo } from "react";
import { AxisBottom, AxisLeft } from "@visx/axis";
import type { VisxScales } from "../../hooks/useVisxScales";
import type { PlotDimensions } from "../../core/types";
import { THEME_COLORS } from "../../core/constants";

export const VisxAxes = memo(function VisxAxes({
  scales,
  dimensions,
  isDark,
  showXAxisLabel = true,
}: {
  scales: VisxScales;
  dimensions: PlotDimensions;
  isDark: boolean;
  showXAxisLabel?: boolean;
}) {
  if (!scales || !dimensions) return null;

  const themeColors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;
  const axisColor = themeColors.text;
  const tickLabelColor = themeColors.text;

  const plotWidth =
    dimensions.width - dimensions.margins.left - dimensions.margins.right;
  const plotHeight =
    dimensions.height - dimensions.margins.top - dimensions.margins.bottom;
  const top = dimensions.margins.top;
  const left = dimensions.margins.left;

  return (
    <g>
      {/* X-axis (bottom) */}
      <AxisBottom
        top={top + plotHeight}
        left={left}
        scale={scales.xScale}
        stroke={axisColor}
        tickStroke={axisColor}
        tickLabelProps={() => ({
          fill: tickLabelColor,
          fontSize: 11,
          textAnchor: "middle",
          fontFamily: "Inter, system-ui, sans-serif",
        })}
        labelProps={{
          fill: tickLabelColor,
          fontSize: 13,
          textAnchor: "middle",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
        label={showXAxisLabel ? "Energy (eV)" : undefined}
        labelOffset={showXAxisLabel ? 18 : 0}
      />
      {/* Y-axis (left) */}
      <AxisLeft
        left={left}
        top={top}
        scale={scales.yScale}
        stroke={axisColor}
        tickStroke={axisColor}
        tickLabelProps={() => ({
          fill: tickLabelColor,
          fontSize: 11,
          textAnchor: "end",
          fontFamily: "Inter, system-ui, sans-serif",
          dx: -8,
        })}
        labelProps={{
          fill: tickLabelColor,
          fontSize: 13,
          textAnchor: "middle",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
        label="Intensity"
        labelOffset={18}
      />
    </g>
  );
});
