"use client";

import { useMemo } from "react";
import { scaleLinear } from "@visx/scale";
import type { ScaleLinear } from "d3-scale";
import type {
  AxisStats,
  DataExtents,
  PlotDimensions,
  SpectrumPoint,
  SpectrumYAxisQuantity,
} from "../types";
import { spectrumYAxisAnchorsAtZero } from "../types";
import { PLOT_CONFIG } from "../config";
import { linearYDomainWithPadding } from "../utils/linearYDomain";

function yDomainWithMandatoryZero(
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

function absorptionExtentFromPoints(
  points: readonly SpectrumPoint[],
): { min: number; max: number } | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    if (!Number.isFinite(point.absorption)) {
      continue;
    }
    min = Math.min(min, point.absorption);
    max = Math.max(max, point.absorption);
  }
  if (min === Number.POSITIVE_INFINITY) {
    return null;
  }
  return { min, max };
}

/**
 * Builds a y-domain for the residual subplot from residual trace points only, always
 * expanding to include zero so difference traces stay centered regardless of the main
 * panel y-axis quantity.
 */
export function buildResidualSubplotYDomain(
  residualPoints: readonly SpectrumPoint[],
): [number, number] {
  const extent = absorptionExtentFromPoints(residualPoints);
  if (!extent) {
    return yDomainWithMandatoryZero(
      linearYDomainWithPadding(-0.01, 0.01, 0.1),
      "intensity",
    );
  }
  return yDomainWithMandatoryZero(
    linearYDomainWithPadding(extent.min, extent.max, 0.1),
    "intensity",
  );
}

export type ResidualSubplotLayoutResult = {
  readonly mainPlot: {
    readonly dimensions: PlotDimensions;
    readonly xScale: ScaleLinear<number, number>;
    readonly yScale: ScaleLinear<number, number>;
  };
  readonly residualPlot: {
    readonly dimensions: PlotDimensions;
    readonly xScale: ScaleLinear<number, number>;
    readonly yScale: ScaleLinear<number, number>;
  };
  readonly hasResidualSubplot: true;
  readonly sharedEnergyDomain: [number, number];
};

/**
 * Builds stacked main (top) and residual (bottom) subplot scales sharing one energy domain.
 */
export function useResidualSubplotLayout(
  totalWidth: number,
  totalHeight: number,
  extents: DataExtents,
  residualPoints: readonly SpectrumPoint[],
  energyStats?: AxisStats,
  mainYAxisQuantity?: SpectrumYAxisQuantity,
): ResidualSubplotLayoutResult {
  return useMemo(() => {
    const ratio = PLOT_CONFIG.residualSubplotHeightRatio;
    const mainHeight = totalHeight * (1 - ratio);
    const residualHeight = totalHeight * ratio;

    const subplotMargins = { ...PLOT_CONFIG.subplotMargins };
    const bottomMargins = { ...PLOT_CONFIG.margins };

    const mainDimensions: PlotDimensions = {
      width: totalWidth,
      height: mainHeight,
      margins: {
        ...subplotMargins,
        bottom: subplotMargins.bottom,
      },
    };

    const residualDimensions: PlotDimensions = {
      width: totalWidth,
      height: residualHeight,
      margins: {
        ...bottomMargins,
        top: subplotMargins.top,
      },
    };

    let energyDomain: [number, number];
    if (extents.energyExtent) {
      energyDomain = [extents.energyExtent.min, extents.energyExtent.max];
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
        return yDomainWithMandatoryZero(
          linearYDomainWithPadding(extent.min, extent.max, 0.1),
          yAxisQuantity,
        );
      }
      return [0, 1];
    };

    const mainAbsorptionDomain = buildYDomain(
      null,
      extents.absorptionExtent ?? undefined,
      mainYAxisQuantity,
    );
    const residualAbsorptionDomain = buildResidualSubplotYDomain(residualPoints);

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

    const mainScales = buildScales(mainDimensions, mainAbsorptionDomain);
    const residualScales = buildScales(
      residualDimensions,
      residualAbsorptionDomain,
    );

    return {
      mainPlot: {
        dimensions: mainDimensions,
        xScale: mainScales.xScale,
        yScale: mainScales.yScale,
      },
      residualPlot: {
        dimensions: residualDimensions,
        xScale: residualScales.xScale,
        yScale: residualScales.yScale,
      },
      hasResidualSubplot: true as const,
      sharedEnergyDomain: energyDomain,
    };
  }, [
    totalWidth,
    totalHeight,
    extents,
    residualPoints,
    energyStats,
    mainYAxisQuantity,
  ]);
}
