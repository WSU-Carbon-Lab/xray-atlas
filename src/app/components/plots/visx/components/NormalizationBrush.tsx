/**
 * Brush component for normalization region selection
 */

import { Brush } from "@visx/brush";
import type { Bounds } from "@visx/brush/lib/types";
import { useCallback } from "react";
import type { VisxScales } from "../../hooks/useVisxScales";
import type { PlotDimensions } from "../../core/types";
import type { SpectrumSelection } from "../../core/types";

export function NormalizationBrush({
  scales,
  dimensions,
  selectionTarget,
  onSelectionChange,
}: {
  scales: VisxScales;
  dimensions: PlotDimensions;
  selectionTarget?: "pre" | "post" | null;
  onSelectionChange?: (selection: SpectrumSelection | null) => void;
}) {
  if (!selectionTarget || !onSelectionChange) return null;

  const plotWidth =
    dimensions.width - dimensions.margins.left - dimensions.margins.right;
  const plotHeight =
    dimensions.height - dimensions.margins.top - dimensions.margins.bottom;
  const left = dimensions.margins.left;
  const top = dimensions.margins.top;

  const handleBrushChange = useCallback(
    (bounds: Bounds | null) => {
      if (!bounds) {
        onSelectionChange(null);
        return;
      }

      // Brush Bounds has x0, x1, y0, y1 in pixel coordinates relative to the plot area
      // (already accounting for left/top margins)
      // We need to convert to data coordinates
      const x0 = bounds.x0;
      const x1 = bounds.x1;

      if (typeof x0 !== "number" || typeof x1 !== "number") {
        onSelectionChange(null);
        return;
      }

      // Convert pixel coordinates (relative to plot area) to data coordinates
      const energyMin = Math.min(
        scales.xScale.invert(x0),
        scales.xScale.invert(x1),
      );
      const energyMax = Math.max(
        scales.xScale.invert(x0),
        scales.xScale.invert(x1),
      );

      // Convert y range if provided
      let absorptionMin = 0;
      let absorptionMax = 1;

      if (typeof bounds.y0 === "number" && typeof bounds.y1 === "number") {
        const y0Data = scales.yScale.invert(bounds.y0);
        const y1Data = scales.yScale.invert(bounds.y1);
        absorptionMin = Math.min(y0Data, y1Data);
        absorptionMax = Math.max(y0Data, y1Data);
      }

      // Estimate point count (rough approximation)
      const domain = scales.xScale.domain();
      if (
        !domain ||
        domain.length < 2 ||
        typeof domain[0] !== "number" ||
        typeof domain[1] !== "number"
      ) {
        onSelectionChange(null);
        return;
      }
      const energyRange = domain[1] - domain[0];
      const selectionWidth = energyMax - energyMin;
      const estimatedPoints = Math.ceil((selectionWidth / energyRange) * 100);

      const selection: SpectrumSelection = {
        energyMin,
        energyMax,
        absorptionMin,
        absorptionMax,
        pointCount: estimatedPoints,
        geometryKeys: [],
      };

      onSelectionChange(selection);
    },
    [onSelectionChange, scales.xScale, scales.yScale],
  );

  return (
    <g transform={`translate(${left}, ${top})`} style={{ cursor: "crosshair" }}>
      <Brush
        xScale={scales.xScale}
        yScale={scales.yScale}
        width={plotWidth}
        height={plotHeight}
        onChange={handleBrushChange}
        brushDirection="horizontal"
        selectedBoxStyle={{
          fill:
            selectionTarget === "pre"
              ? "rgba(59, 130, 246, 0.2)"
              : "rgba(16, 185, 129, 0.2)",
          fillOpacity: 0.3,
          stroke:
            selectionTarget === "pre"
              ? "rgba(59, 130, 246, 0.8)"
              : "rgba(16, 185, 129, 0.8)",
          strokeWidth: 2,
        }}
      />
    </g>
  );
}
