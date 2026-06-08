"use client";

import { LegendSwatch } from "~/components/plots/spectrum/LegendSwatch";
import type { PlotViewerLegendSwatch } from "./plot-viewer-legend";
import { resolveTraceLegendSwatchPresentation } from "./trace-legend-swatch-props";

export type PlotViewerLegendSwatchProps = {
  swatch: PlotViewerLegendSwatch;
};

/**
 * Renders a plot-viewer legend swatch with line dash and optional decimated marker glyph.
 */
export function PlotViewerLegendSwatch({ swatch }: PlotViewerLegendSwatchProps) {
  const presentation = resolveTraceLegendSwatchPresentation(swatch);
  return (
    <LegendSwatch
      color={presentation.color}
      variant={presentation.variant}
      graphStyle={presentation.graphStyle}
      markerShape={presentation.markerShape}
      markerOnLine={presentation.markerOnLine}
    />
  );
}
