import { SPECTRUM_TRACE_LINE_WIDTH } from "~/components/plots/constants";
import type { PlotViewerDescriptorField } from "./plot-viewer-legend";
import {
  pickPlotViewerPaletteColor,
  type PlotViewerPaletteId,
} from "./plot-viewer-palette-catalog";
import type {
  PlotViewerExperimentColorMode,
  PlotViewerTraceStyleOverride,
} from "./plot-viewer-style-overrides";

export type { PlotViewerPaletteId } from "./plot-viewer-palette-catalog";
export { PLOT_VIEWER_PALETTE_OPTIONS } from "./plot-viewer-palette-catalog";

export type PlotViewerLineDash = "solid" | "dash" | "dot" | "dashdot";

export type PlotViewerStyleMappingField = Extract<
  PlotViewerDescriptorField,
  "thetaPhi" | "instrument" | "facility" | "edge" | "molecule" | "experiment"
>;

export type PlotViewerLineStyleBy = PlotViewerStyleMappingField | "none";

export type PlotViewerMarkerSymbol =
  | "none"
  | "circle"
  | "square"
  | "triangle"
  | "diamond";

export const DEFAULT_PLOT_VIEWER_COLOR_BY: PlotViewerStyleMappingField =
  "thetaPhi";

export const DEFAULT_PLOT_VIEWER_LINE_STYLE_BY: PlotViewerLineStyleBy =
  "instrument";

export const DEFAULT_PLOT_VIEWER_MARKER_BY: PlotViewerStyleMappingField =
  "experiment";

export const PLOT_VIEWER_LINE_DASH_CYCLE: readonly PlotViewerLineDash[] = [
  "solid",
  "dash",
  "dot",
  "dashdot",
];

export const PLOT_VIEWER_MARKER_CYCLE: readonly Exclude<
  PlotViewerMarkerSymbol,
  "none"
>[] = ["circle", "square", "triangle", "diamond"];

export const PLOT_VIEWER_STYLE_MAPPING_FIELD_OPTIONS: readonly {
  id: PlotViewerStyleMappingField;
  label: string;
}[] = [
  { id: "thetaPhi", label: "θ / φ geometry" },
  { id: "instrument", label: "Instrument" },
  { id: "facility", label: "Facility" },
  { id: "edge", label: "Edge" },
  { id: "molecule", label: "Molecule" },
  { id: "experiment", label: "Experiment" },
];

export const PLOT_VIEWER_LINE_STYLE_BY_OPTIONS: readonly {
  id: PlotViewerLineStyleBy;
  label: string;
}[] = [
  { id: "none", label: "None (solid all)" },
  ...PLOT_VIEWER_STYLE_MAPPING_FIELD_OPTIONS,
];

export const PLOT_VIEWER_LINE_DASH_OPTIONS: readonly {
  id: PlotViewerLineDash;
  label: string;
}[] = [
  { id: "solid", label: "Solid" },
  { id: "dash", label: "Dashed" },
  { id: "dot", label: "Dotted" },
  { id: "dashdot", label: "Dash-dot" },
];

export const PLOT_VIEWER_MARKER_OPTIONS: readonly {
  id: PlotViewerMarkerSymbol;
  label: string;
}[] = [
  { id: "none", label: "None" },
  { id: "circle", label: "Circle" },
  { id: "square", label: "Square" },
  { id: "triangle", label: "Triangle" },
  { id: "diamond", label: "Diamond" },
];

export const PLOT_VIEWER_LINE_WIDTH_MIN = 0.5;
export const PLOT_VIEWER_LINE_WIDTH_MAX = 4;
export const PLOT_VIEWER_LINE_WIDTH_STEP = 0.5;

export const PLOT_VIEWER_DEFAULT_LINE_WIDTH = SPECTRUM_TRACE_LINE_WIDTH;

export const PLOT_VIEWER_DEFAULT_MARKER_SIZE = 5;

export const PLOT_VIEWER_LINE_WIDTH_PRESETS = {
  thin: 1,
  medium: SPECTRUM_TRACE_LINE_WIDTH,
  thick: 2.5,
} as const;

export type PlotViewerLineWidthPreset = keyof typeof PLOT_VIEWER_LINE_WIDTH_PRESETS;

export const PLOT_VIEWER_LINE_WIDTH_PRESET_OPTIONS: readonly {
  id: PlotViewerLineWidthPreset;
  label: string;
  width: number;
}[] = [
  { id: "thin", label: "Thin", width: PLOT_VIEWER_LINE_WIDTH_PRESETS.thin },
  { id: "medium", label: "Medium", width: PLOT_VIEWER_LINE_WIDTH_PRESETS.medium },
  { id: "thick", label: "Thick", width: PLOT_VIEWER_LINE_WIDTH_PRESETS.thick },
];

export type PlotViewerResolvedTraceStyle = {
  color: string;
  lineDash: PlotViewerLineDash;
  markerSymbol: PlotViewerMarkerSymbol;
  lineWidth: number;
  markerEvery: number | undefined;
  markerSize: number;
};

