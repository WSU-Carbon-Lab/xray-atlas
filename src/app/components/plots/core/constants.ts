/**
 * Constants for spectrum plotting
 * Extracted from SpectrumPlot.tsx for reuse
 */

/**
 * Color palette for spectrum traces
 */
export const COLORS = [
  "#d7263d",
  "#1b998b",
  "#2a9d8f",
  "#f4a261",
  "#577590",
  "#ff7f50",
  "#6a4c93",
  "#0b3d91",
] as const;

/**
 * Default plot height in pixels
 */
export const DEFAULT_PLOT_HEIGHT = 360;

/**
 * Plot margins in pixels
 */
export const MARGINS = {
  top: 10,
  right: 20,
  bottom: 120,
  left: 78,
  pad: 0,
} as const;

/**
 * Subplot margins (when peak visualization is shown)
 */
export const SUBPLOT_MARGINS = {
  top: 10,
  right: 20,
  bottom: 10,
  left: 78,
  pad: 0,
} as const;

/**
 * Color mappings for dark/light mode
 */
export const THEME_COLORS = {
  light: {
    paper: "#f8fafc",
    plot: "#ffffff",
    grid: "rgba(148, 163, 184, 0.15)",
    text: "#4b5563",
    hoverBg: "#f8fafc",
    hoverText: "#111827",
    legendBg: "rgba(255,255,255,0.9)",
    legendBorder: "rgba(148, 163, 184, 0.3)",
  },
  dark: {
    paper: "#1f2937",
    plot: "#111827",
    grid: "rgba(75, 85, 99, 0.3)",
    text: "#d1d5db",
    hoverBg: "#111827",
    hoverText: "#f8fafc",
    legendBg: "rgba(31, 41, 55, 0.9)",
    legendBorder: "rgba(75, 85, 99, 0.5)",
  },
} as const;

/**
 * Normalization region colors
 */
export const NORMALIZATION_COLORS = {
  pre: "rgba(59, 130, 246, 0.12)",
  post: "rgba(16, 185, 129, 0.12)",
  preLine: "rgba(59, 130, 246, 0.8)",
  postLine: "rgba(16, 185, 129, 0.8)",
  preFill: "rgba(59, 130, 246, 0.2)",
  postFill: "rgba(16, 185, 129, 0.2)",
} as const;

/**
 * Peak colors
 */
export const PEAK_COLORS = {
  selected: "#a60f2d",
  unselected: "#6b7280",
} as const;

/**
 * Selected geometry trace color
 */
export const SELECTED_GEOMETRY_COLOR = "#d7263d";

/**
 * Font configuration
 */
export const FONT_CONFIG = {
  family: "Inter, system-ui, sans-serif",
  size: 13,
} as const;
