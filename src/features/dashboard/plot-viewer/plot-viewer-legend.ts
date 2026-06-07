import {
  linkedOpticalAngleColumnTitle,
  type SpectrumGeometryAngleSplit,
} from "~/components/plots/spectrum/spectrum-geometry-legend-angle";
import {
  plotViewerThetaPhiColumnTitle,
  resolvePlotViewerAngleSplit,
} from "./format-plot-viewer-geometry-label";
import type { PlotViewerLineDash, PlotViewerMarkerSymbol } from "./plot-viewer-trace-styles";

export type PlotViewerDescriptorField =
  | "theta"
  | "phi"
  | "thetaPhi"
  | "region"
  | "instrument"
  | "facility"
  | "edge"
  | "molecule"
  | "experiment";

/** @deprecated Use PlotViewerDescriptorField and descriptorFields URL state instead. */
export type PlotViewerIdentifierField = Extract<
  PlotViewerDescriptorField,
  "molecule" | "edge" | "instrument" | "facility"
>;

export const DEFAULT_PLOT_VIEWER_DESCRIPTOR_FIELDS: readonly PlotViewerDescriptorField[] =
  ["theta", "phi", "instrument"];

export const PLOT_VIEWER_DESCRIPTOR_OPTIONS: readonly {
  id: PlotViewerDescriptorField;
  label: string;
  columnTitle: string;
}[] = [
  { id: "thetaPhi", label: "θ / φ", columnTitle: "θ / φ" },
  { id: "theta", label: "θ", columnTitle: "θ" },
  { id: "phi", label: "φ", columnTitle: "φ" },
  { id: "region", label: "Region", columnTitle: "Region" },
  { id: "instrument", label: "Instrument", columnTitle: "Instrument" },
  { id: "facility", label: "Facility", columnTitle: "Facility" },
  { id: "edge", label: "Edge", columnTitle: "Edge" },
  { id: "molecule", label: "Molecule", columnTitle: "Molecule" },
  { id: "experiment", label: "Experiment ID", columnTitle: "Experiment" },
];

/** @deprecated Use PLOT_VIEWER_DESCRIPTOR_OPTIONS. */
export const PLOT_VIEWER_IDENTIFIER_OPTIONS = PLOT_VIEWER_DESCRIPTOR_OPTIONS.filter(
  (option): option is {
    id: PlotViewerIdentifierField;
    label: string;
    columnTitle: string;
  } =>
    option.id === "molecule" ||
    option.id === "edge" ||
    option.id === "instrument" ||
    option.id === "facility",
);

export type PlotViewerLegendSwatch = {
  color: string;
  lineDash: PlotViewerLineDash;
  markerSymbol?: PlotViewerMarkerSymbol;
};

export type PlotViewerLegendTraceInput = {
  traceKey: string;
  geometryKey: string;
  geometrySortKey: string;
  datasetOrder: number;
  channelGlyph: string;
  descriptors: Record<PlotViewerDescriptorField, string>;
  color: string;
  lineDash: PlotViewerLineDash;
  markerSymbol?: PlotViewerMarkerSymbol;
};

export type PlotViewerLegendRow = {
  traceKey: string;
  channelLabel: string;
  swatch: PlotViewerLegendSwatch;
  values: Partial<Record<PlotViewerDescriptorField, string>>;
  geometryKey: string;
};

const PLOT_VIEWER_DESCRIPTOR_FIELD_SET = new Set<PlotViewerDescriptorField>(
  PLOT_VIEWER_DESCRIPTOR_OPTIONS.map((option) => option.id),
);

/**
 * Returns true when `value` is a supported plot-viewer legend descriptor field id.
 */
export function isPlotViewerDescriptorField(
  value: string,
): value is PlotViewerDescriptorField {
  return PLOT_VIEWER_DESCRIPTOR_FIELD_SET.has(value as PlotViewerDescriptorField);
}

/**
 * Normalizes descriptor field ids from URL or UI input, dropping unknown tokens and
 * falling back to {@link DEFAULT_PLOT_VIEWER_DESCRIPTOR_FIELDS} when the list is empty.
 */
/**
 * Expands legacy `thetaPhi` into separate θ and φ columns, then drops angle columns
 * that are fixed across all active trace geometry keys.
 */
export function resolvePlotViewerLegendDescriptorFields(
  descriptorFields: readonly PlotViewerDescriptorField[],
  geometryKeys: readonly string[],
): PlotViewerDescriptorField[] {
  const base =
    descriptorFields.length > 0
      ? descriptorFields
      : [...DEFAULT_PLOT_VIEWER_DESCRIPTOR_FIELDS];

  const expanded: PlotViewerDescriptorField[] = [];
  for (const field of base) {
    if (field === "thetaPhi") {
      expanded.push("theta", "phi");
      continue;
    }
    expanded.push(field);
  }

  const seen = new Set<PlotViewerDescriptorField>();
  const deduped: PlotViewerDescriptorField[] = [];
  for (const field of expanded) {
    if (seen.has(field)) {
      continue;
    }
    seen.add(field);
    deduped.push(field);
  }

  const split = resolvePlotViewerAngleSplit(geometryKeys);
  return deduped.filter((field) => {
    if (field === "theta" && split.singleTheta) {
      return false;
    }
    if (field === "phi" && split.singlePhi) {
      return false;
    }
    return true;
  });
}

