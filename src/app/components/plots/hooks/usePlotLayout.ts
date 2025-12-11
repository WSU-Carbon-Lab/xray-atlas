/**
 * Hook for generating Plotly layout configuration
 */

import { useMemo } from "react";
import { useTheme } from "next-themes";
import type { Layout } from "plotly.js";
import type {
  SpectrumPoint,
  AxisStats,
  Peak,
  NormalizationRegions,
  ReferenceCurve,
  DifferenceSpectrum,
} from "../core/types";
import type { DataExtents } from "../core/types";
import { THEME_COLORS, MARGINS, SUBPLOT_MARGINS, FONT_CONFIG, NORMALIZATION_COLORS } from "../core/constants";
import { useNormalizationShapes } from "./useNormalizationShapes";
import { usePeakShapes } from "./usePeakShapes";

export type PlotLayoutResult = {
  layout: Layout;
  mainPlotHeight: number;
  peakPlotHeight: number;
  hasPeakVisualization: boolean;
};

/**
 * Generate Plotly layout configuration
 */
export function usePlotLayout(
  height: number,
  energyStats: AxisStats | undefined,
  absorptionStats: AxisStats | undefined,
  extents: DataExtents,
  points: SpectrumPoint[],
  peaks: Peak[],
  selectedPeakId: string | null,
  normalizationRegions: NormalizationRegions | undefined,
  selectionTarget: "pre" | "post" | null,
  isManualPeakMode: boolean,
  referenceCurves: ReferenceCurve[],
  differenceSpectra: DifferenceSpectrum[],
  hasPeakVisualization: boolean,
  totalLegendItems: number,
): PlotLayoutResult {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const normalizationShapes = useNormalizationShapes(normalizationRegions);
  const peakShapes = usePeakShapes(peaks, selectedPeakId);

  const mainPlotHeight = hasPeakVisualization ? height * 0.4 : height;
  const peakPlotHeight = hasPeakVisualization ? height * 0.6 : 0;

  const layout = useMemo<Layout>(() => {
    const energyRange = extents.energyExtent
      ? [extents.energyExtent.min, extents.energyExtent.max]
      : energyStats?.min !== null &&
          energyStats?.max !== null &&
          typeof energyStats?.min === "number" &&
          typeof energyStats?.max === "number"
        ? [energyStats.min, energyStats.max]
        : undefined;

    // Calculate measurement range - if difference spectra are shown, use their range
    let measurementRange: [number, number] | undefined;
    if (differenceSpectra.length > 0 && extents.absorptionExtent) {
      const minAbs = extents.absorptionExtent.min;
      const maxAbs = extents.absorptionExtent.max;
      const padding = Math.max(Math.abs(maxAbs - minAbs) * 0.1, 0.1);
      measurementRange = [minAbs - padding, maxAbs + padding];
    } else {
      const absorptionCandidates: number[] = [];
      if (typeof absorptionStats?.min === "number")
        absorptionCandidates.push(absorptionStats.min);
      if (typeof absorptionStats?.max === "number")
        absorptionCandidates.push(absorptionStats.max);
      if (extents.absorptionExtent) {
        absorptionCandidates.push(
          extents.absorptionExtent.min,
          extents.absorptionExtent.max,
        );
      }
      points.forEach((point) => {
        absorptionCandidates.push(point.absorption);
      });

      const finiteValues = absorptionCandidates.filter((value) =>
        Number.isFinite(value),
      );
      if (finiteValues.length >= 1) {
        const maxAbs = Math.max(...finiteValues, 0);
        const padding = maxAbs > 0 ? maxAbs * 0.1 : 0.1;
        measurementRange = [0, maxAbs + padding];
      }
    }

    const newSelectionStyle = (() => {
      if (!selectionTarget) return undefined;
      const isPre = selectionTarget === "pre";
      const style: {
        mode: string;
        line: { color: string; width: number };
        fillcolor: string;
      } = {
        mode: "immediate",
        line: {
          color: isPre ? NORMALIZATION_COLORS.preLine : NORMALIZATION_COLORS.postLine,
          width: 2,
        },
        fillcolor: isPre
          ? NORMALIZATION_COLORS.preFill
          : NORMALIZATION_COLORS.postFill,
      };
      return style;
    })();

    const themeColors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;

    const baseLayout = {
      dragmode: isManualPeakMode ? false : selectionTarget ? "select" : "pan",
      hovermode: "x unified",
      hoverlabel: {
        bgcolor: themeColors.hoverBg,
        font: { color: themeColors.hoverText },
      },
      paper_bgcolor: themeColors.paper,
      plot_bgcolor: themeColors.plot,
      title: {
        text: "",
      },
      subtitle: {
        text: "",
      } as { text: string },
      annotations: [],
      height,
      font: {
        family: FONT_CONFIG.family,
        color: themeColors.text,
      },
      legend: {
        orientation: "h",
        yanchor: "bottom",
        xanchor: "center",
        x: 0.5,
        y: hasPeakVisualization ? -0.25 : -0.35,
        bgcolor: themeColors.legendBg,
        borderwidth: 1,
        bordercolor: themeColors.legendBorder,
        font: {
          size: FONT_CONFIG.size,
        },
        borderradius: 8,
        itemclick: "toggle",
        itemdoubleclick: "toggleothers",
        ...(totalLegendItems > 0 && {
          tracegroupgap: 10,
        }),
      },
      shapes: [...normalizationShapes, ...peakShapes],
      newselection: newSelectionStyle,
    };

    if (hasPeakVisualization) {
      // Subplot layout: main plot on top, peak plot below
      return {
        ...baseLayout,
        margin: SUBPLOT_MARGINS,
        xaxis: {
          title: { text: "Energy (eV)", standoff: 18 },
          domain: [0, 1],
          anchor: "y",
          gridcolor: themeColors.grid,
          zeroline: false,
          rangemode: "normal",
          range: energyRange,
        },
        yaxis: {
          title: { text: "Intensity", standoff: 18 },
          domain: [peakPlotHeight / height, 1],
          anchor: "x",
          gridcolor: themeColors.grid,
          zeroline: false,
          rangemode: "normal",
          range: measurementRange,
        },
        xaxis2: {
          title: { text: "Energy (eV)", standoff: 18 },
          domain: [0, 1],
          anchor: "y2",
          gridcolor: themeColors.grid,
          zeroline: false,
          rangemode: "normal",
          range: energyRange,
        },
        yaxis2: {
          title: { text: "Intensity", standoff: 18 },
          domain: [0, peakPlotHeight / height],
          anchor: "x2",
          gridcolor: themeColors.grid,
          zeroline: false,
          rangemode: "normal",
        },
      } as unknown as Layout;
    }

    // Single plot layout (no subplot)
    return {
      ...baseLayout,
      margin: MARGINS,
      xaxis: {
        title: { text: "Energy (eV)", standoff: 18 },
        gridcolor: themeColors.grid,
        zeroline: false,
        rangemode: "normal",
        range: energyRange,
      },
      yaxis: {
        title: { text: "Intensity", standoff: 18 },
        gridcolor: themeColors.grid,
        zeroline: false,
        rangemode: "normal",
        range: measurementRange,
      },
    } as unknown as Layout;
  }, [
    height,
    energyStats,
    absorptionStats,
    extents,
    points,
    normalizationShapes,
    peakShapes,
    selectionTarget,
    isManualPeakMode,
    differenceSpectra,
    hasPeakVisualization,
    peakPlotHeight,
    totalLegendItems,
    isDark,
  ]);

  return {
    layout,
    mainPlotHeight,
    peakPlotHeight,
    hasPeakVisualization,
  };
}
