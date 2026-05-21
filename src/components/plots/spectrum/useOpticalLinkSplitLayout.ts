"use client";

import { useMemo } from "react";
import { scaleLinear } from "@visx/scale";
import type { ScaleLinear } from "d3-scale";
import type {
  DataExtents,
  PlotDimensions,
  AxisStats,
  SpectrumYAxisQuantity,
} from "../types";
import { spectrumYAxisAnchorsAtZero } from "../types";
import { PLOT_CONFIG } from "../config";
import { linearYDomainWithPadding } from "../utils/linearYDomain";

function yDomainWithMandatoryZeroForDelta(
  paddedDomain: [number, number],
  yAxisQuantity: SpectrumYAxisQuantity | undefined,
): [number, number] {
  if (!spectrumYAxisAnchorsAtZero(yAxisQuantity)) {
    return paddedDomain;
  }
  const lo = paddedDomain[0] ?? 0;
  const hi = paddedDomain[1] ?? 0;
  return linearYDomainWithPadding(
    Math.min(lo, hi, 0),
    Math.max(lo, hi, 0),
    0.1,
  );
}

export type OpticalLinkSplitLayoutResult = {
  readonly imaginaryPlot: {
    readonly dimensions: PlotDimensions;
    readonly xScale: ScaleLinear<number, number>;
    readonly yScale: ScaleLinear<number, number>;
  };
  readonly realPlot: {
    readonly dimensions: PlotDimensions;
    readonly xScale: ScaleLinear<number, number>;
    readonly yScale: ScaleLinear<number, number>;
  };
  readonly hasOpticalSplit: true;
  readonly sharedEnergyDomain: [number, number];
};

/**
 * Builds stacked imaginary (top) and real (bottom) subplot scales sharing one energy domain
 * and independent absorption domains.
 *
 * Each panel's `dimensions.height` is its slice of the total canvas; cumulative Y for the real
 * panel is `imaginaryPlot.dimensions.height` plus that panel's `margins.top`. Background fills
 * and `translate` must use that cumulative offset, not `realPlot.dimensions.height` alone.
 */
export function useOpticalLinkSplitLayout(
  totalWidth: number,
  totalHeight: number,
  extents: DataExtents,
  imaginaryAbsorptionExtent: { min: number; max: number } | null,
  realAbsorptionExtent: { min: number; max: number } | null,
  energyStats?: AxisStats,
  imaginaryYAxisQuantity?: SpectrumYAxisQuantity,
  realYAxisQuantity?: SpectrumYAxisQuantity,
): OpticalLinkSplitLayoutResult {
  return useMemo(() => {
    const ratio = PLOT_CONFIG.opticalLinkSplitHeightRatio;
    const imaginaryHeight = totalHeight * ratio;
    const realHeight = totalHeight * (1 - ratio);

    const subplotMargins = { ...PLOT_CONFIG.subplotMargins };
    const bottomMargins = { ...PLOT_CONFIG.margins };

    const imaginaryDimensions: PlotDimensions = {
      width: totalWidth,
      height: imaginaryHeight,
      margins: {
        ...subplotMargins,
        bottom: subplotMargins.bottom,
      },
    };

    const realDimensions: PlotDimensions = {
      width: totalWidth,
      height: realHeight,
      margins: {
        ...bottomMargins,
        top: subplotMargins.top,
      },
    };

    let energyDomain: [number, number];
    if (extents.energyExtent) {
      energyDomain = [
        extents.energyExtent.min,
        extents.energyExtent.max,
      ];
    } else if (energyStats?.min != null && energyStats?.max != null) {
      energyDomain = [energyStats.min, energyStats.max];
    } else {
      energyDomain = [0, 1000];
    }

    const buildYDomain = (
      roleExtent: { min: number; max: number } | null,
      fallbackExtent: { min: number; max: number } | null | undefined,
      yAxisQuantity: SpectrumYAxisQuantity | undefined,
    ): [number, number] => {
      const extent = roleExtent ?? fallbackExtent;
      if (extent) {
        return yDomainWithMandatoryZeroForDelta(
          linearYDomainWithPadding(extent.min, extent.max, 0.1),
          yAxisQuantity,
        );
      }
      return [0, 1];
    };

    const imaginaryAbsorptionDomain = buildYDomain(
      imaginaryAbsorptionExtent,
      extents.absorptionExtent ?? undefined,
      imaginaryYAxisQuantity,
    );
    const realAbsorptionDomain = buildYDomain(
      realAbsorptionExtent,
      extents.absorptionExtent ?? undefined,
      realYAxisQuantity,
    );

    const buildScales = (
      dimensions: PlotDimensions,
      yDomain: [number, number],
    ) => {
      const plotWidth =
        dimensions.width -
        dimensions.margins.left -
        dimensions.margins.right;
      const plotHeight =
        dimensions.height -
        dimensions.margins.top -
        dimensions.margins.bottom;
      const xScale = scaleLinear<number>({
        domain: energyDomain,
        range: [0, plotWidth],
      });
      const yScale = scaleLinear<number>({
        domain: yDomain,
        range: [plotHeight, 0],
      });
      return { xScale, yScale };
    };

    const imaginaryScales = buildScales(
      imaginaryDimensions,
      imaginaryAbsorptionDomain,
    );
    const realScales = buildScales(realDimensions, realAbsorptionDomain);

    return {
      imaginaryPlot: {
        dimensions: imaginaryDimensions,
        xScale: imaginaryScales.xScale,
        yScale: imaginaryScales.yScale,
      },
      realPlot: {
        dimensions: realDimensions,
        xScale: realScales.xScale,
        yScale: realScales.yScale,
      },
      hasOpticalSplit: true as const,
      sharedEnergyDomain: energyDomain,
    };
  }, [
    totalWidth,
    totalHeight,
    extents,
    imaginaryAbsorptionExtent,
    realAbsorptionExtent,
    energyStats,
    imaginaryYAxisQuantity,
    realYAxisQuantity,
  ]);
}
