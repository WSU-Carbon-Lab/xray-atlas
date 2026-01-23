/**
 * Hook for managing dual subplot layout (main plot + peak visualization subplot)
 */

import { useMemo } from "react";
import { scaleLinear } from "@visx/scale";
import type { ScaleLinear } from "d3-scale";
import type {
  DataExtents,
  PlotDimensions,
  AxisStats,
  SpectrumPoint,
} from "../core/types";
import { MARGINS, SUBPLOT_MARGINS } from "../core/constants";

export type SubplotLayout = {
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

/**
 * Calculate layout and scales for dual subplot structure
 */
export function useVisxSubplotLayout(
  totalWidth: number,
  totalHeight: number,
  extents: DataExtents,
  hasPeakVisualization: boolean,
  peakVisualizationPoints: SpectrumPoint[] | null,
  energyStats?: AxisStats,
  absorptionStats?: AxisStats,
): SubplotLayout {
  return useMemo(() => {
    const hasSubplot =
      hasPeakVisualization &&
      peakVisualizationPoints !== null &&
      peakVisualizationPoints.length > 0;

    // Calculate height split: 40% main, 60% peak (main plot gets 40%, peak subplot gets 60%)
    const peakPlotHeightRatio = 0.6;
    const mainPlotHeightRatio = 1 - peakPlotHeightRatio;

    if (hasSubplot) {
      // Dual subplot layout
      const mainPlotHeight = totalHeight * mainPlotHeightRatio;
      const peakPlotHeight = totalHeight * peakPlotHeightRatio;

      // Main plot dimensions
      const mainPlotDimensions: PlotDimensions = {
        width: totalWidth,
        height: mainPlotHeight,
        margins: {
          ...SUBPLOT_MARGINS,
          bottom: SUBPLOT_MARGINS.bottom, // No x-axis label on main plot when subplot exists
        },
      };

      // Peak plot dimensions
      const peakPlotDimensions: PlotDimensions = {
        width: totalWidth,
        height: peakPlotHeight,
        margins: {
          ...MARGINS,
          top: SUBPLOT_MARGINS.top, // Minimal top margin for peak plot
        },
      };

      // Calculate main plot scales
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
        mainEnergyDomain = [extents.energyExtent.min, extents.energyExtent.max];
      } else if (energyStats) {
        const min = energyStats.min;
        const max = energyStats.max;
        if (
          min !== null &&
          max !== null &&
          typeof min === "number" &&
          typeof max === "number"
        ) {
          mainEnergyDomain = [min, max];
        } else {
          mainEnergyDomain = [0, 1000];
        }
      } else {
        mainEnergyDomain = [0, 1000];
      }

      let mainAbsorptionDomain: [number, number];
      if (extents.absorptionExtent) {
        const minAbs = extents.absorptionExtent.min;
        const maxAbs = extents.absorptionExtent.max;
        const padding = Math.max(Math.abs(maxAbs - minAbs) * 0.1, 0.1);
        mainAbsorptionDomain = [0, maxAbs + padding];
      } else if (absorptionStats) {
        const min = absorptionStats.min;
        const max = absorptionStats.max;
        if (
          min !== null &&
          max !== null &&
          typeof min === "number" &&
          typeof max === "number"
        ) {
          const padding = Math.max((max - min) * 0.1, 0.1);
          mainAbsorptionDomain = [0, max + padding];
        } else {
          mainAbsorptionDomain = [0, 1];
        }
      } else {
        mainAbsorptionDomain = [0, 1];
      }

      const mainXScale = scaleLinear<number>({
        domain: mainEnergyDomain,
        range: [0, mainPlotWidth],
        nice: true,
      });

      const mainYScale = scaleLinear<number>({
        domain: mainAbsorptionDomain,
        range: [mainPlotPlotHeight, 0],
        nice: true,
      });

      // Calculate peak plot scales
      const peakPlotWidth =
        peakPlotDimensions.width -
        peakPlotDimensions.margins.left -
        peakPlotDimensions.margins.right;
      const peakPlotPlotHeight =
        peakPlotDimensions.height -
        peakPlotDimensions.margins.top -
        peakPlotDimensions.margins.bottom;

      // Use energy range from peak visualization points
      const peakEnergies = peakVisualizationPoints
        .map((p) => p.energy)
        .sort((a, b) => a - b);
      const peakEnergyMin = peakEnergies[0] ?? 0;
      const peakEnergyMax = peakEnergies[peakEnergies.length - 1] ?? 1000;

      // Use absorption range from peak visualization points
      const peakAbsorptions = peakVisualizationPoints
        .map((p) => p.absorption)
        .filter((a) => Number.isFinite(a));
      const peakAbsorptionMin =
        peakAbsorptions.length > 0 ? Math.min(...peakAbsorptions) : 0;
      const peakAbsorptionMax =
        peakAbsorptions.length > 0 ? Math.max(...peakAbsorptions) : 1;
      const peakAbsorptionPadding = Math.max(
        Math.abs(peakAbsorptionMax - peakAbsorptionMin) * 0.1,
        0.1,
      );

      const peakXScale = scaleLinear<number>({
        domain: [peakEnergyMin, peakEnergyMax],
        range: [0, peakPlotWidth],
        nice: true,
      });

      const peakYScale = scaleLinear<number>({
        domain: [0, peakAbsorptionMax + peakAbsorptionPadding],
        range: [peakPlotPlotHeight, 0],
        nice: true,
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
    } else {
      // Single plot layout
      const mainPlotDimensions: PlotDimensions = {
        width: totalWidth,
        height: totalHeight,
        margins: MARGINS,
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
        mainEnergyDomain = [extents.energyExtent.min, extents.energyExtent.max];
      } else if (energyStats) {
        const min = energyStats.min;
        const max = energyStats.max;
        if (
          min !== null &&
          max !== null &&
          typeof min === "number" &&
          typeof max === "number"
        ) {
          mainEnergyDomain = [min, max];
        } else {
          mainEnergyDomain = [0, 1000];
        }
      } else {
        mainEnergyDomain = [0, 1000];
      }

      let mainAbsorptionDomain: [number, number];
      if (extents.absorptionExtent) {
        const minAbs = extents.absorptionExtent.min;
        const maxAbs = extents.absorptionExtent.max;
        const padding = Math.max(Math.abs(maxAbs - minAbs) * 0.1, 0.1);
        mainAbsorptionDomain = [0, maxAbs + padding];
      } else if (absorptionStats) {
        const min = absorptionStats.min;
        const max = absorptionStats.max;
        if (
          min !== null &&
          max !== null &&
          typeof min === "number" &&
          typeof max === "number"
        ) {
          const padding = Math.max((max - min) * 0.1, 0.1);
          mainAbsorptionDomain = [0, max + padding];
        } else {
          mainAbsorptionDomain = [0, 1];
        }
      } else {
        mainAbsorptionDomain = [0, 1];
      }

      const mainXScale = scaleLinear<number>({
        domain: mainEnergyDomain,
        range: [0, mainPlotWidth],
        nice: true,
      });

      const mainYScale = scaleLinear<number>({
        domain: mainAbsorptionDomain,
        range: [mainPlotPlotHeight, 0],
        nice: true,
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
    }
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
