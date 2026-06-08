import { z } from "zod";
import type { NexafsPlotChannelId } from "~/features/process-nexafs/nexafs-plot-channels";
import { parsePlotViewerHiddenTraceIds } from "./plot-viewer-hidden-traces";
import {
  DEFAULT_PLOT_VIEWER_DESCRIPTOR_FIELDS,
  isPlotViewerDescriptorField,
  normalizePlotViewerDescriptorFields,
  plotViewerDescriptorFieldsEqual,
  type PlotViewerDescriptorField,
} from "./plot-viewer-legend";
import {
  isPlotViewerPaletteId,
  type PlotViewerPaletteId,
} from "./plot-viewer-palette-catalog";
import {
  DEFAULT_PLOT_VIEWER_COLOR_BY,
  DEFAULT_PLOT_VIEWER_LINE_STYLE_BY,
  DEFAULT_PLOT_VIEWER_MARKER_BY,
  isPlotViewerLineStyleBy,
  isPlotViewerStyleMappingField,
  type PlotViewerLineStyleBy,
  type PlotViewerStyleMappingField,
} from "./plot-viewer-trace-styles";

/** Maximum shareable compare datasets encoded in the plot viewer URL. */
export const PLOT_VIEWER_MAX_DATASETS = 25;

/** Maximum catalog search string length accepted from plot viewer URL state. */
export const PLOT_VIEWER_MAX_QUERY_LENGTH = 200;

/** Maximum hidden trace keys encoded in the plot viewer URL. */
export const PLOT_VIEWER_MAX_HIDDEN_TRACE_IDS = 100;

/** Maximum values per catalog facet dimension in the plot viewer URL. */
export const PLOT_VIEWER_MAX_FACET_VALUES = 30;

/** Maximum geometry keys encoded in the plot viewer URL. */
export const PLOT_VIEWER_MAX_GEOMETRY_KEYS = 50;

const plotViewerExperimentIdSchema = z.string().uuid();

const PLOT_VIEWER_CHANNEL_IDS = [
  "raw",
  "normalized",
  "mass-absorption",
  "beta",
  "delta",
] as const satisfies readonly NexafsPlotChannelId[];

export type PlotViewerChannelId = (typeof PLOT_VIEWER_CHANNEL_IDS)[number];

export type PlotViewerFacetSelection = {
  edge: string[];
  mol: string[];
  instrument: string[];
  facility: string[];
};

export type PlotViewerViewMode = "overlay" | "subplots";

export type PlotViewerLegendPlacement = "inplot" | "panel";

export type PlotViewerLegendDock = "top" | "bottom" | "left" | "right";

export type PlotViewerUrlState = {
  query: string;
  datasets: string[];
  channel: PlotViewerChannelId;
  facets: PlotViewerFacetSelection;
  geometryKeys: string[];
  panelOpen: boolean;
  viewMode: PlotViewerViewMode;
  descriptorFields: PlotViewerDescriptorField[];
  paletteId: PlotViewerPaletteId;
  colorBy: PlotViewerStyleMappingField;
  lineStyleBy: PlotViewerLineStyleBy;
  markerBy: PlotViewerStyleMappingField;
  legendPlacement: PlotViewerLegendPlacement;
  legendDock: PlotViewerLegendDock;
  legendTrayOpen: boolean;
  hiddenTraceIds: string[];
};

export function emptyPlotViewerFacets(): PlotViewerFacetSelection {
  return { edge: [], mol: [], instrument: [], facility: [] };
}

export function defaultPlotViewerUrlState(): PlotViewerUrlState {
  return {
    query: "",
    datasets: [],
    channel: "normalized",
    facets: emptyPlotViewerFacets(),
    geometryKeys: [],
    panelOpen: true,
    viewMode: "overlay",
    descriptorFields: [...DEFAULT_PLOT_VIEWER_DESCRIPTOR_FIELDS],
    paletteId: "spectrum",
    colorBy: DEFAULT_PLOT_VIEWER_COLOR_BY,
    lineStyleBy: DEFAULT_PLOT_VIEWER_LINE_STYLE_BY,
    markerBy: DEFAULT_PLOT_VIEWER_MARKER_BY,
    legendPlacement: "panel",
    legendDock: "right",
    legendTrayOpen: true,
    hiddenTraceIds: [],
  };
}

function parseCsvParam(raw: string | null, maxCount?: number): string[] {
  if (!raw) {
    return [];
  }
  const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
  if (maxCount == null) {
    return parts;
  }
  return parts.slice(0, maxCount);
}

