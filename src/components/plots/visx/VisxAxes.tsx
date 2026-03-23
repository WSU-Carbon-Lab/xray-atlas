/**
 * Axis components for visx visualization
 */

import { memo } from "react";
import { AxisBottom, AxisLeft, AxisTop, AxisRight } from "@visx/axis";
import type { VisxScales } from "../hooks/useVisxScales";
import type { PlotDimensions } from "../types";
import { THEME_COLORS, AXIS_CONFIG } from "../constants";
import type { ChartThemeColors } from "../hooks/useChartTheme";

export const VisxAxes = memo(function VisxAxes({
  scales,
  dimensions,
  isDark,
  themeColors: themeColorsProp,
  showXAxisLabel = true,
}: {
  scales: VisxScales;
  dimensions: PlotDimensions;
  isDark: boolean;
  themeColors?: ChartThemeColors;
  showXAxisLabel?: boolean;
}) {
  if (!scales || !dimensions) return null;

  const themeColors: ChartThemeColors =
    themeColorsProp ?? (isDark ? THEME_COLORS.dark : THEME_COLORS.light);
  const axisColor = themeColors.axis;
  const tickLabelColor = themeColors.text;
  const tickFontSize = AXIS_CONFIG.fontSize;
  const tickPadding = AXIS_CONFIG.tickPadding;

  const plotWidth =
    dimensions.width - dimensions.margins.left - dimensions.margins.right;
  const plotHeight =
    dimensions.height - dimensions.margins.top - dimensions.margins.bottom;
  const top = dimensions.margins.top;
  const left = dimensions.margins.left;

  const axisBandTop = top + plotHeight;
  const axisBandHeight = dimensions.height - axisBandTop;

  return (
    <g>
      {showXAxisLabel && axisBandHeight > 0 && (
        <rect
          x={left}
          y={axisBandTop}
          width={plotWidth}
          height={axisBandHeight}
          fill={themeColors.paper}
          stroke={axisColor}
          strokeWidth={0}
          fillOpacity={0.12}
        />
      )}
      <line
        x1={left}
        y1={axisBandTop}
        x2={left + plotWidth}
        y2={axisBandTop}
        stroke={axisColor}
        strokeWidth={1}
      />
      <AxisBottom
        top={axisBandTop}
        left={left}
        scale={scales.xScale}
        stroke="transparent"
        tickStroke={axisColor}
        tickLength={6}
        numTicks={8}
        tickLabelProps={() => ({
          fill: tickLabelColor,
          fontSize: tickFontSize,
          textAnchor: "middle",
          fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
          dy: tickPadding,
        })}
        labelProps={{
          fill: tickLabelColor,
          fontSize: 14,
          fontWeight: 500,
          textAnchor: "middle",
          fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
        }}
        label={showXAxisLabel ? "Energy (eV)" : undefined}
        labelOffset={showXAxisLabel ? 24 : 0}
      />
      <AxisLeft
        left={left}
        top={top}
        scale={scales.yScale}
        stroke={axisColor}
        tickStroke={axisColor}
        tickLength={-6}
        tickLabelProps={() => ({
          fill: tickLabelColor,
          fontSize: tickFontSize,
          textAnchor: "end",
          fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
          dx: -(tickPadding + 2),
          dy: 0,
        })}
        labelProps={{
          fill: tickLabelColor,
          fontSize: 14,
          textAnchor: "middle",
          fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
        }}
        label="Intensity (a.u.)"
        labelOffset={38}
      />
      <AxisTop
        top={top}
        left={left}
        scale={scales.xScale}
        stroke={axisColor}
        tickStroke={axisColor}
        tickLength={-6}
        tickLabelProps={() => ({
          fill: tickLabelColor,
          fontSize: tickFontSize,
          textAnchor: "middle",
          fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
          dy: -(tickPadding + 2),
        })}
      />
      <AxisRight
        left={left + plotWidth}
        top={top}
        scale={scales.yScale}
        stroke={axisColor}
        tickStroke={axisColor}
        tickLength={-6}
        tickLabelProps={() => ({
          fill: tickLabelColor,
          fontSize: tickFontSize,
          textAnchor: "start",
          fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
          dx: tickPadding + 2,
        })}
      />
    </g>
  );
});
