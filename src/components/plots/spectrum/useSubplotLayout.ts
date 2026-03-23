"use client";

import { useMemo } from "react";
import { scaleLinear } from "@visx/scale";
import type { ScaleLinear } from "d3-scale";
import type {
  DataExtents,
  PlotDimensions,
  AxisStats,
  SpectrumPoint,
} from "../types";
import { PLOT_CONFIG } from "../config";
import { linearYDomainWithPadding } from "../utils/linearYDomain";

export type SubplotLayoutResult = {
  mainPlot: {
    dimensions: PlotDimensions;
    xScale: ScaleLinear<number, number>;
    yScale: ScaleLinear<number, number>;
  };
  peakPlot: {
    dimensions: PlotDimensions;
    xScale: ScaleLinear<number, number>;
    yScale: ScaleLinear<number, number>;
  } | null;
  hasSubplot: boolean;
};

export function useSubplotLayout(
  totalWidth: number,
  totalHeight: number,
  extents: DataExtents,
  hasPeakVisualization: boolean,
  peakVisualizationPoints: SpectrumPoint[] | null,
  energyStats?: AxisStats,
  absorptionStats?: AxisStats,
): SubplotLayoutResult {
  return useMemo(() => {
    const hasSubplot =
      hasPeakVisualization &&
      peakVisualizationPoints !== null &&
      peakVisualizationPoints.length > 0;

    const peakPlotHeightRatio = PLOT_CONFIG.peakPlotHeightRatio;
    const mainPlotHeightRatio = 1 - peakPlotHeightRatio;

    const mainMargins = { ...PLOT_CONFIG.margins };
    const subplotMargins = { ...PLOT_CONFIG.subplotMargins };

    if (hasSubplot) {
      const mainPlotHeight = totalHeight * mainPlotHeightRatio;
      const peakPlotHeight = totalHeight * peakPlotHeightRatio;

      const mainPlotDimensions: PlotDimensions = {
        width: totalWidth,
        height: mainPlotHeight,
        margins: {
          ...subplotMargins,
          bottom: subplotMargins.bottom,
        },
      };

      const peakPlotDimensions: PlotDimensions = {
        width: totalWidth,
        height: peakPlotHeight,
        margins: {
          ...mainMargins,
          top: subplotMargins.top,
        },
      };

      const mainPlotWidth =
        mainPlotDimensions.width -
        mainPlotDimensions.margins.left -
        mainPlotDimensions.margins.right;
      const mainPlotPlotHeight =
        mainPlotDimensions.height -
        mainPlotDimensions.margins.top -
        mainPlotDimensions.margins.bottom;

      let mainEnergyDomain: [number, number];
      if (extents.energyExtent) {
        const minE = extents.energyExtent.min;
        const maxE = extents.energyExtent.max;
        mainEnergyDomain = [minE, maxE];
      } else if (energyStats?.min != null && energyStats?.max != null) {
        mainEnergyDomain = [energyStats.min, energyStats.max];
      } else {
        mainEnergyDomain = [0, 1000];
      }

      let mainAbsorptionDomain: [number, number];
      if (extents.absorptionExtent) {
        const minAbs = extents.absorptionExtent.min;
        const maxAbs = extents.absorptionExtent.max;
        mainAbsorptionDomain = linearYDomainWithPadding(minAbs, maxAbs, 0.1);
      } else if (absorptionStats?.min != null && absorptionStats?.max != null) {
        mainAbsorptionDomain = linearYDomainWithPadding(
          absorptionStats.min,
          absorptionStats.max,
          0.1,
        );
      } else {
        mainAbsorptionDomain = [0, 1];
      }

      const mainXScale = scaleLinear<number>({
        domain: mainEnergyDomain,
        range: [0, mainPlotWidth],
      });

      const mainYScale = scaleLinear<number>({
        domain: mainAbsorptionDomain,
        range: [mainPlotPlotHeight, 0],
      });

      const peakPlotWidth =
        peakPlotDimensions.width -
        peakPlotDimensions.margins.left -
        peakPlotDimensions.margins.right;
      const peakPlotPlotHeight =
        peakPlotDimensions.height -
        peakPlotDimensions.margins.top -
        peakPlotDimensions.margins.bottom;

      const peakEnergies = peakVisualizationPoints
        .map((p) => p.energy)
        .sort((a, b) => a - b);
      const peakEnergyMin = peakEnergies[0] ?? 0;
      const peakEnergyMax = peakEnergies[peakEnergies.length - 1] ?? 1000;

      const peakAbsorptions = peakVisualizationPoints
        .map((p) => p.absorption)
        .filter((a) => Number.isFinite(a));
      const peakAbsorptionMax =
        peakAbsorptions.length > 0 ? Math.max(...peakAbsorptions) : 1;
      const peakAbsorptionPadding = Math.max(
        peakAbsorptions.length > 0
          ? Math.abs(peakAbsorptionMax - Math.min(...peakAbsorptions)) * 0.1
          : 0,
        0.1,
      );

      const peakXScale = scaleLinear<number>({
        domain: [peakEnergyMin, peakEnergyMax],
        range: [0, peakPlotWidth],
      });

      const peakYScale = scaleLinear<number>({
        domain: [0, peakAbsorptionMax + peakAbsorptionPadding],
        range: [peakPlotPlotHeight, 0],
      });

      return {
        mainPlot: {
          dimensions: mainPlotDimensions,
          xScale: mainXScale,
          yScale: mainYScale,
        },
        peakPlot: {
          dimensions: peakPlotDimensions,
          xScale: peakXScale,
          yScale: peakYScale,
        },
        hasSubplot: true,
      };
    }

    const mainPlotDimensions: PlotDimensions = {
      width: totalWidth,
      height: totalHeight,
      margins: mainMargins,
    };

    const mainPlotWidth =
      mainPlotDimensions.width -
      mainPlotDimensions.margins.left -
      mainPlotDimensions.margins.right;
    const mainPlotPlotHeight =
      mainPlotDimensions.height -
      mainPlotDimensions.margins.top -
      mainPlotDimensions.margins.bottom;

    let mainEnergyDomain: [number, number];
    if (extents.energyExtent) {
      const minE = extents.energyExtent.min;
      const maxE = extents.energyExtent.max;
      mainEnergyDomain = [minE, maxE];
    } else if (energyStats?.min != null && energyStats?.max != null) {
      mainEnergyDomain = [energyStats.min, energyStats.max];
    } else {
      mainEnergyDomain = [0, 1000];
    }

    let mainAbsorptionDomain: [number, number];
    if (extents.absorptionExtent) {
      const minAbs = extents.absorptionExtent.min;
      const maxAbs = extents.absorptionExtent.max;
      mainAbsorptionDomain = linearYDomainWithPadding(minAbs, maxAbs, 0.1);
    } else if (absorptionStats?.min != null && absorptionStats?.max != null) {
      mainAbsorptionDomain = linearYDomainWithPadding(
        absorptionStats.min,
        absorptionStats.max,
        0.1,
      );
    } else {
      mainAbsorptionDomain = [0, 1];
    }

    const mainXScale = scaleLinear<number>({
      domain: mainEnergyDomain,
      range: [0, mainPlotWidth],
    });

    const mainYScale = scaleLinear<number>({
      domain: mainAbsorptionDomain,
      range: [mainPlotPlotHeight, 0],
    });

    return {
      mainPlot: {
        dimensions: mainPlotDimensions,
        xScale: mainXScale,
        yScale: mainYScale,
      },
      peakPlot: null,
      hasSubplot: false,
    };
  }, [
    totalWidth,
    totalHeight,
    extents,
    hasPeakVisualization,
    peakVisualizationPoints,
    energyStats,
    absorptionStats,
  ]);
}