/**
 * Normalizes experiment ids for plot viewer state: valid UUIDs only, deduped, capped at
 * {@link PLOT_VIEWER_MAX_DATASETS}.
 */
export function normalizePlotViewerDatasetIds(
  experimentIds: readonly string[],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of experimentIds) {
    const trimmed = raw.trim();
    if (!plotViewerExperimentIdSchema.safeParse(trimmed).success) {
      continue;
    }
    if (seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= PLOT_VIEWER_MAX_DATASETS) {
      break;
    }
  }
  return result;
}

function capPlotViewerQuery(raw: string): string {
  return raw.slice(0, PLOT_VIEWER_MAX_QUERY_LENGTH);
}

function isPlotViewerChannel(value: string): value is PlotViewerChannelId {
  return (PLOT_VIEWER_CHANNEL_IDS as readonly string[]).includes(value);
}

function isPlotViewerViewMode(value: string): value is PlotViewerViewMode {
  return value === "overlay" || value === "subplots";
}

function isPlotViewerLegendPlacement(
  value: string,
): value is PlotViewerLegendPlacement {
  return value === "inplot" || value === "panel";
}

/**
 * Parses legend placement from `legendPlacement` or legacy `legendPlace` URL keys.
 */
export function parsePlotViewerLegendPlacement(
  searchParams: URLSearchParams,
): PlotViewerLegendPlacement {
  const placementRaw = searchParams.get("legendPlacement");
  if (placementRaw && isPlotViewerLegendPlacement(placementRaw)) {
    return placementRaw;
  }
  const legacyRaw = searchParams.get("legendPlace");
  if (legacyRaw === "in") {
    return "inplot";
  }
  if (legacyRaw === "out") {
    return "panel";
  }
  if (legacyRaw && isPlotViewerLegendPlacement(legacyRaw)) {
    return legacyRaw;
  }
  return "panel";
}

const PLOT_VIEWER_LEGEND_DOCKS = [
  "top",
  "bottom",
  "left",
  "right",
] as const satisfies readonly PlotViewerLegendDock[];

function isPlotViewerLegendDock(value: string): value is PlotViewerLegendDock {
  return (PLOT_VIEWER_LEGEND_DOCKS as readonly string[]).includes(value);
}

/**
 * Parses pop-out legend dock position from `legendDock` (default `right`).
 */
export function parsePlotViewerLegendDock(
  searchParams: URLSearchParams,
): PlotViewerLegendDock {
  const raw = searchParams.get("legendDock");
  if (raw && isPlotViewerLegendDock(raw)) {
    return raw;
  }
  return "right";
}

/**
 * Parses pop-out legend tray expansion from `legendTray` (`0` collapsed, default expanded).
 */
export function parsePlotViewerLegendTrayOpen(
  searchParams: URLSearchParams,
): boolean {
  const raw = searchParams.get("legendTray");
  if (raw === "0") {
    return false;
  }
  return true;
}

function parseDescriptorFields(searchParams: URLSearchParams): PlotViewerDescriptorField[] {
  const descRaw = searchParams.get("desc");
  if (descRaw) {
    return normalizePlotViewerDescriptorFields(parseCsvParam(descRaw));
  }

  const legacyLegendRaw = searchParams.get("legend");
  if (legacyLegendRaw && isPlotViewerDescriptorField(legacyLegendRaw)) {
    return normalizePlotViewerDescriptorFields([legacyLegendRaw]);
  }

  return [...DEFAULT_PLOT_VIEWER_DESCRIPTOR_FIELDS];
}

/**
 * Parses dashboard plot viewer shareable URL search params.
 */