const STYLE_MAPPING_FIELD_SET = new Set<PlotViewerStyleMappingField>(
  PLOT_VIEWER_STYLE_MAPPING_FIELD_OPTIONS.map((option) => option.id),
);

const LINE_STYLE_BY_SET = new Set<PlotViewerLineStyleBy>(
  PLOT_VIEWER_LINE_STYLE_BY_OPTIONS.map((option) => option.id),
);

function sortedUniqueFieldValues(
  rows: readonly Record<PlotViewerDescriptorField, string>[],
  field: PlotViewerDescriptorField,
): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    seen.add(row[field]);
  }
  return [...seen].sort((left, right) => left.localeCompare(right));
}

function indexMap(values: readonly string[]): Map<string, number> {
  const map = new Map<string, number>();
  values.forEach((value, index) => {
    map.set(value, index);
  });
  return map;
}

export type PlotViewerStyleContext = {
  colorValueOrder: Map<string, number>;
  colorValueCount: number;
  lineValueOrder: Map<string, number>;
  markerValueOrder: Map<string, number>;
};

/**
 * Builds stable value-index maps for palette color, line dash, and marker encodings.
 */
export function buildPlotViewerStyleContext(params: {
  descriptorRows: readonly Record<PlotViewerDescriptorField, string>[];
  colorBy: PlotViewerStyleMappingField;
  lineStyleBy: PlotViewerLineStyleBy;
  markerBy: PlotViewerStyleMappingField;
}): PlotViewerStyleContext {
  const colorValues = sortedUniqueFieldValues(
    params.descriptorRows,
    params.colorBy,
  );
  const lineValues =
    params.lineStyleBy === "none"
      ? []
      : sortedUniqueFieldValues(params.descriptorRows, params.lineStyleBy);
  const markerValues = sortedUniqueFieldValues(
    params.descriptorRows,
    params.markerBy,
  );
  return {
    colorValueOrder: indexMap(colorValues),
    colorValueCount: Math.max(1, colorValues.length),
    lineValueOrder: indexMap(lineValues),
    markerValueOrder: indexMap(markerValues),
  };
}

/**
 * Returns true when `value` is a supported style-mapping field id.
 */
export function isPlotViewerStyleMappingField(
  value: string,
): value is PlotViewerStyleMappingField {
  return STYLE_MAPPING_FIELD_SET.has(value as PlotViewerStyleMappingField);
}

/**
 * Returns true when `value` is a supported line-style encoding field or `none`.
 */
export function isPlotViewerLineStyleBy(
  value: string,
): value is PlotViewerLineStyleBy {
  return LINE_STYLE_BY_SET.has(value as PlotViewerLineStyleBy);
}

function resolveEncodedColor(params: {
  descriptors: Record<PlotViewerDescriptorField, string>;
  colorBy: PlotViewerStyleMappingField;
  styleContext: PlotViewerStyleContext;
  paletteId: PlotViewerPaletteId;
  isDark: boolean;
}): string {
  const colorFieldValue = params.descriptors[params.colorBy];
  const colorIndex =
    params.styleContext.colorValueOrder.get(colorFieldValue) ?? 0;
  return pickPlotViewerPaletteColor({
    paletteId: params.paletteId,
    isDark: params.isDark,
    valueIndex: colorIndex,
    valueCount: params.styleContext.colorValueCount,
  });
}

function resolveEncodedLineDash(params: {
  descriptors: Record<PlotViewerDescriptorField, string>;
  lineStyleBy: PlotViewerLineStyleBy;
  styleContext: PlotViewerStyleContext;
  lineDashOverrides?: Readonly<Record<string, PlotViewerLineDash>>;
}): PlotViewerLineDash {
  if (params.lineStyleBy === "none") {
    return "solid";
  }
  const lineFieldValue = params.descriptors[params.lineStyleBy];
  const overrideDash = params.lineDashOverrides?.[lineFieldValue];
  if (overrideDash) {
    return overrideDash;
  }
  const lineIndex =
    params.styleContext.lineValueOrder.get(lineFieldValue) ?? 0;
  return (
    PLOT_VIEWER_LINE_DASH_CYCLE[
      lineIndex % PLOT_VIEWER_LINE_DASH_CYCLE.length
    ] ?? "solid"
  );
}

function resolveEncodedMarker(params: {
  descriptors: Record<PlotViewerDescriptorField, string>;
  markerBy: PlotViewerStyleMappingField;
  styleContext: PlotViewerStyleContext;
  markerOverrides?: Readonly<Record<string, PlotViewerMarkerSymbol>>;
}): PlotViewerMarkerSymbol {
  const markerFieldValue = params.descriptors[params.markerBy];
  const overrideMarker = params.markerOverrides?.[markerFieldValue];
  if (overrideMarker) {
    return overrideMarker;
  }
  const markerIndex =
    params.styleContext.markerValueOrder.get(markerFieldValue) ?? 0;
  return (
    PLOT_VIEWER_MARKER_CYCLE[
      markerIndex % PLOT_VIEWER_MARKER_CYCLE.length
    ] ?? "circle"
  );
}

