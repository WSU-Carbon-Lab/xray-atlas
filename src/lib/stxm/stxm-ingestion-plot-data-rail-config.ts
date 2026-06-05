import {
  assertGlyphLength,
  type PlotDataRailDefinition,
} from "~/components/plots/data-rail";
import type { SpectrumYAxisQuantity } from "~/components/plots/types";
import type { StxmIngestionPlotChannel } from "./stxm-ingestion-display";

export type StxmIngestionPlotTrayId =
  | "signal"
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
  signal: {
    trayGlyph: "Rw",
    trayLabel: "Raw signal",
    trayDescription:
      "Per-region mean detector counts: izero (I0), sample transmission, or 1/I0.",
    defaultChannelId: "signal_i0",
  },
  spectroscopy: {
    trayGlyph: "OD",
    trayLabel: "Spectroscopy",
    trayDescription:
      "Beer-Lambert OD, edge-normalized OD, mass absorption, or bare-atom reference.",
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
    trayDescription: "Delta, atomic f1 (KK delta), from the reduced pipeline.",
    defaultChannelId: "delta",
  },
};

const CHANNEL_GLYPH: Record<StxmIngestionPlotChannel, string> = {
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
  bare_atom: "At",
};

const CHANNEL_Y_AXIS: Record<StxmIngestionPlotChannel, SpectrumYAxisQuantity> = {
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
  bare_atom: "mass-absorption",
};

const CHANNEL_TRAY: Record<StxmIngestionPlotChannel, StxmIngestionPlotTrayId> =
  {
    signal_i0: "signal",
    signal_sample: "signal",
    signal_inv_i0: "signal",
    od: "spectroscopy",
    od_normalized: "spectroscopy",
    mass_absorption: "spectroscopy",
    bare_atom: "spectroscopy",
    beta: "imaginary",
    chi: "imaginary",
    delta: "real",
    f1: "real",
  };

const CHANNEL_COPY: Record<
  StxmIngestionPlotChannel,
  { label: string; description: string }
> = {
  signal_i0: {
    label: "I0",
    description: "Mean izero-region detector signal versus energy.",
  },
  signal_sample: {
    label: "Sample transmission",
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
  bare_atom: {
    label: "Bare atom",
    description: "Tabulated bare-atom mass absorption reference.",
  },
};

for (const [id, glyph] of Object.entries(CHANNEL_GLYPH)) {
  assertGlyphLength(glyph, `STXM ingestion channel ${id}`);
}
for (const meta of Object.values(TRAY_META)) {
  assertGlyphLength(meta.trayGlyph, "STXM ingestion tray");
}

/** Vertical data-view rail layout for STXM ingestion (four trays, eleven channels). */
export const STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION: PlotDataRailDefinition<
  StxmIngestionPlotChannel,
  StxmIngestionPlotTrayId
> = {
  trays: (
    ["signal", "spectroscopy", "imaginary", "real"] as const
  ).map((id) => ({
    id,
    trayGlyph: TRAY_META[id].trayGlyph,
    trayLabel: TRAY_META[id].trayLabel,
    trayDescription: TRAY_META[id].trayDescription,
    defaultChannelId: TRAY_META[id].defaultChannelId,
  })),
  channels: (
    Object.keys(CHANNEL_GLYPH) as StxmIngestionPlotChannel[]
  ).map((id) => ({
    id,
    trayId: CHANNEL_TRAY[id],
    glyph: CHANNEL_GLYPH[id],
    label: CHANNEL_COPY[id].label,
    description: CHANNEL_COPY[id].description,
    yAxisQuantity: CHANNEL_Y_AXIS[id],
  })),
};
