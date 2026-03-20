/**
 * Export types and config for spectrum plot export.
 * Used by ExportPlotModal and apply-export-overrides pipeline.
 *
 * DOM contract (data attributes the export pipeline expects):
 * - [data-export-plot-background] - plot background rect (SpectrumPlotInner)
 * - [data-export-axis-spine] - main axis spine line (ChartAxes)
 * - [data-export-axis-group] - wrapper g around each visx Axis (ChartAxes)
 * - [data-export-legend-title] - legend title div (PlotStaticLegend)
 * - [data-export-legend-label] - legend label span per trace (PlotStaticLegend)
 * - [data-trace-index] - trace group g with index (ChartSpectrumLines)
 */

export type ExportLineStyle = "solid" | "dotted" | "dashed" | "dashdot";

export type TraceExportOverride = {
  lineStyle?: ExportLineStyle;
  lineWidth?: number;
  color?: string;
};

export type SizePreset =
  | { type: "aspect"; id: string }
  | { type: "custom"; widthCm: number; heightCm: number };

export type BackgroundKind = "transparent" | "white";

export type LegendBackgroundKind = "white" | "color";

export type ExportConfig = {
  sizePreset: SizePreset;
  customWidthCm: string;
  customHeightCm: string;
  background: BackgroundKind;
  dpi: number;
  fontAxisLabel: number;
  fontTick: number;
  fontLegendTitle: number;
  fontLegendLabel: number;
  spineWidth: number;
  tickStrokeWidth: number;
  legendBackground: LegendBackgroundKind;
  legendBorderRadius: number;
  legendColumns: number;
  traceOverrides: Record<string, TraceExportOverride>;
};

export const EXPORT_DEFAULTS = {
  CM_PER_INCH: 2.54,
  DEFAULT_DPI: 600,
  BASE_CM: 8.6,
  FONT_SIZE_OPTS: [8, 9, 10, 11, 12, 13, 14, 16, 18] as const,
} as const;

export const FONT_SIZE_OPTS = EXPORT_DEFAULTS.FONT_SIZE_OPTS;

export const ASPECT_RATIOS: {
  id: string;
  label: string;
  w: number;
  h: number;
  icon: "square" | "landscape" | "wide" | "custom";
}[] = [
  { id: "1:1", label: "1:1", w: 1, h: 1, icon: "square" },
  { id: "4:3", label: "4:3", w: 4, h: 3, icon: "landscape" },
  { id: "16:9", label: "16:9", w: 16, h: 9, icon: "wide" },
];

export const LINE_STYLE_OPTS: { value: ExportLineStyle; label: string }[] = [
  { value: "solid", label: "Solid" },
  { value: "dotted", label: "Dotted" },
  { value: "dashed", label: "Dashed" },
  { value: "dashdot", label: "Dash-dot" },
];

export function strokeDasharrayForStyle(style: ExportLineStyle): string {
  switch (style) {
    case "solid":
      return "none";
    case "dotted":
      return "2 2";
    case "dashed":
      return "6 4";
    case "dashdot":
      return "6 4 2 4";
    default:
      return "none";
  }
}

function aspectToCm(
  w: number,
  h: number,
  baseCm: number,
): { widthCm: number; heightCm: number } {
  const widthCm = baseCm;
  const heightCm = (baseCm * h) / w;
  return { widthCm, heightCm };
}

export type PlotAreaRect = { left: number; top: number; width: number; height: number };

export function getDimensionsFromConfig(
  config: ExportConfig,
  plotWidth: number,
  plotHeight: number,
  plotArea?: PlotAreaRect,
): { widthCm: number; heightCm: number } {
  const { sizePreset, customWidthCm, customHeightCm } = config;
  const { BASE_CM } = EXPORT_DEFAULTS;
  if (sizePreset.type === "custom") {
    return {
      widthCm: Number.parseFloat(customWidthCm) || 8.6,
      heightCm: Number.parseFloat(customHeightCm) || 6,
    };
  }
  if (sizePreset.type === "aspect" && plotArea && plotArea.width > 0 && plotArea.height > 0) {
    const ratio = ASPECT_RATIOS.find((r) => r.id === sizePreset.id);
    const rW = ratio ? ratio.w : 1;
    const rH = ratio ? ratio.h : 1;
    const targetPlotAspect = rW / rH;
    const plotBoxWidthCm = BASE_CM;
    const plotBoxHeightCm = plotBoxWidthCm / targetPlotAspect;
    const widthCm = (plotWidth / plotArea.width) * plotBoxWidthCm;
    const heightCm = (plotHeight / plotArea.height) * plotBoxHeightCm;
    return { widthCm, heightCm };
  }
  if (sizePreset.type === "aspect") {
    const ratio = ASPECT_RATIOS.find((r) => r.id === sizePreset.id);
    if (ratio) return aspectToCm(ratio.w, ratio.h, BASE_CM);
    return aspectToCm(1, 1, BASE_CM);
  }
  return {
    widthCm: Number.parseFloat(customWidthCm) || 8.6,
    heightCm: Number.parseFloat(customHeightCm) || 6,
  };
}

export function createDefaultExportConfig(): ExportConfig {
  return {
    sizePreset: { type: "aspect", id: "1:1" },
    customWidthCm: "8.6",
    customHeightCm: "6",
    background: "transparent",
    dpi: EXPORT_DEFAULTS.DEFAULT_DPI,
    fontAxisLabel: 13,
    fontTick: 12,
    fontLegendTitle: 12,
    fontLegendLabel: 12,
    spineWidth: 1,
    tickStrokeWidth: 1,
    legendBackground: "white",
    legendBorderRadius: 8,
    legendColumns: 1,
    traceOverrides: {},
  };
}