function experimentColorModeFor(
  experimentColorMode: Readonly<Record<string, PlotViewerExperimentColorMode>> | undefined,
  experimentId: string,
  legacyColorOverride: string | undefined,
): PlotViewerExperimentColorMode {
  const mode = experimentColorMode?.[experimentId];
  if (mode) {
    return mode;
  }
  if (legacyColorOverride) {
    return "fixed";
  }
  return "scheme";
}

/**
 * Resolves stroke color, dash, marker, width, and decimation for one dashboard plot trace using
 * seaborn-style encodings plus optional session overrides (trace > experiment > encoding).
 */
export function resolvePlotViewerTraceStyle(params: {
  traceKey?: string;
  descriptors: Record<PlotViewerDescriptorField, string>;
  experimentId: string;
  colorBy: PlotViewerStyleMappingField;
  lineStyleBy: PlotViewerLineStyleBy;
  markerBy: PlotViewerStyleMappingField;
  styleContext: PlotViewerStyleContext;
  paletteId: PlotViewerPaletteId;
  isDark: boolean;
  colorOverrides?: Readonly<Record<string, string>>;
  experimentColorMode?: Readonly<Record<string, PlotViewerExperimentColorMode>>;
  experimentFixedColor?: Readonly<Record<string, string>>;
  lineDashOverrides?: Readonly<Record<string, PlotViewerLineDash>>;
  markerOverrides?: Readonly<Record<string, PlotViewerMarkerSymbol>>;
  experimentLineDashOverrides?: Readonly<Record<string, PlotViewerLineDash>>;
  experimentLineWidthOverrides?: Readonly<Record<string, number>>;
  experimentMarkerOverrides?: Readonly<Record<string, PlotViewerMarkerSymbol>>;
  experimentMarkerSizeOverrides?: Readonly<Record<string, number>>;
  experimentMarkerEveryOverrides?: Readonly<Record<string, number>>;
  traceOverrides?: Readonly<Record<string, PlotViewerTraceStyleOverride>>;
}): PlotViewerResolvedTraceStyle {
  const legacyColorOverride = params.colorOverrides?.[params.experimentId]?.trim();
  const colorMode = experimentColorModeFor(
    params.experimentColorMode,
    params.experimentId,
    legacyColorOverride,
  );
  const encodedColor = resolveEncodedColor(params);
  const experimentFixed =
    params.experimentFixedColor?.[params.experimentId]?.trim() ??
    legacyColorOverride;
  const traceOverride =
    params.traceKey != null ? params.traceOverrides?.[params.traceKey] : undefined;

  let color = encodedColor;
  if (colorMode === "fixed" && experimentFixed) {
    color = experimentFixed;
  }
  if (traceOverride?.color) {
    color = traceOverride.color;
  }

  let lineDash = resolveEncodedLineDash(params);
  const experimentLineDash =
    params.experimentLineDashOverrides?.[params.experimentId];
  if (traceOverride?.lineDash) {
    lineDash = traceOverride.lineDash;
  } else if (experimentLineDash) {
    lineDash = experimentLineDash;
  }

  let markerSymbol = resolveEncodedMarker(params);
  const experimentMarker =
    params.experimentMarkerOverrides?.[params.experimentId];
  if (traceOverride?.marker) {
    markerSymbol = traceOverride.marker;
  } else if (experimentMarker) {
    markerSymbol = experimentMarker;
  }

  let lineWidth = PLOT_VIEWER_DEFAULT_LINE_WIDTH;
  const experimentLineWidth =
    params.experimentLineWidthOverrides?.[params.experimentId];
  if (traceOverride?.lineWidth != null) {
    lineWidth = traceOverride.lineWidth;
  } else if (experimentLineWidth != null) {
    lineWidth = experimentLineWidth;
  }

  let markerSize = PLOT_VIEWER_DEFAULT_MARKER_SIZE;
  const experimentMarkerSize =
    params.experimentMarkerSizeOverrides?.[params.experimentId];
  if (traceOverride?.markerSize != null) {
    markerSize = traceOverride.markerSize;
  } else if (experimentMarkerSize != null) {
    markerSize = experimentMarkerSize;
  }

  let markerEvery: number | undefined;
  const experimentMarkerEvery =
    params.experimentMarkerEveryOverrides?.[params.experimentId];
  if (traceOverride?.markerEvery != null) {
    markerEvery = traceOverride.markerEvery;
  } else if (experimentMarkerEvery != null) {
    markerEvery = experimentMarkerEvery;
  }

  return {
    color,
    lineDash,
    markerSymbol,
    lineWidth,
    markerEvery,
    markerSize,
  };
}
