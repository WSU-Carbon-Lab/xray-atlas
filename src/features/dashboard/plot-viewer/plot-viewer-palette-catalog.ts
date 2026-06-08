import {
  SEQUENTIAL_SCALES,
  SPECTRUM_TRACE_GRADIENT_DARK,
  SPECTRUM_TRACE_GRADIENT_LIGHT,
  spectrumTraceColorAlongGradient,
} from "~/components/plots/constants";

export type PlotViewerPaletteKind = "qualitative" | "sequential";

export type PlotViewerPaletteId =
  | "tab10"
  | "spectrum"
  | "set2"
  | "paired"
  | "viridis"
  | "plasma"
  | "mako"
  | "rocket"
  | "sequential-blue";

const TAB10_STOPS = [
  "#1F77B4",
  "#FF7F0E",
  "#2CA02C",
  "#D62728",
  "#9467BD",
  "#8C564B",
  "#E377C2",
  "#7F7F7F",
  "#BCBD22",
  "#17BECF",
] as const;

const SET2_STOPS = [
  "#66C2A5",
  "#FC8D62",
  "#8DA0CB",
  "#E78AC3",
  "#A6D854",
  "#FFD92F",
  "#E5C494",
  "#B3B3B3",
] as const;

const PAIRED_STOPS = [
  "#A6CEE3",
  "#1F78B4",
  "#B2DF8A",
  "#33A02C",
  "#FB9A99",
  "#E31A1C",
  "#FDBF6F",
  "#FF7F00",
  "#CAB2D6",
  "#6A3D9A",
  "#FFFF99",
  "#B15928",
] as const;

const VIRIDIS_STOPS = [
  "#440154",
  "#414487",
  "#2A788E",
  "#22A884",
  "#7AD151",
  "#FDE725",
] as const;

const PLASMA_STOPS = [
  "#0D0887",
  "#6A00A8",
  "#B12A90",
  "#E16462",
  "#FCA636",
  "#F0F921",
] as const;

const MAKO_STOPS = [
  "#0B0405",
  "#2C1154",
  "#51167E",
  "#7B2382",
  "#A8367D",
  "#D04D6A",
  "#F2775F",
  "#FCAE91",
] as const;

const ROCKET_STOPS = [
  "#03051A",
  "#2B0B3F",
  "#57106E",
  "#8C2981",
  "#C03A7E",
  "#EB5760",
  "#F8945D",
  "#FDCA9B",
] as const;

export type PlotViewerPaletteCatalogEntry = {
  id: PlotViewerPaletteId;
  label: string;
  mplName: string;
  kind: PlotViewerPaletteKind;
  previewStops: readonly string[];
  resolveStops: (isDark: boolean) => readonly string[];
};

export const PLOT_VIEWER_PALETTE_CATALOG: readonly PlotViewerPaletteCatalogEntry[] =
  [
    {
      id: "tab10",
      label: "Tab10",
      mplName: "tab10",
      kind: "qualitative",
      previewStops: TAB10_STOPS,
      resolveStops: () => TAB10_STOPS,
    },
    {
      id: "spectrum",
      label: "Spectrum",
      mplName: "spectrum",
      kind: "sequential",
      previewStops: SPECTRUM_TRACE_GRADIENT_LIGHT,
      resolveStops: (isDark) =>
        isDark ? SPECTRUM_TRACE_GRADIENT_DARK : SPECTRUM_TRACE_GRADIENT_LIGHT,
    },
    {
      id: "set2",
      label: "Set2",
      mplName: "Set2",
      kind: "qualitative",
      previewStops: SET2_STOPS,
      resolveStops: () => SET2_STOPS,
    },
    {
      id: "paired",
      label: "Paired",
      mplName: "Paired",
      kind: "qualitative",
      previewStops: PAIRED_STOPS,
      resolveStops: () => PAIRED_STOPS,
    },
    {
      id: "viridis",
      label: "Viridis",
      mplName: "viridis",
      kind: "sequential",
      previewStops: VIRIDIS_STOPS,
      resolveStops: () => VIRIDIS_STOPS,
    },
    {
      id: "plasma",
      label: "Plasma",
      mplName: "plasma",
      kind: "sequential",
      previewStops: PLASMA_STOPS,
      resolveStops: () => PLASMA_STOPS,
    },
    {
      id: "mako",
      label: "Mako",
      mplName: "mako",
      kind: "sequential",
      previewStops: MAKO_STOPS,
      resolveStops: () => MAKO_STOPS,
    },
    {
      id: "rocket",
      label: "Rocket",
      mplName: "rocket",
      kind: "sequential",
      previewStops: ROCKET_STOPS,
      resolveStops: () => ROCKET_STOPS,
    },
    {
      id: "sequential-blue",
      label: "Sequential blue",
      mplName: "Blues",
      kind: "sequential",
      previewStops: SEQUENTIAL_SCALES.blue,
      resolveStops: () => SEQUENTIAL_SCALES.blue,
    },
  ];

const PALETTE_ID_SET = new Set<string>(
  PLOT_VIEWER_PALETTE_CATALOG.map((entry) => entry.id),
);

const PALETTE_BY_ID = new Map(
  PLOT_VIEWER_PALETTE_CATALOG.map((entry) => [entry.id, entry]),
);

export const PLOT_VIEWER_PALETTE_IDS = PLOT_VIEWER_PALETTE_CATALOG.map(
  (entry) => entry.id,
) as readonly PlotViewerPaletteId[];

export const PLOT_VIEWER_PALETTE_OPTIONS = PLOT_VIEWER_PALETTE_CATALOG.map(
  (entry) => ({ id: entry.id, label: entry.label }),
);

/**
 * Returns true when `value` is a supported plot-viewer palette id.
 */
export function isPlotViewerPaletteId(
  value: string,
): value is PlotViewerPaletteId {
  return PALETTE_ID_SET.has(value);
}

/**
 * Looks up catalog metadata for a palette id; falls back to spectrum when unknown.
 */
export function plotViewerPaletteEntry(
  paletteId: PlotViewerPaletteId,
): PlotViewerPaletteCatalogEntry {
  return PALETTE_BY_ID.get(paletteId) ?? PALETTE_BY_ID.get("spectrum")!;
}

/**
 * Picks one trace color from a palette for a stable value index and total category count.
 */
export function pickPlotViewerPaletteColor(params: {
  paletteId: PlotViewerPaletteId;
  isDark: boolean;
  valueIndex: number;
  valueCount: number;
}): string {
  const entry = plotViewerPaletteEntry(params.paletteId);
  const stops = entry.resolveStops(params.isDark);
  if (stops.length === 0) {
    return "#888888";
  }
  if (entry.kind === "qualitative") {
    const clampedIndex =
      ((params.valueIndex % stops.length) + stops.length) % stops.length;
    return stops[clampedIndex]!;
  }
  return spectrumTraceColorAlongGradient(
    stops,
    params.valueIndex,
    params.valueCount,
  );
}
