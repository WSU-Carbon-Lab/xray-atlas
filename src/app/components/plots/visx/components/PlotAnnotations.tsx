/**
 * Plot annotations component for peak and reference annotations
 * Inspired by visx/annotation examples
 */

import { useMemo } from "react";
import type { ScaleLinear } from "d3-scale";
import type { PlotDimensions } from "../../core/types";
import { THEME_COLORS } from "../../core/constants";

export type Annotation = {
  type: "peak" | "reference" | "marker";
  energy: number;
  intensity?: number;
  label?: string;
  color?: string;
  orientation?: "horizontal" | "vertical";
};

type PlotAnnotationsProps = {
  annotations: Annotation[];
  scales: {
    xScale: ScaleLinear<number, number>;
    yScale: ScaleLinear<number, number>;
  };
  dimensions: PlotDimensions;
  isDark: boolean;
};

export function PlotAnnotations({
  annotations,
  scales,
  dimensions,
  isDark,
}: PlotAnnotationsProps) {
  const themeColors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;

  const plotWidth =
    dimensions.width - dimensions.margins.left - dimensions.margins.right;
  const plotHeight =
    dimensions.height - dimensions.margins.top - dimensions.margins.bottom;

  const renderedAnnotations = useMemo(() => {
    return annotations.map((annotation, index) => {
      const x = scales.xScale(annotation.energy) + dimensions.margins.left;
      const y =
        annotation.intensity !== undefined
          ? scales.yScale(annotation.intensity) + dimensions.margins.top
          : dimensions.margins.top + plotHeight / 2;

      const color = annotation.color ?? themeColors.text;

      if (annotation.type === "peak") {
        // Vertical line for peak annotation
        return (
          <g key={`annotation-${index}`}>
            <line
              x1={x}
              y1={dimensions.margins.top}
              x2={x}
              y2={dimensions.margins.top + plotHeight}
              stroke={color}
              strokeWidth={1.5}
              strokeDasharray="3 3"
              opacity={0.5}
            />
            {annotation.label && (
              <text
                x={x}
                y={dimensions.margins.top - 5}
                fill={color}
                fontSize="11px"
                fontFamily="Inter, system-ui, sans-serif"
                textAnchor="middle"
                fontWeight={500}
              >
                {annotation.label}
              </text>
            )}
          </g>
        );
      } else if (annotation.type === "reference") {
        // Horizontal line for reference
        return (
          <g key={`annotation-${index}`}>
            <line
              x1={dimensions.margins.left}
              y1={y}
              x2={dimensions.margins.left + plotWidth}
              y2={y}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="2 2"
              opacity={0.4}
            />
            {annotation.label && (
              <text
                x={dimensions.margins.left + 5}
                y={y - 5}
                fill={color}
                fontSize="10px"
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight={400}
              >
                {annotation.label}
              </text>
            )}
          </g>
        );
      } else {
        // Marker annotation
        return (
          <g key={`annotation-${index}`}>
            <circle cx={x} cy={y} r={4} fill={color} opacity={0.7} />
            {annotation.label && (
              <text
                x={x + 8}
                y={y + 4}
                fill={color}
                fontSize="10px"
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight={400}
              >
                {annotation.label}
              </text>
            )}
          </g>
        );
      }
    });
  }, [
    annotations,
    scales,
    dimensions,
    plotWidth,
    plotHeight,
    themeColors.text,
  ]);

  if (annotations.length === 0) return null;

  return <g>{renderedAnnotations}</g>;
}
