/**
 * Brush-based zoom component using @visx/brush
 * Similar to visx.airbnb.tech/brush examples
 */

import { Brush } from "@visx/brush";
import type { Bounds } from "@visx/brush/lib/types";
import { useCallback, useState } from "react";
import type { ScaleLinear } from "d3-scale";
import type { PlotDimensions } from "../types";
import { THEME_COLORS } from "../constants";

export type ZoomMode = "horizontal" | "vertical" | "default";

type BrushZoomProps = {
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
  dimensions: PlotDimensions;
  isDark: boolean;
  zoomMode: ZoomMode;
  onZoom: (xDomain: [number, number], yDomain: [number, number]) => void;
  onReset?: () => void;
};

export function BrushZoom({
  xScale,
  yScale,
  dimensions,
  isDark,
  zoomMode,
  onZoom,
  onReset,
}: BrushZoomProps) {
  const [brushBounds, setBrushBounds] = useState<Bounds | null>(null);
  const themeColors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;

  const plotWidth =
    dimensions.width - dimensions.margins.left - dimensions.margins.right;
  const plotHeight =
    dimensions.height - dimensions.margins.top - dimensions.margins.bottom;
  const left = dimensions.margins.left;
  const top = dimensions.margins.top;

  const handleBrushChange = useCallback(
    (bounds: Bounds | null) => {
      if (!bounds) {
        // Reset zoom when brush is cleared
        setBrushBounds(null);
        onReset?.();
        return;
      }

      setBrushBounds(bounds);

      const x0 = bounds.x0;
      const x1 = bounds.x1;

      if (typeof x0 !== "number" || typeof x1 !== "number") {
        return;
      }

      // Convert pixel coordinates to data coordinates
      let xDomain: [number, number];
      let yDomain: [number, number];

      if (zoomMode === "horizontal" || zoomMode === "default") {
        const x0Data = xScale.invert(x0);
        const x1Data = xScale.invert(x1);
        xDomain = [Math.min(x0Data, x1Data), Math.max(x0Data, x1Data)];
      } else {
        // Vertical only - keep full x domain
        const currentDomain = xScale.domain();
        xDomain = [currentDomain[0] ?? 0, currentDomain[1] ?? 1000];
      }

      if (zoomMode === "vertical" || zoomMode === "default") {
        const y0 = bounds.y0;
        const y1 = bounds.y1;
        if (typeof y0 === "number" && typeof y1 === "number") {
          const y0Data = yScale.invert(y0);
          const y1Data = yScale.invert(y1);
          yDomain = [Math.min(y0Data, y1Data), Math.max(y0Data, y1Data)];
        } else {
          const currentDomain = yScale.domain();
          yDomain = [currentDomain[0] ?? 0, currentDomain[1] ?? 1];
        }
      } else {
        // Horizontal only - keep full y domain
        const currentDomain = yScale.domain();
        yDomain = [currentDomain[0] ?? 0, currentDomain[1] ?? 1];
      }

      onZoom(xDomain, yDomain);
    },
    [zoomMode, xScale, yScale, onZoom, onReset],
  );

  return (
    <g transform={`translate(${left}, ${top})`}>
      <Brush
        xScale={xScale}
        yScale={yScale}
        width={plotWidth}
        height={plotHeight}
        onChange={handleBrushChange}
        brushDirection={
          zoomMode === "horizontal"
            ? "horizontal"
            : zoomMode === "vertical"
              ? "vertical"
              : "both"
        }
        selectedBoxStyle={{
          fill: themeColors.hoverBg,
          fillOpacity: 0.15,
          stroke: themeColors.text,
          strokeWidth: 2,
          strokeDasharray: "4 4",
        }}
        handleSize={8}
      />
    </g>
  );
}
