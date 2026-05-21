import type { SpectrumPoint, SpectrumYAxisQuantity } from "~/components/plots/types";
import {
  numberDensityFromMassDensity,
  opticalDeltaToRealAsf,
  refractiveBetaToImaginaryAsf,
} from "~/features/kk-calc/kkcalc-conversions";
import { DEFAULT_KK_MASS_DENSITY_G_CM3 } from "~/features/kk-calc/compute-delta-from-beta-kkcalc-style";
import {
  formulaMassFromComposition,
  parseChemicalFormula,
} from "~/features/kk-calc/kkcalc-stoichiometry";

/** Spectroscopy tray channels (uploaded or normalized experimental traces). */
export type NexafsSpectroscopyChannelId = "raw" | "normalized" | "mass-absorption";

/** Imaginary optical-constant tray channels. */
export type NexafsImaginaryChannelId = "beta" | "f2" | "im-epsilon" | "im-chi";

/** Real optical-constant tray channels. */
export type NexafsRealChannelId = "delta" | "f1" | "re-epsilon" | "re-chi";

/** Active plot channel across all trays. */
export type NexafsPlotChannelId =
  | NexafsSpectroscopyChannelId
  | NexafsImaginaryChannelId
  | NexafsRealChannelId;

export type NexafsPlotChannelGroupId = "spectroscopy" | "imaginary" | "real";

export interface NexafsPlotChannelDefinition {
  readonly id: NexafsPlotChannelId;
  readonly group: NexafsPlotChannelGroupId;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly yAxisQuantity: SpectrumYAxisQuantity;
  readonly requiresFormula?: boolean;
}

export const NEXAFS_PLOT_CHANNEL_DEFINITIONS: readonly NexafsPlotChannelDefinition[] =
  [
    {
      id: "raw",
      group: "spectroscopy",
      label: "Raw upload",
      shortLabel: "Raw",
      description: "Uploaded absorption signal before normalization (rawabs).",
      yAxisQuantity: "raw-upload",
    },
    {
      id: "normalized",
      group: "spectroscopy",
      label: "0–1 normalized",
      shortLabel: "0–1",
      description: "Stored optical density or edge-normalized 0–1 trace.",
      yAxisQuantity: "optical-density",
    },
    {
      id: "mass-absorption",
      group: "spectroscopy",
      label: "Mass absorption",
      shortLabel: "μ",
      description: "Stored mass absorption coefficient (μ).",
      yAxisQuantity: "mass-absorption",
    },
    {
      id: "beta",
      group: "imaginary",
      label: "Beta",
      shortLabel: "β",
      description: "Stored imaginary refractive index β.",
      yAxisQuantity: "beta",
    },
    {
      id: "f2",
      group: "imaginary",
      label: "f₂",
      shortLabel: "f₂",
      description:
        "Imaginary atomic scattering factor from stored β and stoichiometry (1 g/cm³).",
      yAxisQuantity: "scattering-f2",
      requiresFormula: true,
    },
    {
      id: "im-epsilon",
      group: "imaginary",
      label: "Im(ε)",
      shortLabel: "Im ε",
      description:
        "Imaginary part of dielectric permittivity from stored β and δ.",
      yAxisQuantity: "permittivity-im",
      requiresFormula: true,
    },
    {
      id: "im-chi",
      group: "imaginary",
      label: "Im(χ)",
      shortLabel: "Im χ",
      description:
        "Imaginary susceptibility χ = n² − 1 with n = 1 − δ + iβ: Im(χ) = 2β(1 − δ).",
      yAxisQuantity: "susceptibility-im",
      requiresFormula: true,
    },
    {
      id: "delta",
      group: "real",
      label: "Delta",
      shortLabel: "δ",
      description: "Stored real refractive decrement δ.",
      yAxisQuantity: "delta",
    },
    {
      id: "f1",
      group: "real",
      label: "f₁",
      shortLabel: "f₁",
      description:
        "Real atomic scattering factor from stored δ and stoichiometry (1 g/cm³).",
      yAxisQuantity: "scattering-f1",
      requiresFormula: true,
    },
    {
      id: "re-epsilon",
      group: "real",
      label: "Re(ε)",
      shortLabel: "Re ε",
      description: "Real part of dielectric permittivity from stored β and δ.",
      yAxisQuantity: "permittivity-re",
      requiresFormula: true,
    },
    {
      id: "re-chi",
      group: "real",
      label: "Re(χ)",
      shortLabel: "Re χ",
      description:
        "Real susceptibility χ = n² − 1 with n = 1 − δ + iβ: Re(χ) = (1 − δ)² − β² − 1.",
      yAxisQuantity: "susceptibility-re",
      requiresFormula: true,
    },
  ];

const CHANNEL_BY_ID = new Map(
  NEXAFS_PLOT_CHANNEL_DEFINITIONS.map((d) => [d.id, d] as const),
);

export const NEXAFS_CHANNELS_BY_GROUP: Record<
  NexafsPlotChannelGroupId,
  readonly NexafsPlotChannelDefinition[]
