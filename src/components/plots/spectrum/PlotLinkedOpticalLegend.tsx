"use client";

import { PlotSpectrumGeometryLegend } from "./PlotSpectrumGeometryLegend";
import type { LinkedSpectrumGeometryLegendRow } from "./spectrum-geometry-legend-types";
import type { ChartThemeColors } from "../config";
import type { GraphStyle } from "../types";

export type { LinkedSpectrumGeometryLegendRow as LinkedOpticalLegendRow } from "./spectrum-geometry-legend-types";

export type PlotLinkedOpticalLegendProps = {
  rows: LinkedSpectrumGeometryLegendRow[];
  visibleTraceIds: Set<string>;
  onToggleGeometry: (geometryKey: string) => void;
  themeColors: ChartThemeColors;
  plotWidth: number;
  plotHeight: number;
  imaginaryColumnGlyph: string;
  realColumnGlyph: string;
  angleColumnTitle: string;
  graphStyle?: GraphStyle;
  legendBorderRadius?: number;
};

/** @deprecated Prefer {@link PlotSpectrumGeometryLegend} with `mode="linked"`. */
export function PlotLinkedOpticalLegend(props: PlotLinkedOpticalLegendProps) {
  return (
    <PlotSpectrumGeometryLegend
      mode="linked"
      rows={props.rows}
      visibleTraceIds={props.visibleTraceIds}
      onToggleGeometry={props.onToggleGeometry}
      themeColors={props.themeColors}
      plotWidth={props.plotWidth}
      plotHeight={props.plotHeight}
      imaginaryColumnGlyph={props.imaginaryColumnGlyph}
      realColumnGlyph={props.realColumnGlyph}
      angleColumnTitle={props.angleColumnTitle}
      graphStyle={props.graphStyle}
      legendBorderRadius={props.legendBorderRadius}
    />
  );
}