export function readPlotViewerParams(
  searchParams: URLSearchParams,
): PlotViewerUrlState {
  const channelRaw = searchParams.get("channel") ?? "normalized";
  const channel = isPlotViewerChannel(channelRaw) ? channelRaw : "normalized";
  const panelRaw = searchParams.get("panel");
  const panelOpen = panelRaw !== "0";
  const layoutRaw = searchParams.get("layout") ?? "overlay";
  const viewMode = isPlotViewerViewMode(layoutRaw) ? layoutRaw : "overlay";
  const paletteRaw = searchParams.get("palette") ?? "spectrum";
  const paletteId = isPlotViewerPaletteId(paletteRaw)
    ? paletteRaw
    : "spectrum";
  const colorByRaw = searchParams.get("colorBy") ?? DEFAULT_PLOT_VIEWER_COLOR_BY;
  const colorBy = isPlotViewerStyleMappingField(colorByRaw)
    ? colorByRaw
    : DEFAULT_PLOT_VIEWER_COLOR_BY;
  const lineByRaw =
    searchParams.get("lineBy") ?? DEFAULT_PLOT_VIEWER_LINE_STYLE_BY;
  const lineStyleBy = isPlotViewerLineStyleBy(lineByRaw)
    ? lineByRaw
    : DEFAULT_PLOT_VIEWER_LINE_STYLE_BY;
  const markerByRaw =
    searchParams.get("markerBy") ?? DEFAULT_PLOT_VIEWER_MARKER_BY;
  const markerBy = isPlotViewerStyleMappingField(markerByRaw)
    ? markerByRaw
    : DEFAULT_PLOT_VIEWER_MARKER_BY;
  const legendPlacement = parsePlotViewerLegendPlacement(searchParams);
  const legendDock = parsePlotViewerLegendDock(searchParams);
  const legendTrayOpen = parsePlotViewerLegendTrayOpen(searchParams);
  const hiddenTraceIds = parsePlotViewerHiddenTraceIds(searchParams);

  return {
    query: capPlotViewerQuery(searchParams.get("q") ?? ""),
    datasets: normalizePlotViewerDatasetIds(
      parseCsvParam(searchParams.get("datasets"), PLOT_VIEWER_MAX_DATASETS),
    ),
    channel,
    facets: {
      edge: parseCsvParam(searchParams.get("edge"), PLOT_VIEWER_MAX_FACET_VALUES),
      mol: parseCsvParam(searchParams.get("mol"), PLOT_VIEWER_MAX_FACET_VALUES),
      instrument: parseCsvParam(
        searchParams.get("instrument"),
        PLOT_VIEWER_MAX_FACET_VALUES,
      ),
      facility: parseCsvParam(
        searchParams.get("facility"),
        PLOT_VIEWER_MAX_FACET_VALUES,
      ),
    },
    geometryKeys: parseCsvParam(
      searchParams.get("geom"),
      PLOT_VIEWER_MAX_GEOMETRY_KEYS,
    ),
    panelOpen,
    viewMode,
    descriptorFields: parseDescriptorFields(searchParams),
    paletteId,
    colorBy,
    lineStyleBy,
    markerBy,
    legendPlacement,
    legendDock,
    legendTrayOpen,
    hiddenTraceIds,
  };
}

/**
 * Writes plot viewer state into `searchParams`, deleting keys when values are empty.
 */
export function writePlotViewerParams(
  searchParams: URLSearchParams,
  state: PlotViewerUrlState,
): void {
  const query = capPlotViewerQuery(state.query.trim());
  if (query) {
    searchParams.set("q", query);
  } else {
    searchParams.delete("q");
  }

  const datasets = normalizePlotViewerDatasetIds(state.datasets);
  if (datasets.length > 0) {
    searchParams.set("datasets", datasets.join(","));
  } else {
    searchParams.delete("datasets");
  }

  if (state.channel !== "normalized") {
    searchParams.set("channel", state.channel);
  } else {
    searchParams.delete("channel");
  }

  const facetKeys = ["edge", "mol", "instrument", "facility"] as const;
  for (const key of facetKeys) {
    const values = state.facets[key];
    if (values.length > 0) {
      searchParams.set(key, values.join(","));
    } else {
      searchParams.delete(key);
    }
  }

  if (state.geometryKeys.length > 0) {
    searchParams.set("geom", state.geometryKeys.join(","));
  } else {
    searchParams.delete("geom");
  }

  if (!state.panelOpen) {
    searchParams.set("panel", "0");
  } else {
    searchParams.delete("panel");
  }

  if (state.viewMode !== "overlay") {
    searchParams.set("layout", state.viewMode);
  } else {
    searchParams.delete("layout");
  }

  if (
    !plotViewerDescriptorFieldsEqual(
      state.descriptorFields,
      DEFAULT_PLOT_VIEWER_DESCRIPTOR_FIELDS,
    )
  ) {
    searchParams.set("desc", state.descriptorFields.join(","));
  } else {
    searchParams.delete("desc");
  }
  searchParams.delete("legend");

  if (state.paletteId !== "spectrum") {
    searchParams.set("palette", state.paletteId);
  } else {
    searchParams.delete("palette");
  }

  if (state.colorBy !== DEFAULT_PLOT_VIEWER_COLOR_BY) {
    searchParams.set("colorBy", state.colorBy);
  } else {
    searchParams.delete("colorBy");
  }

  if (state.lineStyleBy !== DEFAULT_PLOT_VIEWER_LINE_STYLE_BY) {
    searchParams.set("lineBy", state.lineStyleBy);
  } else {
    searchParams.delete("lineBy");
  }

  if (state.markerBy !== DEFAULT_PLOT_VIEWER_MARKER_BY) {
    searchParams.set("markerBy", state.markerBy);
  } else {
    searchParams.delete("markerBy");
  }

  if (state.legendPlacement !== "panel") {
    searchParams.set("legendPlacement", state.legendPlacement);
  } else {
    searchParams.delete("legendPlacement");
  }

  if (state.legendDock !== "right") {
    searchParams.set("legendDock", state.legendDock);
  } else {
    searchParams.delete("legendDock");
  }

  if (!state.legendTrayOpen) {
    searchParams.set("legendTray", "0");
  } else {
    searchParams.delete("legendTray");
  }

  if (state.hiddenTraceIds.length > 0) {
    searchParams.set("hidden", state.hiddenTraceIds.join(","));
  } else {
    searchParams.delete("hidden");
  }
}

function stringArraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      return false;
    }
  }
  return true;
}

function plotViewerFacetSelectionsEqual(
  a: PlotViewerFacetSelection,
  b: PlotViewerFacetSelection,
): boolean {
  return (
    stringArraysEqual(a.edge, b.edge) &&
    stringArraysEqual(a.mol, b.mol) &&
    stringArraysEqual(a.instrument, b.instrument) &&
    stringArraysEqual(a.facility, b.facility)
  );
}

/**
 * Returns true when two plot viewer URL states serialize to the same shareable params.
 */
export function plotViewerUrlStatesEqual(
  a: PlotViewerUrlState,
  b: PlotViewerUrlState,
): boolean {
  return (
    a.query === b.query &&
    stringArraysEqual(a.datasets, b.datasets) &&
    a.channel === b.channel &&
    plotViewerFacetSelectionsEqual(a.facets, b.facets) &&
    stringArraysEqual(a.geometryKeys, b.geometryKeys) &&
    a.panelOpen === b.panelOpen &&
    a.viewMode === b.viewMode &&
    plotViewerDescriptorFieldsEqual(a.descriptorFields, b.descriptorFields) &&
    a.paletteId === b.paletteId &&
    a.colorBy === b.colorBy &&
    a.lineStyleBy === b.lineStyleBy &&
    a.markerBy === b.markerBy &&
    a.legendPlacement === b.legendPlacement &&
    a.legendDock === b.legendDock &&
    a.legendTrayOpen === b.legendTrayOpen &&
    stringArraysEqual(a.hiddenTraceIds, b.hiddenTraceIds)
  );
}

/**
 * Returns true when only style, legend, or hidden-trace URL fields differ between states.
 */
export function plotViewerStyleUrlSliceChanged(
  previous: PlotViewerUrlState,
  next: PlotViewerUrlState,
): boolean {
  return (
    !plotViewerDescriptorFieldsEqual(
      previous.descriptorFields,
      next.descriptorFields,
    ) ||
    previous.paletteId !== next.paletteId ||
    previous.colorBy !== next.colorBy ||
    previous.lineStyleBy !== next.lineStyleBy ||
    previous.markerBy !== next.markerBy ||
    previous.legendPlacement !== next.legendPlacement ||
    previous.legendDock !== next.legendDock ||
    previous.legendTrayOpen !== next.legendTrayOpen ||
    !stringArraysEqual(previous.hiddenTraceIds, next.hiddenTraceIds)
  );
}

/**
 * Returns true when catalog, layout, or geometry URL fields differ between states.
 */
export function plotViewerCoreUrlSliceChanged(
  previous: PlotViewerUrlState,
  next: PlotViewerUrlState,
): boolean {
  return (
    previous.query !== next.query ||
    !stringArraysEqual(previous.datasets, next.datasets) ||
    previous.channel !== next.channel ||
    !plotViewerFacetSelectionsEqual(previous.facets, next.facets) ||
    !stringArraysEqual(previous.geometryKeys, next.geometryKeys) ||
    previous.panelOpen !== next.panelOpen ||
    previous.viewMode !== next.viewMode
  );
}

export const PLOT_VIEWER_CHANNELS: readonly {
  id: PlotViewerChannelId;
  label: string;
}[] = [
  { id: "raw", label: "Raw upload" },
  { id: "normalized", label: "OD / 0-1" },
  { id: "mass-absorption", label: "Mass absorption" },
  { id: "beta", label: "Beta" },
  { id: "delta", label: "Delta" },
];
