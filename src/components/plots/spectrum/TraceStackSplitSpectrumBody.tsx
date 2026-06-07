"use client";

import { useMemo } from "react";
import type { ScaleLinear } from "d3-scale";
import type { GraphStyle, SpectrumPoint, TraceData } from "../types";
import type { ChartThemeColors } from "../config";
import {
  SPECTRUM_TRACE_GRADIENT_DARK,
  SPECTRUM_TRACE_GRADIENT_LIGHT,
  spectrumTraceColorAlongGradient,
} from "../constants";
import type { TraceStackSplitLayoutResult } from "./useTraceStackSplitLayout";
import { ChartAxes } from "./ChartAxes";
import { ChartGrid } from "./ChartGrid";
import { ChartSpectrumLines } from "./ChartSpectrumLines";
import { spectrumYAxisPresentation } from "../utils/yAxisScientific";

export type TraceStackSplitPanel = {
  readonly label: string;
  readonly points: readonly SpectrumPoint[];
  readonly yAxisQuantity: import("../types").SpectrumYAxisQuantity;
};

export type TraceStackSplitSpectrumBodyProps = {
  readonly layout: TraceStackSplitLayoutResult;
  readonly panels: readonly TraceStackSplitPanel[];
  readonly zoomedXScale: ScaleLinear<number, number>;
  readonly themeColors: ChartThemeColors;
  readonly graphStyle: GraphStyle;
  readonly isDark: boolean;
  readonly width: number;
  readonly contentHeight: number;
};

function panelTrace(
  panel: TraceStackSplitPanel,
  color: string,
): TraceData {
  return {
    type: "scattergl",
    mode: "lines",
    name: panel.label,
    x: panel.points.map((point) => point.energy),
    y: panel.points.map((point) => point.absorption),
    line: { color, width: 2 },
    hovertemplate:
      `<b>${panel.label}</b><br>` +
      "Energy: %{x:.3f} eV<br>Value: %{y:.4f}" +
      "<extra></extra>",
    showlegend: false,
  };
}

/**
 * Renders N equal-height stacked spectrum panels sharing one zoomed energy axis.
 */
export function TraceStackSplitSpectrumBody({
  layout,
  panels,
  zoomedXScale,
  themeColors,
  graphStyle,
  isDark,
  width,
  contentHeight,
}: TraceStackSplitSpectrumBodyProps) {
  const palette = isDark
    ? SPECTRUM_TRACE_GRADIENT_DARK
    : SPECTRUM_TRACE_GRADIENT_LIGHT;

  const panelTraces = useMemo(
    () =>
      panels.map((panel, index) =>
        panelTrace(
          panel,
          spectrumTraceColorAlongGradient(
            palette,
            index,
            Math.max(1, panels.length),
          ),
        ),
      ),
    [isDark, panels, palette],
  );

  return (
    <>
      {layout.panels.map((panelLayout, index) => {
        const trace = panelTraces[index];
        const panelPoints = panels[index]?.points ?? [];
        if (trace == null || panelPoints.length === 0) {
          return null;
        }

        const { dimensions, yScale, yOffset, yAxisQuantity } = panelLayout;
        const plotWidth =
          dimensions.width - dimensions.margins.left - dimensions.margins.right;
        const plotHeight =
          dimensions.height - dimensions.margins.top - dimensions.margins.bottom;

        const xScale = zoomedXScale.copy().range([0, plotWidth]);
        const scales = { xScale, yScale, plotWidth, plotHeight };
        const yDomain = yScale.domain() as [number, number];
        const yPresentation = spectrumYAxisPresentation(
          yAxisQuantity,
          yDomain[0] ?? 0,
          yDomain[1] ?? 1,
        );

        return (
          <g
            key={`trace-stack-panel-${panelLayout.label}`}
            transform={`translate(0, ${yOffset})`}
          >
            <rect
              x={0}
              y={0}
              width={width}
              height={dimensions.height}
              fill={themeColors.background}
            />
            <g
              transform={`translate(${dimensions.margins.left}, ${dimensions.margins.top})`}
            >
              <ChartGrid
                scales={scales}
                dimensions={dimensions}
                themeColors={themeColors}
              />
              <ChartSpectrumLines
                traces={[trace]}
                scales={scales}
                graphStyle={graphStyle}
                idPrefix={`trace-stack-${index}`}
              />
              <ChartAxes
                scales={scales}
                dimensions={dimensions}
                themeColors={themeColors}
                showXAxisLabel={index === layout.panels.length - 1}
                yAxisLabel={yPresentation.label}
                yTickFormat={(value) =>
                  yPresentation.tickFormat(
                    typeof value === "number" ? value : value.valueOf(),
                  )
                }
              />
              <text
                x={4}
                y={12}
                className="fill-[var(--text-secondary)] text-[10px] font-medium"
              >
                {panelLayout.label}
              </text>
            </g>
          </g>
        );
      })}
      <rect
        x={0}
        y={0}
        width={width}
        height={contentHeight}
        fill="transparent"
        pointerEvents="none"
      />
    </>
  );
}
