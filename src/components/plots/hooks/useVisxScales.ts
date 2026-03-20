/**
 * Hook for calculating D3 scales for visx visualization
 */

import { useMemo } from "react";
import { scaleLinear } from "@visx/scale";
import type { DataExtents, PlotDimensions } from "../types";
import { linearYDomainWithPadding } from "../utils/linearYDomain";

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

    const PAD_X_FRACTION = 0.032;
    const PAD_Y_FRACTION = 0.08;

    let energyDomain: [number, number];
    if (extents.energyExtent) {
      const minE = extents.energyExtent.min;
      const maxE = extents.energyExtent.max;
      const spanE = Math.max(maxE - minE, 1);
      const padE = Math.max(spanE * PAD_X_FRACTION, 1);
      energyDomain = [minE - padE, maxE + padE];
    } else if (energyStats) {
      const min = energyStats.min;
      const max = energyStats.max;
      if (
        min !== null &&
        max !== null &&
        typeof min === "number" &&
        typeof max === "number"
      ) {
        const spanE = Math.max(max - min, 1);
        const padE = Math.max(spanE * PAD_X_FRACTION, 1);
        energyDomain = [min - padE, max + padE];
      } else {
        energyDomain = [0, 1000];
      }
    } else {
      energyDomain = [0, 1000];
    }

    let absorptionDomain: [number, number];
    if (extents.absorptionExtent) {
      const minAbs = extents.absorptionExtent.min;
      const maxAbs = extents.absorptionExtent.max;
      absorptionDomain = linearYDomainWithPadding(
        minAbs,
        maxAbs,
        PAD_Y_FRACTION,
      );
    } else if (absorptionStats) {
      const min = absorptionStats.min;
      const max = absorptionStats.max;
      if (
        min !== null &&
        max !== null &&
        typeof min === "number" &&
        typeof max === "number"
      ) {
        absorptionDomain = linearYDomainWithPadding(min, max, PAD_Y_FRACTION);
      } else {
        absorptionDomain = [0, 1];
      }
    } else {
      absorptionDomain = [0, 1];
    }

    const xScale = scaleLinear<number>({
      domain: energyDomain,
      range: [0, plotWidth],
    });

    const yScale = scaleLinear<number>({
      domain: absorptionDomain,
      range: [plotHeight, 0],
    });

    return {
      xScale,
      yScale,
      xInvert: (pixel: number) => xScale.invert(pixel),
      yInvert: (pixel: number) => yScale.invert(pixel),
    };
  }, [extents, dimensions, energyStats, absorptionStats]);
}