> = {
  spectroscopy: NEXAFS_PLOT_CHANNEL_DEFINITIONS.filter(
    (d) => d.group === "spectroscopy",
  ),
  imaginary: NEXAFS_PLOT_CHANNEL_DEFINITIONS.filter(
    (d) => d.group === "imaginary",
  ),
  real: NEXAFS_PLOT_CHANNEL_DEFINITIONS.filter((d) => d.group === "real"),
};

/** Maps an imaginary tray channel to its real partner when link mode is enabled. */
export const LINKED_IMAGINARY_TO_REAL: Record<
  NexafsImaginaryChannelId,
  NexafsRealChannelId
> = {
  beta: "delta",
  f2: "f1",
  "im-epsilon": "re-epsilon",
  "im-chi": "re-chi",
};

export function getPlotChannelDefinition(
  id: NexafsPlotChannelId,
): NexafsPlotChannelDefinition {
  const def = CHANNEL_BY_ID.get(id);
  if (!def) {
    throw new RangeError(`Unknown plot channel: ${id}`);
  }
  return def;
}

export function plotChannelGroup(
  id: NexafsPlotChannelId,
): NexafsPlotChannelGroupId {
  return getPlotChannelDefinition(id).group;
}

export function isImaginaryChannel(
  id: NexafsPlotChannelId,
): id is NexafsImaginaryChannelId {
  return plotChannelGroup(id) === "imaginary";
}

export function isRealChannel(id: NexafsPlotChannelId): id is NexafsRealChannelId {
  return plotChannelGroup(id) === "real";
}

export interface NexafsPlotChannelAvailability {
  readonly raw: boolean;
  readonly normalized: boolean;
  readonly massAbsorption: boolean;
  readonly beta: boolean;
  readonly delta: boolean;
  readonly derivedOptical: boolean;
}

/**
 * Reports which plot channels have enough persisted spectrum data to render.
 *
 * @param spectrumPoints Rows mapped from the database for one experiment.
 * @param hasChemicalFormula When false, derived f/ε/χ channels stay unavailable.
 */
export function assessPlotChannelAvailability(
  spectrumPoints: readonly SpectrumPoint[],
  hasChemicalFormula: boolean,
): NexafsPlotChannelAvailability {
  const hasRaw = spectrumPoints.some(
    (p) => typeof p.rawabs === "number" && Number.isFinite(p.rawabs),
  );
  const hasOd = spectrumPoints.some(
    (p) => typeof p.od === "number" && Number.isFinite(p.od),
  );
  const hasMu = spectrumPoints.some(
    (p) =>
      (typeof p.massabsorption === "number" &&
        Number.isFinite(p.massabsorption)) ||
      (typeof p.absorption === "number" && Number.isFinite(p.absorption)),
  );
  const hasBeta = spectrumPoints.some(
    (p) => typeof p.beta === "number" && Number.isFinite(p.beta),
  );
  const hasDelta = spectrumPoints.some(
    (p) => typeof p.delta === "number" && Number.isFinite(p.delta),
  );
  const derivedOptical = hasChemicalFormula && hasBeta && hasDelta;
  return {
    raw: hasRaw,
    normalized: hasOd,
    massAbsorption: hasMu,
    beta: hasBeta,
    delta: hasDelta,
    derivedOptical,
  };
}

