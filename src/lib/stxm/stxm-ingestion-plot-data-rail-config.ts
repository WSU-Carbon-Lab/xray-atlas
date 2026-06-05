import {
  assertGlyphLength,
  type PlotDataRailDefinition,
} from "~/components/plots/data-rail";
import type { SpectrumYAxisQuantity } from "~/components/plots/types";
import type { StxmIngestionPlotChannel } from "./stxm-ingestion-display";

export type StxmIngestionPlotTrayId =
  | "i0_signal"
  | "spectroscopy"
  | "imaginary"
  | "real";

const TRAY_META: Record<
  StxmIngestionPlotTrayId,
  {
    trayGlyph: string;
    trayLabel: string;
    trayDescription: string;
    defaultChannelId: StxmIngestionPlotChannel;
  }
> = {
  i0_signal: {
    trayGlyph: "I0",
    trayLabel: "I0 signal",
    trayDescription:
      "Per-region mean detector counts: izero (I0), sample transmission, or 1/I0.",
    defaultChannelId: "signal_i0",
  },
  spectroscopy: {
    trayGlyph: "Rw",
    trayLabel: "Spectroscopy",
    trayDescription:
      "Beer-Lambert optical density, edge-normalized OD, or mass absorption.",
    defaultChannelId: "od",
  },
  imaginary: {
    trayGlyph: "β",
    trayLabel: "Imaginary optical constants",
    trayDescription: "Beta and chi (beta proxy) from the reduced pipeline.",
    defaultChannelId: "beta",
  },
  real: {
    trayGlyph: "δ",
    trayLabel: "Real optical constants",
    trayDescription: "Delta and atomic f1 (KK delta) from the reduced pipeline.",
    defaultChannelId: "delta",
  },
};

const RAIL_CHANNEL_IDS = [
  "signal_i0",
  "signal_sample",
  "signal_inv_i0",
  "od",
  "od_normalized",
  "mass_absorption",
  "beta",
  "delta",
  "f1",
  "chi",
] as const satisfies readonly StxmIngestionPlotChannel[];

const CHANNEL_GLYPH: Record<(typeof RAIL_CHANNEL_IDS)[number], string> = {
  signal_i0: "I0",
  signal_sample: "Sm",
  signal_inv_i0: "/I",
  od: "OD",
  od_normalized: "01",
  mass_absorption: "μ",
  beta: "β",
  delta: "δ",
  f1: "f₁",
  chi: "χ",
};

const CHANNEL_Y_AXIS: Record<
  (typeof RAIL_CHANNEL_IDS)[number],
  SpectrumYAxisQuantity
> = {
  signal_i0: "intensity",
  signal_sample: "intensity",
  signal_inv_i0: "intensity",
  od: "optical-density",
  od_normalized: "optical-density",
  mass_absorption: "mass-absorption",
  beta: "beta",
  delta: "delta",
  f1: "scattering-f1",
  chi: "beta",
};

const CHANNEL_TRAY: Record<
  (typeof RAIL_CHANNEL_IDS)[number],
  StxmIngestionPlotTrayId
> = {
  signal_i0: "i0_signal",
  signal_sample: "i0_signal",
  signal_inv_i0: "i0_signal",
  od: "spectroscopy",
  od_normalized: "spectroscopy",
  mass_absorption: "spectroscopy",
  beta: "imaginary",
  chi: "imaginary",
  delta: "real",
  f1: "real",
};

const CHANNEL_COPY: Record<
  (typeof RAIL_CHANNEL_IDS)[number],
  { label: string; description: string }
> = {
  signal_i0: {
    label: "I0",
    description: "Mean izero-region detector signal versus energy.",
  },
  signal_sample: {
    label: "Sample",
    description: "Mean sample-region detector signal versus energy.",
  },
  signal_inv_i0: {
    label: "1/I0",
    description: "Reciprocal izero mean signal (log-friendly raw view).",
  },
  od: {
    label: "OD",
    description: "Natural-log izero/sample ratio (Beer-Lambert OD).",
  },
  od_normalized: {
    label: "Norm OD",
    description: "OD scaled to pre-edge zero and post-edge one.",
  },
  mass_absorption: {
    label: "Mass abs",
    description: "Mass absorption coefficient from thickness and formula.",
  },
  beta: {
    label: "Beta",
    description: "Imaginary refractive index beta from KK reduction.",
  },
  delta: {
    label: "Delta",
    description: "Real refractive index delta from KK reduction.",
  },
  f1: {
    label: "f1",
    description: "Atomic f1 scattering factor (KK delta proxy).",
  },
  chi: {
    label: "chi",
    description: "Susceptibility chi proxy from stored beta.",
  },
};

for (const [id, glyph] of Object.entries(CHANNEL_GLYPH)) {
  assertGlyphLength(glyph, `STXM ingestion channel ${id}`);
}
for (const meta of Object.values(TRAY_META)) {
  assertGlyphLength(meta.trayGlyph, "STXM ingestion tray");
}

/** Vertical data-view rail layout for STXM ingestion (I0, spectroscopy Rw, beta, delta trays). */
export const STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION: PlotDataRailDefinition<
  StxmIngestionPlotChannel,
  StxmIngestionPlotTrayId
> = {
  trays: (
    ["i0_signal", "spectroscopy", "imaginary", "real"] as const
  ).map((id) => ({
    id,
    trayGlyph: TRAY_META[id].trayGlyph,
    trayLabel: TRAY_META[id].trayLabel,
    trayDescription: TRAY_META[id].trayDescription,
    defaultChannelId: TRAY_META[id].defaultChannelId,
  })),
  channels: RAIL_CHANNEL_IDS.map((id) => ({
    id,
    trayId: CHANNEL_TRAY[id],
    glyph: CHANNEL_GLYPH[id],
    label: CHANNEL_COPY[id].label,
    description: CHANNEL_COPY[id].description,
    yAxisQuantity: CHANNEL_Y_AXIS[id],
  })),
};
