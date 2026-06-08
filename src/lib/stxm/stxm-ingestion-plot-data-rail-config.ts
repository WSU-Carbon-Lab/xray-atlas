import {
  assertGlyphLength,
  type PlotDataRailDefinition,
} from "~/components/plots/data-rail";
import type { SpectrumYAxisQuantity } from "~/components/plots/types";
import type { StxmIngestionPlotChannel } from "./stxm-ingestion-display";

export type StxmIngestionPlotTrayId = "spectroscopy" | "imaginary" | "real";

const TRAY_META: Record<
  StxmIngestionPlotTrayId,
  {
    trayGlyph: string;
    trayLabel: string;
    trayDescription: string;
    defaultChannelId: StxmIngestionPlotChannel;
  }
> = {
  spectroscopy: {
    trayGlyph: "Rw",
    trayLabel: "Raw spectroscopy",
    trayDescription:
      "Incident, transmitted, and TEY drain intensities plus Beer-Lambert OD, normalized OD, and mass absorption.",
    defaultChannelId: "signal_i0",
  },
  imaginary: {
    trayGlyph: "β",
    trayLabel: "Imaginary optical constants",
    trayDescription: "β, atomic f₂, Im(ε), and Im(χ) from reduced spectrum data.",
    defaultChannelId: "beta",
  },
  real: {
    trayGlyph: "δ",
    trayLabel: "Real optical constants",
    trayDescription: "δ, atomic f₁, Re(ε), and Re(χ) from reduced spectrum data.",
    defaultChannelId: "delta",
  },
};

const RAIL_CHANNEL_IDS = [
  "signal_i0",
  "signal_it",
  "signal_ie",
  "od",
  "od_normalized",
  "mass_absorption",
  "beta",
  "f2",
  "im-epsilon",
  "im-chi",
  "delta",
  "f1",
  "re-epsilon",
  "re-chi",
] as const satisfies readonly StxmIngestionPlotChannel[];

const CHANNEL_GLYPH: Record<(typeof RAIL_CHANNEL_IDS)[number], string> = {
  signal_i0: "I₀",
  signal_it: "Iₜ",
  signal_ie: "Iₑ",
  od: "Rw",
  od_normalized: "01",
  mass_absorption: "μ",
  beta: "β",
  f2: "f₂",
  "im-epsilon": "εᵢ",
  "im-chi": "χᵢ",
  delta: "δ",
  f1: "f₁",
  "re-epsilon": "εᵣ",
  "re-chi": "χᵣ",
};

const CHANNEL_Y_AXIS: Record<
  (typeof RAIL_CHANNEL_IDS)[number],
  SpectrumYAxisQuantity
> = {
  signal_i0: "intensity",
  signal_it: "intensity",
  signal_ie: "intensity",
  od: "optical-density",
  od_normalized: "optical-density",
  mass_absorption: "mass-absorption",
  beta: "beta",
  f2: "scattering-f2",
  "im-epsilon": "permittivity-im",
  "im-chi": "susceptibility-im",
  delta: "delta",
  f1: "scattering-f1",
  "re-epsilon": "permittivity-re",
  "re-chi": "susceptibility-re",
};

const CHANNEL_TRAY: Record<
  (typeof RAIL_CHANNEL_IDS)[number],
  StxmIngestionPlotTrayId
> = {
  signal_i0: "spectroscopy",
  signal_it: "spectroscopy",
  signal_ie: "spectroscopy",
  od: "spectroscopy",
  od_normalized: "spectroscopy",
  mass_absorption: "spectroscopy",
  beta: "imaginary",
  f2: "imaginary",
  "im-epsilon": "imaginary",
  "im-chi": "imaginary",
  delta: "real",
  f1: "real",
  "re-epsilon": "real",
  "re-chi": "real",
};

const CHANNEL_COPY: Record<
  (typeof RAIL_CHANNEL_IDS)[number],
  { label: string; description: string }
> = {
  signal_i0: {
    label: "I0",
    description: "Summed izero-region incident transmission versus energy.",
  },
  signal_it: {
    label: "It",
    description: "Summed pure/sample-region transmitted intensity through the film.",
  },
  signal_ie: {
    label: "Ie",
    description:
      "TEY drain-current intensity when the scan header exposes a monitor column; otherwise unavailable.",
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
  f2: {
    label: "f₂",
    description:
      "Imaginary atomic scattering factor from stored beta and stoichiometry (1 g/cm³).",
  },
  "im-epsilon": {
    label: "Im(ε)",
    description: "Imaginary part of dielectric permittivity from stored beta and delta.",
  },
  "im-chi": {
    label: "Im(χ)",
    description:
      "Imaginary susceptibility χ = n² − 1 with n = 1 − δ + iβ: Im(χ) = 2β(1 − δ).",
  },
  delta: {
    label: "Delta",
    description: "Real refractive index decrement delta from KK reduction.",
  },
  f1: {
    label: "f₁",
    description:
      "Real atomic scattering factor from stored delta and stoichiometry (1 g/cm³).",
  },
  "re-epsilon": {
    label: "Re(ε)",
    description: "Real part of dielectric permittivity from stored beta and delta.",
  },
  "re-chi": {
    label: "Re(χ)",
    description:
      "Real susceptibility χ = n² − 1 with n = 1 − δ + iβ: Re(χ) = (1 − δ)² − β² − 1.",
  },
};

for (const [id, glyph] of Object.entries(CHANNEL_GLYPH)) {
  assertGlyphLength(glyph, `STXM ingestion channel ${id}`);
}
for (const meta of Object.values(TRAY_META)) {
  assertGlyphLength(meta.trayGlyph, "STXM ingestion tray");
}

/** Vertical data-view rail layout for STXM ingestion (NEXAFS-aligned three trays). */
export const STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION: PlotDataRailDefinition<
  StxmIngestionPlotChannel,
  StxmIngestionPlotTrayId
> = {
  trays: (["spectroscopy", "imaginary", "real"] as const).map((id) => ({
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

/** All channel ids in the unified raw spectroscopy tray popover. */
export const STXM_RAW_SPECTROSCOPY_TRAY_CHANNEL_IDS = RAIL_CHANNEL_IDS.filter(
  (id) => CHANNEL_TRAY[id] === "spectroscopy",
);
