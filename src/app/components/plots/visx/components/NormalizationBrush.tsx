/**
 * Brush component for normalization region selection
 * Enhanced with better visual feedback and selection preview
 */

import { Brush } from "@visx/brush";
import type { Bounds } from "@visx/brush/lib/types";
import { useCallback, useState, useMemo } from "react";
import type { VisxScales } from "../../hooks/useVisxScales";
import type { PlotDimensions } from "../../core/types";
import type { SpectrumSelection } from "../../core/types";
import { THEME_COLORS } from "../../core/constants";

export function NormalizationBrush({
  scales,
  dimensions,
  selectionTarget,
  onSelectionChange,
  isDark = false,
}: {
  scales: VisxScales;
  dimensions: PlotDimensions;
  selectionTarget?: "pre" | "post" | null;
  onSelectionChange?: (selection: SpectrumSelection | null) => void;
  isDark?: boolean;
}) {
  if (!selectionTarget || !onSelectionChange) return null;

  const [currentBounds, setCurrentBounds] = useState<Bounds | null>(null);
  const themeColors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;

  const plotWidth =
    dimensions.width - dimensions.margins.left - dimensions.margins.right;
  const plotHeight =
    dimensions.height - dimensions.margins.top - dimensions.margins.bottom;
  const left = dimensions.margins.left;
  const top = dimensions.margins.top;

  const handleBrushChange = useCallback(
    (bounds: Bounds | null) => {
      setCurrentBounds(bounds);
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

  // Calculate selection preview data
  const selectionPreview = useMemo(() => {
    if (
      !currentBounds ||
      typeof currentBounds.x0 !== "number" ||
      typeof currentBounds.x1 !== "number"
    ) {
      return null;
    }

    const energyMin = Math.min(
      scales.xScale.invert(currentBounds.x0),
      scales.xScale.invert(currentBounds.x1),
    );
    const energyMax = Math.max(
      scales.xScale.invert(currentBounds.x0),
      scales.xScale.invert(currentBounds.x1),
    );

    return {
      energyMin,
      energyMax,
      width: Math.abs(currentBounds.x1 - currentBounds.x0),
    };
  }, [currentBounds, scales.xScale]);

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
              ? "rgba(59, 130, 246, 0.25)"
              : "rgba(16, 185, 129, 0.25)",
          fillOpacity: 0.4,
          stroke:
            selectionTarget === "pre"
              ? "rgba(59, 130, 246, 1)"
              : "rgba(16, 185, 129, 1)",
          strokeWidth: 2.5,
          strokeDasharray: "4 2",
        }}
      />
      {/* Selection preview text */}
      {selectionPreview && selectionPreview.width > 50 && (
        <foreignObject
          x={Math.min(currentBounds?.x0 ?? 0, currentBounds?.x1 ?? 0)}
          y={-25}
          width={selectionPreview.width}
          height={20}
          style={{ overflow: "visible", pointerEvents: "none" }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: "11px",
              fontFamily: "Inter, system-ui, sans-serif",
              color: themeColors.text,
              backgroundColor: themeColors.legendBg,
              border: `1px solid ${themeColors.legendBorder}`,
              borderRadius: "4px",
              padding: "2px 6px",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            }}
          >
            {selectionPreview.energyMin.toFixed(2)} -{" "}
            {selectionPreview.energyMax.toFixed(2)} eV
          </div>
        </foreignObject>
      )}
    </g>
  );
}
