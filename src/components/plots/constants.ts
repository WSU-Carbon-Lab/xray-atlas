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

export const SPECTRUM_TRACE_GRADIENT_DARK = [
  "#94a3b8",
  "#64748b",
  "#475569",
  "#78716c",
  "#b91c1c",
  "#dc2626",
  "#ef4444",
  "#f87171",
] as const;

export const SPECTRUM_TRACE_GRADIENT_LIGHT = [
  "#64748b",
  "#475569",
  "#94a3b8",
  "#cbd5e1",
  "#b91c1c",
  "#dc2626",
  "#ef4444",
  "#fca5a5",
] as const;

export const SPECTRUM_TRACE_GRADIENT = SPECTRUM_TRACE_GRADIENT_DARK;

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const h = hex.trim().replace("#", "");
  if (h.length === 3) {
    const r = parseInt(h[0]! + h[0]!, 16);
    const g = parseInt(h[1]! + h[1]!, 16);
    const b = parseInt(h[2]! + h[2]!, 16);
    return { r, g, b };
  }
  const n = parseInt(h.slice(0, 6), 16);
  if (!Number.isFinite(n)) return { r: 136, g: 136, b: 136 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")}`;
}

function lerpHex(a: string, b: string, t: number): string {
  const A = parseHexColor(a);
  const B = parseHexColor(b);
  const u = Math.max(0, Math.min(1, t));
  return rgbToHex(
    A.r + (B.r - A.r) * u,
    A.g + (B.g - A.g) * u,
    A.b + (B.b - A.b) * u,
  );
}

function colorAlongPaletteStops(
  palette: readonly string[],
  frac01: number,
): string {
  const n = palette.length;
  if (n === 0) return "#888888";
  if (n === 1) return palette[0]!;
  const f = Math.max(0, Math.min(1, frac01));
  const x = f * (n - 1);
  const i0 = Math.floor(x);
  const i1 = Math.min(n - 1, i0 + 1);
  const t = x - i0;
  return lerpHex(palette[i0]!, palette[i1]!, t);
}

/**
 * Picks a color for trace `traceIndex` out of `traceCount` traces by sampling the grey-to-red spectrum gradient at evenly spaced positions from palette start (low angle) through palette end (high angle).
 *
 * @param palette Ordered stop list (for example `SPECTRUM_TRACE_GRADIENT_DARK`); must be non-empty for a non-gray fallback.
 * @param traceIndex Zero-based index of the trace after geometries are sorted by ascending theta then phi.
 * @param traceCount Total number of traces sharing this palette pass; must be at least 1. When `traceCount === 1`, uses the midpoint of the palette path.
 * @returns CSS `#rrggbb` color string; never throws.
 */
export function spectrumTraceColorAlongGradient(
  palette: readonly string[],
  traceIndex: number,
  traceCount: number,
): string {
  const n = palette.length;
  if (n === 0) return "#888888";
  if (traceCount <= 0) return palette[0]!;
  if (traceCount === 1) return colorAlongPaletteStops(palette, 0.5);
  const clamped = Math.max(0, Math.min(traceCount - 1, traceIndex));
  const frac = clamped / (traceCount - 1);
  return colorAlongPaletteStops(palette, frac);
}

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

export const FILL_CONTAINER_MIN_HEIGHT = 640;

export const PLOT_HEIGHTS = {
  compact: 280,
  default: 360,
  expanded: 480,
} as const;

export const MARGINS = {
  top: 24,
  right: 28,
  bottom: 88,
  left: 52,
  pad: 0,
} as const;

export const SUBPLOT_MARGINS = {
  top: 24,
  right: 28,
  bottom: 20,
  left: 52,
  pad: 0,
} as const;

export const PLOT_FRAME_RADIUS = 8;

export const OVERVIEW_HEIGHT = 100;
export const OVERVIEW_GAP = 6;
export const OVERVIEW_MARGINS = { top: 6, right: 28, bottom: 32, left: 52 } as const;

export const BRUSH_SELECTION_COLOR = "rgba(202, 18, 55, 0.22)";
export const BRUSH_SELECTION_BORDER_COLOR = "rgba(202, 18, 55, 0.75)";

export const THEME_COLORS = {
  light: {
    background: "#ffffff",
    paper: "#f8fafc",
    plot: "#ffffff",
    grid: "rgba(148, 163, 184, 0.14)",
    gridStrong: "rgba(148, 163, 184, 0.28)",
    axis: "#94a3b8",
    text: "#64748b",
    textSecondary: "#94a3b8",
    hoverBg: "#f8fafc",
    hoverText: "#111827",
    legendBg: "rgba(255, 255, 255, 0.95)",
    legendBorder: "rgba(148, 163, 184, 0.3)",
    crosshair: "rgba(71, 85, 105, 0.5)",
    selection: "rgba(202, 18, 55, 0.18)",
    selectionBorder: "rgba(202, 18, 55, 0.65)",
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
    selection: "rgba(202, 18, 55, 0.22)",
    selectionBorder: "rgba(202, 18, 55, 0.7)",
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

export const PEAK_SELECTION_ACCENT = "var(--accent)";

export const PEAK_COLORS = {
  selected: PEAK_SELECTION_ACCENT,
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
    axis: 13,
    label: 14,
    title: 15,
    legend: 13,
    tooltip: 14,
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
  },
} as const;

export const AXIS_CONFIG = {
  fontSize: 13,
  fontWeight: 500,
  tickSize: 5,
  tickPadding: 8,
  labelPadding: 42,
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
