"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

export const PLOT_CONFIG = {
  height: {
    compact: 240,
    default: 360,
    expanded: 480,
  },
  fillContainerMinHeight: 640,
  overviewHeight: 100,
  overviewGap: 6,
  toolbarHeight: 48,
  margins: {
    top: 12,
    right: 20,
    bottom: 44,
    left: 56,
  },
  subplotMargins: {
    top: 12,
    right: 20,
    bottom: 16,
    left: 56,
  },
  overviewMargins: {
    top: 4,
    right: 20,
    bottom: 28,
    left: 44,
  },
  axis: {
    fontSize: 13,
    fontWeight: 500,
    tickSize: 5,
    tickPadding: 8,
    labelPadding: 42,
  },
  grid: {
    strokeWidth: 1,
    strokeDasharray: "4 4",
  },
  line: {
    strokeWidth: 2,
    strokeLinecap: "round" as const,
  },
  peakPlotHeightRatio: 0.6,
  energyPaddingFraction: 0.032,
  tooltipSnapThresholdFraction: 0.02,
  interaction: {
    tooltipDelay: 100,
    tooltipOffset: 12,
    selectionMinSize: 10,
  },
} as const;

export const PLOT_MARGINS = PLOT_CONFIG.margins;
export const PLOT_MARGIN_TOP = PLOT_CONFIG.margins.top;
export const PLOT_MARGIN_RIGHT = PLOT_CONFIG.margins.right;
export const PLOT_MARGIN_BOTTOM = PLOT_CONFIG.margins.bottom;
export const PLOT_MARGIN_LEFT = PLOT_CONFIG.margins.left;

export const CHART_CSS_VARS = {
  background: "--chart-background",
  paper: "--chart-paper",
  plot: "--chart-plot",
  grid: "--chart-grid",
  gridStrong: "--chart-grid-strong",
  axis: "--chart-axis",
  text: "--chart-text",
  textSecondary: "--chart-text-secondary",
  hoverBg: "--chart-hover-bg",
  hoverText: "--chart-hover-text",
  legendBg: "--chart-legend-bg",
  legendBorder: "--chart-legend-border",
  crosshair: "--chart-crosshair",
  selection: "--chart-selection",
  selectionBorder: "--chart-selection-border",
} as const;

export type ChartThemeColors = {
  background: string;
  paper: string;
  plot: string;
  grid: string;
  gridStrong: string;
  axis: string;
  text: string;
  textSecondary: string;
  hoverBg: string;
  hoverText: string;
  legendBg: string;
  legendBorder: string;
  crosshair: string;
  selection: string;
  selectionBorder: string;
};

const CHART_VAR_KEYS: (keyof ChartThemeColors)[] = [
  "background",
  "paper",
  "plot",
  "grid",
  "gridStrong",
  "axis",
  "text",
  "textSecondary",
  "hoverBg",
  "hoverText",
  "legendBg",
  "legendBorder",
  "crosshair",
  "selection",
  "selectionBorder",
];

const FALLBACK_THEME: ChartThemeColors = {
  background: "#ffffff",
  paper: "#f8fafc",
  plot: "#ffffff",
  grid: "rgba(148, 163, 184, 0.2)",
  gridStrong: "rgba(148, 163, 184, 0.4)",
  axis: "#64748b",
  text: "#475569",
  textSecondary: "#94a3b8",
  hoverBg: "#f8fafc",
  hoverText: "#1e293b",
  legendBg: "rgba(255, 255, 255, 0.95)",
  legendBorder: "rgba(148, 163, 184, 0.3)",
  crosshair: "rgba(71, 85, 105, 0.5)",
  selection: "rgba(202, 18, 55, 0.18)",
  selectionBorder: "rgba(202, 18, 55, 0.65)",
};

function readChartThemeFromDOM(): ChartThemeColors {
  if (typeof document === "undefined") {
    return { ...FALLBACK_THEME };
  }
  const result = { ...FALLBACK_THEME };
  const style = getComputedStyle(document.documentElement);
  for (const key of CHART_VAR_KEYS) {
    const varName = CHART_CSS_VARS[key];
    const value = style.getPropertyValue(varName).trim();
    if (value) (result as Record<string, string>)[key] = value;
  }
  return result;
}

export function getChartThemeColors(): ChartThemeColors {
  return readChartThemeFromDOM();
}

export function useChartThemeFromCSS(): ChartThemeColors {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<ChartThemeColors>(getChartThemeColors);
  useEffect(() => {
    setColors(getChartThemeColors());
  }, [resolvedTheme]);
  return colors;
}
