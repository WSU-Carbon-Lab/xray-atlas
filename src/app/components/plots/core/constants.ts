export const CATEGORICAL_COLORS = [
  "#6366f1",
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
] as const;

export const COLORS = CATEGORICAL_COLORS;

export const SEQUENTIAL_SCALES = {
  blue: ["#eff6ff", "#bfdbfe", "#60a5fa", "#2563eb", "#1e40af"],
  indigo: ["#eef2ff", "#c7d2fe", "#818cf8", "#4f46e5", "#3730a3"],
  viridis: ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"],
} as const;

export const DIVERGING_SCALES = {
  indigoTeal: ["#4f46e5", "#818cf8", "#c7d2fe", "#f8fafc", "#99f6e4", "#2dd4bf", "#0d9488"],
  purpleGreen: ["#7c3aed", "#a78bfa", "#ddd6fe", "#f8fafc", "#bbf7d0", "#4ade80", "#16a34a"],
} as const;

export const DEFAULT_PLOT_HEIGHT = 360;

export const PLOT_HEIGHTS = {
  compact: 240,
  default: 360,
  expanded: 480,
} as const;

export const MARGINS = {
  top: 16,
  right: 24,
  bottom: 120,
  left: 78,
  pad: 0,
} as const;

export const SUBPLOT_MARGINS = {
  top: 16,
  right: 24,
  bottom: 16,
  left: 78,
  pad: 0,
} as const;

export const THEME_COLORS = {
  light: {
    background: "#ffffff",
    paper: "#f8fafc",
    plot: "#ffffff",
    grid: "rgba(148, 163, 184, 0.2)",
    gridStrong: "rgba(148, 163, 184, 0.4)",
    axis: "#64748b",
    text: "#475569",
    textSecondary: "#94a3b8",
    hoverBg: "#f8fafc",
    hoverText: "#111827",
    legendBg: "rgba(255, 255, 255, 0.95)",
    legendBorder: "rgba(148, 163, 184, 0.3)",
    crosshair: "rgba(71, 85, 105, 0.5)",
    selection: "rgba(99, 102, 241, 0.1)",
    selectionBorder: "rgba(99, 102, 241, 0.5)",
  },
  dark: {
    background: "#0f172a",
    paper: "#1e293b",
    plot: "#0f172a",
    grid: "rgba(71, 85, 105, 0.3)",
    gridStrong: "rgba(71, 85, 105, 0.5)",
    axis: "#94a3b8",
    text: "#cbd5e1",
    textSecondary: "#64748b",
    hoverBg: "#1e293b",
    hoverText: "#f8fafc",
    legendBg: "rgba(30, 41, 59, 0.95)",
    legendBorder: "rgba(71, 85, 105, 0.5)",
    crosshair: "rgba(148, 163, 184, 0.5)",
    selection: "rgba(129, 140, 248, 0.15)",
    selectionBorder: "rgba(129, 140, 248, 0.6)",
  },
} as const;

export const NORMALIZATION_COLORS = {
  pre: "rgba(59, 130, 246, 0.12)",
  post: "rgba(16, 185, 129, 0.12)",
  preLine: "rgba(59, 130, 246, 0.8)",
  postLine: "rgba(16, 185, 129, 0.8)",
  preFill: "rgba(59, 130, 246, 0.2)",
  postFill: "rgba(16, 185, 129, 0.2)",
  preHandle: "#3b82f6",
  postHandle: "#10b981",
} as const;

export const PEAK_COLORS = {
  selected: "#6366f1",
  unselected: "#94a3b8",
  hover: "#818cf8",
  fitted: "#8b5cf6",
  residual: "#f59e0b",
  annotation: "#64748b",
} as const;

export const SELECTED_GEOMETRY_COLOR = "#6366f1";

export const FONT_CONFIG = {
  family: "Inter, system-ui, sans-serif",
  mono: "JetBrains Mono, Fira Code, monospace",
  size: {
    axis: 12,
    label: 13,
    title: 14,
    legend: 12,
    tooltip: 13,
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
  },
} as const;

export const AXIS_CONFIG = {
  fontSize: 12,
  fontWeight: 500,
  tickSize: 5,
  tickPadding: 8,
  labelPadding: 40,
} as const;

export const LINE_CONFIG = {
  strokeWidth: {
    thin: 1,
    default: 2,
    thick: 3,
  },
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
} as const;

export const GRID_CONFIG = {
  strokeWidth: 1,
  strokeDasharray: "4 4",
  strokeDasharrayStrong: "none",
} as const;

export const ANIMATION_CONFIG = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    default: "ease-out",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
} as const;

export const INTERACTION_CONFIG = {
  tooltip: {
    delay: 100,
    offset: 12,
  },
  zoom: {
    minScale: 0.1,
    maxScale: 100,
    wheelDelta: 0.1,
  },
  selection: {
    minSize: 10,
  },
} as const;