export function isPlotChannelAvailable(
  id: NexafsPlotChannelId,
  availability: NexafsPlotChannelAvailability,
): boolean {
  switch (id) {
    case "raw":
      return availability.raw;
    case "normalized":
      return availability.normalized;
    case "mass-absorption":
      return availability.massAbsorption;
    case "beta":
      return availability.beta;
    case "delta":
      return availability.delta;
    case "f2":
    case "f1":
    case "im-epsilon":
    case "re-epsilon":
    case "im-chi":
    case "re-chi":
      return availability.derivedOptical;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

function mapRows(
  rows: readonly SpectrumPoint[],
  pick: (p: SpectrumPoint) => number | undefined,
): SpectrumPoint[] | null {
  const out: SpectrumPoint[] = [];
  for (const p of rows) {
    const y = pick(p);
    if (typeof y === "number" && Number.isFinite(y)) {
      out.push({ ...p, absorption: y });
    }
  }
  return out.length > 0 ? out : null;
}

function resolveNumberDensity(formula: string): number | null {
  try {
    const composition = parseChemicalFormula(formula.trim());
    const mass = formulaMassFromComposition(composition);
    return numberDensityFromMassDensity(DEFAULT_KK_MASS_DENSITY_G_CM3, mass);
  } catch {
    return null;
  }
}

type DerivedOpticalChannelId =
  | "f2"
  | "f1"
  | "im-epsilon"
  | "re-epsilon"
  | "im-chi"
  | "re-chi";

function deriveOpticalConstantRows(
  rows: readonly SpectrumPoint[],
  formula: string,
  channel: DerivedOpticalChannelId,
): SpectrumPoint[] | null {
  const paired: Array<{ point: SpectrumPoint; beta: number; delta: number }> =
    [];
  for (const p of rows) {
    if (
      typeof p.beta === "number" &&
      Number.isFinite(p.beta) &&
      typeof p.delta === "number" &&
      Number.isFinite(p.delta)
    ) {
      paired.push({ point: p, beta: p.beta, delta: p.delta });
    }
  }
  if (paired.length === 0) {
    return null;
  }
  const nd = resolveNumberDensity(formula);
  if (nd == null) {
    return null;
  }

  if (
    channel === "im-epsilon" ||
    channel === "re-epsilon" ||
    channel === "im-chi" ||
    channel === "re-chi"
  ) {
    return paired.map(({ point, beta, delta }) => {
      const reN = 1 - delta;
      const imN = beta;
      const reEps = reN * reN - imN * imN;
      const imEps = 2 * reN * imN;
      const y =
        channel === "im-epsilon" || channel === "im-chi"
          ? imEps
          : channel === "re-epsilon"
            ? reEps
            : reEps - 1;
      return { ...point, absorption: y };
    });
  }

  const energies = paired.map((x) => x.point.energy);
  const betas = paired.map((x) => x.beta);
  const deltas = paired.map((x) => x.delta);

  if (channel === "f2") {
    const f2 = refractiveBetaToImaginaryAsf(energies, betas, nd);
    return paired.map(({ point }, i) => ({
      ...point,
      absorption: f2[i]!,
    }));
  }

  const f1 = opticalDeltaToRealAsf(energies, deltas, nd);
  return paired.map(({ point }, i) => ({
    ...point,
    absorption: f1[i]!,
  }));
}

/**
 * Builds plot-ready points for a channel from persisted spectrum rows.
 *
 * @param channel Active tray selection.
 * @param spectrumPoints Full experiment points from the database mapper.
 * @param stoichiometryFormula Chemical formula for derived f/ε/χ channels; omit when unknown.
 */
export function buildPlotPointsForChannel(
  channel: NexafsPlotChannelId,
  spectrumPoints: readonly SpectrumPoint[],
  stoichiometryFormula?: string | null,
): SpectrumPoint[] {
  const formula = stoichiometryFormula?.trim() ?? "";

  switch (channel) {
    case "raw":
      return (
        mapRows(spectrumPoints, (p) =>
          typeof p.rawabs === "number" ? p.rawabs : undefined,
        ) ?? []
      );
    case "normalized":
      return (
        mapRows(spectrumPoints, (p) =>
          typeof p.od === "number" ? p.od : undefined,
        ) ?? []
      );
    case "mass-absorption":
      return (
        mapRows(spectrumPoints, (p) => {
          if (
            typeof p.massabsorption === "number" &&
            Number.isFinite(p.massabsorption)
          ) {
            return p.massabsorption;
          }
          return typeof p.absorption === "number" ? p.absorption : undefined;
        }) ?? []
      );
    case "beta":
      return (
        mapRows(spectrumPoints, (p) =>
          typeof p.beta === "number" ? p.beta : undefined,
        ) ?? []
      );
    case "delta":
      return (
        mapRows(spectrumPoints, (p) =>
          typeof p.delta === "number" ? p.delta : undefined,
        ) ?? []
      );
    case "f2":
    case "f1":
    case "im-epsilon":
    case "re-epsilon":
    case "im-chi":
    case "re-chi":
      if (!formula) {
        return [];
      }
      return deriveOpticalConstantRows(spectrumPoints, formula, channel) ?? [];
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

/**
 * Resolves the y-axis quantity for the primary trace from the active channel.
 */
export function spectrumYAxisQuantityForChannel(
  channel: NexafsPlotChannelId,
): SpectrumYAxisQuantity {
  return getPlotChannelDefinition(channel).yAxisQuantity;
}

/** First available channel in a tray, used when the active selection becomes invalid. */
export function defaultChannelForGroup(
  group: NexafsPlotChannelGroupId,
  availability: NexafsPlotChannelAvailability,
): NexafsPlotChannelId | null {
  for (const def of NEXAFS_CHANNELS_BY_GROUP[group]) {
    if (isPlotChannelAvailable(def.id, availability)) {
      return def.id;
    }
  }
  return null;
}

/** Legacy browse data view ids for bare-atom and normalization code paths. */
export type NexafsBrowseDataView = "od" | "absorption" | "beta" | "delta";

export function plotChannelToLegacyDataView(
  channel: NexafsPlotChannelId,
): NexafsBrowseDataView {
  switch (channel) {
    case "raw":
    case "normalized":
      return "od";
    case "mass-absorption":
      return "absorption";
    case "beta":
    case "f2":
    case "im-epsilon":
    case "im-chi":
      return "beta";
    case "delta":
    case "f1":
    case "re-epsilon":
    case "re-chi":
      return "delta";
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

export function legacyDataViewToPlotChannel(
  view: NexafsBrowseDataView,
): NexafsPlotChannelId {
  switch (view) {
    case "od":
      return "normalized";
    case "absorption":
      return "mass-absorption";
    case "beta":
      return "beta";
    case "delta":
      return "delta";
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}
