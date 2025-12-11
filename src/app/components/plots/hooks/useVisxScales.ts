/**
 * Hook for calculating D3 scales for visx visualization
 */

import { useMemo } from "react";
import { scaleLinear } from "@visx/scale";
import type { DataExtents, PlotDimensions } from "../core/types";

type ScaleLinear = ReturnType<typeof scaleLinear<number>>;

export type VisxScales = {
  xScale: ScaleLinear;
  yScale: ScaleLinear;
  xInvert: (pixel: number) => number;
  yInvert: (pixel: number) => number;
};

/**
 * Calculate D3 scales for x/y axes with proper margins
 */
export function useVisxScales(
  extents: DataExtents,
  dimensions: PlotDimensions | null,
  energyStats?: { min: number | null; max: number | null },
  absorptionStats?: { min: number | null; max: number | null },
): VisxScales | null {
  return useMemo(() => {
    if (!dimensions) return null;

    const plotWidth = dimensions.width - dimensions.margins.left - dimensions.margins.right;
    const plotHeight = dimensions.height - dimensions.margins.top - dimensions.margins.bottom;

    // Calculate energy (x) range
    let energyDomain: [number, number];
    if (extents.energyExtent) {
      energyDomain = [extents.energyExtent.min, extents.energyExtent.max];
    } else if (
      energyStats &&
      energyStats.min !== null &&
      energyStats.max !== null &&
      typeof energyStats.min === "number" &&
      typeof energyStats.max === "number"
    ) {
      energyDomain = [energyStats.min, energyStats.max];
    } else {
      // Fallback domain if no data
      energyDomain = [0, 1000];
    }

    // Calculate absorption (y) range
    let absorptionDomain: [number, number];
    if (extents.absorptionExtent) {
      const minAbs = extents.absorptionExtent.min;
      const maxAbs = extents.absorptionExtent.max;
      const padding = Math.max(Math.abs(maxAbs - minAbs) * 0.1, 0.1);
      absorptionDomain = [0, maxAbs + padding];
    } else if (
      absorptionStats &&
      absorptionStats.min !== null &&
      absorptionStats.max !== null &&
      typeof absorptionStats.min === "number" &&
      typeof absorptionStats.max === "number"
    ) {
      const padding = Math.max((absorptionStats.max - absorptionStats.min) * 0.1, 0.1);
      absorptionDomain = [0, absorptionStats.max + padding];
    } else {
      // Fallback domain if no data
      absorptionDomain = [0, 1];
    }

    const xScale = scaleLinear<number>({
      domain: energyDomain,
      range: [0, plotWidth],
      nice: true,
    });

    const yScale = scaleLinear<number>({
      domain: absorptionDomain,
      range: [plotHeight, 0],
      nice: true,
    });

    return {
      xScale,
      yScale,
      xInvert: (pixel: number) => xScale.invert(pixel),
      yInvert: (pixel: number) => yScale.invert(pixel),
    };
  }, [extents, dimensions, energyStats, absorptionStats]);
}
