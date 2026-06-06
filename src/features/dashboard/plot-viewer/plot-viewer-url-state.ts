import type { NexafsPlotChannelId } from "~/features/process-nexafs/nexafs-plot-channels";

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

export type PlotViewerUrlState = {
  query: string;
  datasets: string[];
  channel: PlotViewerChannelId;
  facets: PlotViewerFacetSelection;
  geometryKeys: string[];
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
  };
}

function parseCsvParam(raw: string | null): string[] {
  if (!raw) {
    return [];
  }
  return raw.split(",").map((part) => part.trim()).filter(Boolean);
}

function isPlotViewerChannel(value: string): value is PlotViewerChannelId {
  return (PLOT_VIEWER_CHANNEL_IDS as readonly string[]).includes(value);
}

/**
 * Parses dashboard plot viewer shareable URL search params.
 */
export function readPlotViewerParams(
  searchParams: URLSearchParams,
): PlotViewerUrlState {
  const channelRaw = searchParams.get("channel") ?? "normalized";
  const channel = isPlotViewerChannel(channelRaw) ? channelRaw : "normalized";
  return {
    query: searchParams.get("q") ?? "",
    datasets: parseCsvParam(searchParams.get("datasets")),
    channel,
    facets: {
      edge: parseCsvParam(searchParams.get("edge")),
      mol: parseCsvParam(searchParams.get("mol")),
      instrument: parseCsvParam(searchParams.get("instrument")),
      facility: parseCsvParam(searchParams.get("facility")),
    },
    geometryKeys: parseCsvParam(searchParams.get("geom")),
  };
}

/**
 * Writes plot viewer state into `searchParams`, deleting keys when values are empty.
 */
export function writePlotViewerParams(
  searchParams: URLSearchParams,
  state: PlotViewerUrlState,
): void {
  if (state.query.trim()) {
    searchParams.set("q", state.query.trim());
  } else {
    searchParams.delete("q");
  }

  if (state.datasets.length > 0) {
    searchParams.set("datasets", state.datasets.join(","));
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
