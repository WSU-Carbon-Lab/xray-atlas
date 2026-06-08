import type { LegendMarkerShape } from "~/components/plots/spectrum/LegendSwatch";
import type { PlotViewerLegendSwatch } from "./plot-viewer-legend";
import type { PlotViewerLineDash } from "./plot-viewer-trace-styles";

export type TraceLegendSwatchPresentation = {
  color: string;
  variant: "solid" | "dash";
  graphStyle: "line";
  markerOnLine: boolean;
  markerShape: LegendMarkerShape;
};

function swatchVariant(lineDash: PlotViewerLineDash): "solid" | "dash" {
  return lineDash === "solid" ? "solid" : "dash";
}

function markerShapeFromSymbol(
  markerSymbol: PlotViewerLegendSwatch["markerSymbol"],
): LegendMarkerShape {
  return markerSymbol === "square" ? "square" : "circle";
}

/**
 * Resolves {@link LegendSwatch} props for plot-viewer and descriptor trace legend rows.
 */
export function resolveTraceLegendSwatchPresentation(
  swatch: PlotViewerLegendSwatch,
): TraceLegendSwatchPresentation {
  const hasMarker =
    swatch.markerSymbol != null && swatch.markerSymbol !== "none";
  return {
    color: swatch.color,
    variant: swatchVariant(swatch.lineDash),
    graphStyle: "line",
    markerOnLine: hasMarker,
    markerShape: markerShapeFromSymbol(swatch.markerSymbol),
  };
}
