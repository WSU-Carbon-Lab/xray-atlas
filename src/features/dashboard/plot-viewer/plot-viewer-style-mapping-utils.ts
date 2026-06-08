import type { PlotViewerDescriptorField } from "./plot-viewer-legend";
import type { PlotViewerCatalogMeta } from "./plot-viewer-styled-traces";
import type {
  PlotViewerLineStyleBy,
  PlotViewerStyleMappingField,
} from "./plot-viewer-trace-styles";
import type { PlotViewerStyleOverrideRow } from "./plot-viewer-style-mapping-chip";

function descriptorValueForExperiment(
  meta: PlotViewerCatalogMeta | undefined,
  experimentId: string,
  field: PlotViewerStyleMappingField,
): string {
  if (!meta) {
    return experimentId;
  }
  switch (field) {
    case "thetaPhi":
      return experimentId;
    case "instrument":
      return meta.instrumentName;
    case "facility":
      return meta.facilityName;
    case "edge":
      return meta.edgeLabel;
    case "molecule":
      return meta.moleculeName;
    case "experiment":
      return meta.experimentId.slice(0, 8);
    default: {
      const exhaustive: never = field;
      return exhaustive;
    }
  }
}

/**
 * Builds unique override rows for line-style or marker encodings from selected datasets.
 */
export function buildPlotViewerStyleOverrideRows(params: {
  experimentIds: readonly string[];
  catalogMetaByExperimentId: ReadonlyMap<string, PlotViewerCatalogMeta>;
  encodingField: PlotViewerStyleMappingField | PlotViewerLineStyleBy;
}): PlotViewerStyleOverrideRow[] {
  if (params.encodingField === "none") {
    return [];
  }
  const field = params.encodingField;
  const seen = new Map<string, string>();
  for (const experimentId of params.experimentIds) {
    const meta = params.catalogMetaByExperimentId.get(experimentId);
    const value =
      field === "thetaPhi"
        ? experimentId
        : descriptorValueForExperiment(meta, experimentId, field);
    if (!seen.has(value)) {
      const label =
        field === "experiment"
          ? (meta?.experimentId.slice(0, 8) ?? value)
          : value;
      seen.set(value, label);
    }
  }
  return [...seen.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([value, label]) => ({ value, label }));
}

/**
 * Builds override rows from rendered trace descriptor values (supports geometry-aware encodings).
 */
export function buildPlotViewerTraceOverrideRows(params: {
  traces: readonly {
    descriptors: Record<PlotViewerDescriptorField, string>;
  }[];
  encodingField: PlotViewerStyleMappingField;
}): PlotViewerStyleOverrideRow[] {
  const seen = new Map<string, string>();
  for (const trace of params.traces) {
    const value = trace.descriptors[params.encodingField];
    if (!seen.has(value)) {
      seen.set(value, value);
    }
  }
  return [...seen.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([value, label]) => ({ value, label }));
}
