"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { THEME_COLORS } from "../constants";

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

const VAR_MAP: Record<keyof ChartThemeColors, string> = {
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
};

function readChartThemeFromDOM(): ChartThemeColors {
  const fallback =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
      ? THEME_COLORS.dark
      : THEME_COLORS.light;

  if (typeof document === "undefined") {
    return { ...fallback } as ChartThemeColors;
  }

  const style = getComputedStyle(document.documentElement);
  const result: ChartThemeColors = { ...fallback };

  for (const key of CHART_VAR_KEYS) {
    const value = style.getPropertyValue(VAR_MAP[key]).trim();
    if (value) (result as Record<string, string>)[key] = value;
  }

  return result;
}

export function useChartTheme(): ChartThemeColors {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<ChartThemeColors>(() =>
    resolvedTheme === "dark" ? { ...THEME_COLORS.dark } : { ...THEME_COLORS.light },
  );

  useEffect(() => {
    setColors(readChartThemeFromDOM());
  }, [resolvedTheme]);

  return colors;
}