export function normalizePlotViewerDescriptorFields(
  raw: readonly string[],
): PlotViewerDescriptorField[] {
  const seen = new Set<PlotViewerDescriptorField>();
  const normalized: PlotViewerDescriptorField[] = [];
  for (const token of raw) {
    if (!isPlotViewerDescriptorField(token) || seen.has(token)) {
      continue;
    }
    seen.add(token);
    normalized.push(token);
  }
  return normalized.length > 0
    ? normalized
    : [...DEFAULT_PLOT_VIEWER_DESCRIPTOR_FIELDS];
}

/**
 * Returns true when two descriptor field lists match in order and length.
 */
export function plotViewerDescriptorFieldsEqual(
  left: readonly PlotViewerDescriptorField[],
  right: readonly PlotViewerDescriptorField[],
): boolean {
  return (
    left.length === right.length && left.every((field, index) => field === right[index])
  );
}

/**
 * Builds legend table rows grouped by incident-angle geometry, preserving dataset
 * order within each geometry block and projecting the requested descriptor columns.
 */
export function buildPlotViewerLegendRows(
  traces: readonly PlotViewerLegendTraceInput[],
  descriptorFields: readonly PlotViewerDescriptorField[],
): PlotViewerLegendRow[] {
  if (traces.length === 0) {
    return [];
  }

  const activeFields =
    descriptorFields.length > 0
      ? descriptorFields
      : [...DEFAULT_PLOT_VIEWER_DESCRIPTOR_FIELDS];

  const geometryOrder = [...new Set(traces.map((trace) => trace.geometryKey))].sort(
    (leftKey, rightKey) => {
      const leftSort =
        traces.find((trace) => trace.geometryKey === leftKey)?.geometrySortKey ??
        leftKey;
      const rightSort =
        traces.find((trace) => trace.geometryKey === rightKey)?.geometrySortKey ??
        rightKey;
      return leftSort.localeCompare(rightSort);
    },
  );

  const rows: PlotViewerLegendRow[] = [];
  for (const geometryKey of geometryOrder) {
    const group = traces
      .filter((trace) => trace.geometryKey === geometryKey)
      .slice()
      .sort((left, right) => left.datasetOrder - right.datasetOrder);
    for (const trace of group) {
      const values: Partial<Record<PlotViewerDescriptorField, string>> = {};
      for (const field of activeFields) {
        values[field] = trace.descriptors[field];
      }
      rows.push({
        traceKey: trace.traceKey,
        channelLabel: trace.channelGlyph,
        swatch: {
          color: trace.color,
          lineDash: trace.lineDash,
          markerSymbol: trace.markerSymbol,
        },
        values,
        geometryKey,
      });
    }
  }
  return rows;
}

/**
 * Builds the in-plot legend row label from active descriptor columns (channel glyph is separate).
 */
export function plotViewerLegendRowSpotLabel(
  row: PlotViewerLegendRow,
  descriptorFields: readonly PlotViewerDescriptorField[],
): string {
  const activeFields =
    descriptorFields.length > 0
      ? descriptorFields
      : [...DEFAULT_PLOT_VIEWER_DESCRIPTOR_FIELDS];
  const parts: string[] = [];
  for (const field of activeFields) {
    const value = row.values[field];
    if (value && value.trim().length > 0) {
      parts.push(value);
    }
  }
  if (parts.length > 0) {
    return parts.join(" · ");
  }
  return row.traceKey;
}

/**
 * Counts legend table columns: one channel column plus each active descriptor column.
 */
export function plotViewerLegendColumnCount(
  descriptorFields: readonly PlotViewerDescriptorField[],
): number {
  const descriptorCount =
    descriptorFields.length > 0
      ? descriptorFields.length
      : DEFAULT_PLOT_VIEWER_DESCRIPTOR_FIELDS.length;
  return 1 + descriptorCount;
}

export type PlotViewerDescriptorColumnTitleOptions = {
  geometryKeys?: readonly string[];
  angleSplit?: SpectrumGeometryAngleSplit;
};

/**
 * Resolves the legend column title for a descriptor field, using θ-only or φ-only
 * headings when polarization is fixed across the active traces.
 */
export function plotViewerDescriptorColumnTitle(
  field: PlotViewerDescriptorField,
  options?: PlotViewerDescriptorColumnTitleOptions,
): string {
  if (field === "thetaPhi") {
    if (options?.geometryKeys && options.geometryKeys.length > 0) {
      return plotViewerThetaPhiColumnTitle(options.geometryKeys);
    }
    if (options?.angleSplit) {
      return linkedOpticalAngleColumnTitle(false, false, options.angleSplit);
    }
  }
  return (
    PLOT_VIEWER_DESCRIPTOR_OPTIONS.find((option) => option.id === field)
      ?.columnTitle ?? field
  );
}

/**
 * Collects geometry keys from legend rows for θ / φ column title resolution.
 */
export function plotViewerLegendGeometryKeys(
  rows: readonly PlotViewerLegendRow[],
): string[] {
  return [...new Set(rows.map((row) => row.geometryKey))];
}

/** @deprecated Use plotViewerDescriptorColumnTitle. */
export function plotViewerLegendIdentifierColumnTitle(
  identifierField: PlotViewerIdentifierField,
): string {
  return plotViewerDescriptorColumnTitle(identifierField);
}
