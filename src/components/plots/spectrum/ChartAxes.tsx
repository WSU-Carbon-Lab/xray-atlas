"use client";

import { memo } from "react";
import { AxisBottom, AxisLeft, AxisTop, AxisRight } from "@visx/axis";
import type { PlotDimensions } from "../types";
import type { ChartThemeColors } from "../config";
import { PLOT_CONFIG } from "../config";
import type { ChartScales } from "./types";

export const ChartAxes = memo(function ChartAxes({
  scales,
  dimensions,
  themeColors,
  showXAxisLabel = true,
  yAxisLabel = "Intensity (a.u.)",
  yTickFormat,
}: {
  scales: ChartScales;
  dimensions: PlotDimensions;
  themeColors: ChartThemeColors;
  showXAxisLabel?: boolean;
  yAxisLabel?: string;
  yTickFormat?: (value: number | { valueOf(): number }, index: number) => string;
}) {
  if (!scales || !dimensions) return null;

  const axisColor = themeColors.axis;
  const tickLabelColor = themeColors.text;
  const tickFontSize = PLOT_CONFIG.axis.fontSize;
  const tickPadding = PLOT_CONFIG.axis.tickPadding;

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
          stroke="transparent"
          fillOpacity={0.12}
        />
      )}
      <line
        data-export-axis-spine
        x1={left}
        y1={axisBandTop}
        x2={left + plotWidth}
        y2={axisBandTop}
        stroke={axisColor}
        strokeWidth={1}
      />
      <g data-export-axis-group="bottom">
      <AxisBottom
        top={axisBandTop}
        left={left}
        scale={scales.xScale}
        stroke="transparent"
        tickStroke={axisColor}
        tickLength={-PLOT_CONFIG.axis.tickSize}
        numTicks={8}
        tickLabelProps={() => ({
          fill: tickLabelColor,
          fontSize: tickFontSize,
          textAnchor: "middle",
          fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
          dy: tickPadding,
        })}
      />
      </g>
      {showXAxisLabel && axisBandHeight > 0 && (
        <text
          x={left + plotWidth / 2}
          y={axisBandTop + axisBandHeight - 10}
          fill={tickLabelColor}
          fontSize={14}
          fontWeight={PLOT_CONFIG.axis.fontWeight}
          textAnchor="middle"
          fontFamily="var(--font-sans), Inter, system-ui, sans-serif"
        >
          Energy (eV)
        </text>
      )}
      <g data-export-axis-group="left">
      <AxisLeft
        left={left}
        top={top}
        scale={scales.yScale}
        stroke={axisColor}
        tickStroke={axisColor}
        tickLength={-PLOT_CONFIG.axis.tickSize}
        tickFormat={yTickFormat}
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
        label={yAxisLabel}
        labelOffset={PLOT_CONFIG.axis.labelPadding}
      />
      </g>
      <g data-export-axis-group="top">
      <AxisTop
        top={top}
        left={left}
        scale={scales.xScale}
        stroke={axisColor}
        tickStroke={axisColor}
        tickLength={-PLOT_CONFIG.axis.tickSize}
        numTicks={8}
        tickFormat={() => ""}
      />
      </g>
      <g data-export-axis-group="right">
      <AxisRight
        left={left + plotWidth}
        top={top}
        scale={scales.yScale}
        stroke={axisColor}
        tickStroke={axisColor}
        tickLength={-PLOT_CONFIG.axis.tickSize}
        tickFormat={() => ""}
      />
      </g>
    </g>
  );
});
