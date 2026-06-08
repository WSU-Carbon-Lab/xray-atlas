"use client";

import { useMemo } from "react";
import { scaleLinear } from "@visx/scale";
import type { ScaleLinear } from "d3-scale";
import type {
  AxisStats,
  DataExtents,
  PlotDimensions,
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

export type TraceStackSplitPanelLayout = {
  readonly label: string;
  readonly dimensions: PlotDimensions;
  readonly xScale: ScaleLinear<number, number>;
  readonly yScale: ScaleLinear<number, number>;
  readonly yOffset: number;
  readonly yAxisQuantity: SpectrumYAxisQuantity;
};

export type TraceStackSplitLayoutResult = {
  readonly panels: readonly TraceStackSplitPanelLayout[];
  readonly sharedEnergyDomain: [number, number];
  readonly hasTraceStackSplit: true;
};

/**
 * Builds equal-height stacked subplot scales sharing one energy domain and independent Y domains.
 */
export function useTraceStackSplitLayout(
  totalWidth: number,
  totalHeight: number,
  extents: DataExtents,
  panelExtents: ReadonlyArray<{
    label: string;
    min: number;
    max: number;
    yAxisQuantity: SpectrumYAxisQuantity;
  }>,
  energyStats?: AxisStats,
): TraceStackSplitLayoutResult {
  return useMemo(() => {
    const panelCount = Math.max(1, panelExtents.length);
    const panelHeight = totalHeight / panelCount;

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

    const subplotMargins = { ...PLOT_CONFIG.subplotMargins };
    const bottomMargins = { ...PLOT_CONFIG.margins };

    let yOffset = 0;
    const panels: TraceStackSplitPanelLayout[] = panelExtents.map(
      (panelExtent, index) => {
        const isLast = index === panelCount - 1;
        const dimensions: PlotDimensions = {
          width: totalWidth,
          height: panelHeight,
          margins: isLast
            ? {
                ...bottomMargins,
                top: subplotMargins.top,
              }
            : {
                ...subplotMargins,
                bottom: subplotMargins.bottom,
              },
        };

        const yDomain = yDomainWithMandatoryZero(
          linearYDomainWithPadding(panelExtent.min, panelExtent.max, 0.1),
          panelExtent.yAxisQuantity,
        );

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

        const layout: TraceStackSplitPanelLayout = {
          label: panelExtent.label,
          dimensions,
          xScale,
          yScale,
          yOffset,
          yAxisQuantity: panelExtent.yAxisQuantity,
        };
        yOffset += panelHeight;
        return layout;
      },
    );

    return {
      panels,
      sharedEnergyDomain: energyDomain,
      hasTraceStackSplit: true as const,
    };
  }, [totalWidth, totalHeight, extents, panelExtents, energyStats]);
}
