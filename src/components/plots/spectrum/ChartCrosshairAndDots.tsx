"use client";

import { memo } from "react";
import type { ScaleLinear } from "d3-scale";
import type { PlotDimensions } from "../types";
import type { ChartThemeColors } from "../config";

export type CrosshairDot = {
  value: number;
  color: string;
};

type ChartCrosshairAndDotsProps = {
  energy: number;
  dots: CrosshairDot[];
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
  dimensions: PlotDimensions;
  themeColors: ChartThemeColors;
};

export const ChartCrosshairAndDots = memo(function ChartCrosshairAndDots({
  energy,
  dots,
  xScale,
  yScale,
  dimensions,
  themeColors,
}: ChartCrosshairAndDotsProps) {
  const left = dimensions.margins.left;
  const top = dimensions.margins.top;
  const plotHeight =
    dimensions.height - dimensions.margins.top - dimensions.margins.bottom;

  const x = xScale(energy) + left;
  const crosshairColor = themeColors.crosshair ?? themeColors.text;

  return (
    <g style={{ pointerEvents: "none" }}>
      <line
        x1={x}
        y1={top}
        x2={x}
        y2={top + plotHeight}
        stroke={crosshairColor}
        strokeWidth={1.5}
        strokeDasharray="4,3"
        opacity={0.55}
      />
      {dots.map((dot, i) => {
        if (!Number.isFinite(dot.value)) {
          return null;
        }
        const cy = yScale(dot.value) + top;
        if (!Number.isFinite(cy)) {
          return null;
        }
        return (
          <circle
            key={i}
            cx={x}
            cy={cy}
            r={5}
            fill={dot.color}
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={1.5}
            opacity={0.95}
          />
        );
      })}
    </g>
  );
});
