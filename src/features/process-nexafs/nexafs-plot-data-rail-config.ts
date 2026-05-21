import {
  assertGlyphLength,
  type PlotDataRailDefinition,
} from "~/components/plots/data-rail";
import type { SpectrumYAxisQuantity } from "~/components/plots/types";
import {
  NEXAFS_PLOT_CHANNEL_DEFINITIONS,
  type NexafsPlotChannelGroupId,
  type NexafsPlotChannelId,
} from "./nexafs-plot-channels";

const TRAY_META: Record<
  NexafsPlotChannelGroupId,
  {
    trayGlyph: string;
    trayLabel: string;
    trayDescription: string;
  }
> = {
  spectroscopy: {
    trayGlyph: "Rw",
    trayLabel: "Spectroscopy",
    trayDescription:
      "Uploaded signal, edge-normalized 0–1 trace, or mass absorption μ.",
  },
  imaginary: {
    trayGlyph: "β",
    trayLabel: "Imaginary optical constants",
    trayDescription: "β, atomic f₂, Im(ε), and Im(χ) from stored spectrum data.",
  },
  real: {
    trayGlyph: "δ",
    trayLabel: "Real optical constants",
    trayDescription: "δ, atomic f₁, Re(ε), and Re(χ) from stored spectrum data.",
  },
};

const CHANNEL_GLYPH: Record<NexafsPlotChannelId, string> = {
  raw: "Rw",
  normalized: "01",
  "mass-absorption": "μ",
  beta: "β",
  f2: "f₂",
  "im-epsilon": "εᵢ",
  "im-chi": "χᵢ",
  delta: "δ",
  f1: "f₁",
  "re-epsilon": "εᵣ",
  "re-chi": "χᵣ",
};

const CHANNEL_Y_AXIS: Record<NexafsPlotChannelId, SpectrumYAxisQuantity> = {
  raw: "raw-upload",
  normalized: "optical-density",
  "mass-absorption": "mass-absorption",
  beta: "beta",
  f2: "scattering-f2",
  "im-epsilon": "permittivity-im",
  "im-chi": "susceptibility-im",
  delta: "delta",
  f1: "scattering-f1",
  "re-epsilon": "permittivity-re",
  "re-chi": "susceptibility-re",
};

for (const [id, glyph] of Object.entries(CHANNEL_GLYPH)) {
  assertGlyphLength(glyph, `NEXAFS channel ${id}`);
}
for (const meta of Object.values(TRAY_META)) {
  assertGlyphLength(meta.trayGlyph, "NEXAFS tray");
}

/** Rail layout for NEXAFS browse/contribute spectrum plots (three trays, eleven channels). */
export const NEXAFS_PLOT_DATA_RAIL_DEFINITION: PlotDataRailDefinition<
  NexafsPlotChannelId,
  NexafsPlotChannelGroupId
> = {
  trays: (
    ["spectroscopy", "imaginary", "real"] as const
  ).map((id) => ({
    id,
    ...TRAY_META[id],
    defaultChannelId:
      id === "spectroscopy"
        ? ("raw" as const)
        : id === "imaginary"
          ? ("beta" as const)
          : ("delta" as const),
  })),
  channels: NEXAFS_PLOT_CHANNEL_DEFINITIONS.map((def) => ({
    id: def.id,
    trayId: def.group,
    glyph: CHANNEL_GLYPH[def.id],
    label: def.label,
    description: def.description,
    yAxisQuantity: CHANNEL_Y_AXIS[def.id],
  })),
};

export const NEXAFS_IMAGINARY_REAL_LINK_ID = "imaginary-real";
