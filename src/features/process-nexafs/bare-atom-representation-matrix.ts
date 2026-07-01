import type { ReferenceCurve } from "~/components/plots/types";
import {
  numberDensityFromMassDensity,
  opticalDeltaToRealAsf,
  refractiveBetaToImaginaryAsf,
} from "~/features/kk-calc/kkcalc-conversions";
import { DEFAULT_KK_MASS_DENSITY_G_CM3 } from "~/features/kk-calc/compute-delta-from-beta-kkcalc-style";
import { bareAtomBetaFromHenkeCompoundF2 } from "~/features/kk-calc/kkcalc-henke-f2";
import {
  formulaMassFromComposition,
  parseChemicalFormula,
} from "~/features/kk-calc/kkcalc-stoichiometry";
import { bareAtomReferenceStrokeColor } from "~/features/process-nexafs/bare-atom-reference-style";
import {
  calculateBareAtomAbsorption,
  calculateBareAtomDelta,
} from "~/features/process-nexafs/utils/bareAtomCalculation";
import type { BareAtomPoint } from "~/features/process-nexafs/types";
import {
  getPlotChannelDefinition,
  type NexafsImaginaryChannelId,
  type NexafsPlotChannelId,
  type NexafsRealChannelId,
} from "./nexafs-plot-channels";

export type BareAtomRepresentationPoint = {
  readonly energy: number;
  readonly absorption: number;
};

export type BareAtomRepresentationMatrix = {
  readonly formula: string;
  readonly channels: Partial<
    Record<NexafsPlotChannelId, readonly BareAtomRepresentationPoint[]>
  >;
};

export type BareAtomOverlayLinkRoles = {
  readonly imaginaryRole: NexafsImaginaryChannelId;
  readonly realRole: NexafsRealChannelId;
};

function gridFromEnergies(energies: readonly number[]): BareAtomPoint[] {
  return energies.map((energy) => ({ energy, absorption: 0 }));
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

function betaPointsFromHenkeBundle(
  formula: string,
  targetEnergyEv: readonly number[],
): readonly BareAtomRepresentationPoint[] {
  const composition = parseChemicalFormula(formula.trim());
  const betaValues = bareAtomBetaFromHenkeCompoundF2(
    composition,
    targetEnergyEv,
    DEFAULT_KK_MASS_DENSITY_G_CM3,
  );
  return targetEnergyEv.map((energy, i) => ({
    energy,
    absorption: betaValues[i]!,
  }));
}

function deriveEpsilonChi(
  beta: readonly BareAtomRepresentationPoint[],
  delta: readonly BareAtomRepresentationPoint[],
): {
  imEpsilon: BareAtomRepresentationPoint[];
  reEpsilon: BareAtomRepresentationPoint[];
  imChi: BareAtomRepresentationPoint[];
  reChi: BareAtomRepresentationPoint[];
} {
  const deltaByEnergy = new Map(delta.map((p) => [p.energy, p.absorption]));
  const imEpsilon: BareAtomRepresentationPoint[] = [];
  const reEpsilon: BareAtomRepresentationPoint[] = [];
  const imChi: BareAtomRepresentationPoint[] = [];
  const reChi: BareAtomRepresentationPoint[] = [];

  for (const b of beta) {
    const d = deltaByEnergy.get(b.energy);
    if (d == null || !Number.isFinite(d)) {
      continue;
    }
    const reN = 1 - d;
    const imN = b.absorption;
    imEpsilon.push({
      energy: b.energy,
      absorption: 2 * reN * imN,
    });
    reEpsilon.push({
      energy: b.energy,
      absorption: reN * reN - imN * imN,
    });
    imChi.push({ energy: b.energy, absorption: 2 * reN * imN });
    reChi.push({ energy: b.energy, absorption: reN * reN - imN * imN - 1 });
  }

  return { imEpsilon, reEpsilon, imChi, reChi };
}

function deriveF1F2(
  formula: string,
  beta: readonly BareAtomRepresentationPoint[],
  delta: readonly BareAtomRepresentationPoint[],
): {
  f2: BareAtomRepresentationPoint[];
  f1: BareAtomRepresentationPoint[];
} {
  const nd = resolveNumberDensity(formula);
  if (nd == null || beta.length === 0) {
    return { f2: [], f1: [] };
  }
  const energies = beta.map((p) => p.energy);
  const f2Arr = refractiveBetaToImaginaryAsf(
    energies,
    beta.map((p) => p.absorption),
    nd,
  );
  const f1Arr = opticalDeltaToRealAsf(
    energies,
    delta.map((p) => p.absorption),
    nd,
  );
  return {
    f2: energies.map((energy, i) => ({
      energy,
      absorption: f2Arr[i]!,
    })),
    f1: energies.map((energy, i) => ({
      energy,
      absorption: f1Arr[i]!,
    })),
  };
}

/**
 * Computes Henke/CXRO bare-atom curves for every optical-constant plot channel on a shared energy
 * grid so overlays can switch channels without refetching.
 *
 * @param formula Stoichiometry string for CXRO mixing.
 * @param targetEnergyEv Strictly ascending energies in eV (plot grid).
 */
export async function buildBareAtomRepresentationMatrix(
  formula: string,
  targetEnergyEv: readonly number[],
): Promise<BareAtomRepresentationMatrix | null> {
  const cleaned = formula.trim();
  if (!cleaned || targetEnergyEv.length < 2) {
    return null;
  }

  const grid = gridFromEnergies(targetEnergyEv);
  const [bareMu, bareDelta] = await Promise.all([
    calculateBareAtomAbsorption(cleaned, grid),
    calculateBareAtomDelta(cleaned, grid),
  ]);

  if (bareMu.length < 2 || bareDelta.length < 2) {
    return null;
  }

  const muPoints: BareAtomRepresentationPoint[] = bareMu.map((p) => ({
    energy: p.energy,
    absorption: p.absorption,
  }));
  const deltaPoints: BareAtomRepresentationPoint[] = bareDelta.map((p) => ({
    energy: p.energy,
    absorption: p.absorption,
  }));
  const betaPoints = betaPointsFromHenkeBundle(cleaned, targetEnergyEv);
  const { f2, f1 } = deriveF1F2(cleaned, betaPoints, deltaPoints);
  const { imEpsilon, reEpsilon, imChi, reChi } = deriveEpsilonChi(
    betaPoints,
    deltaPoints,
  );

  return {
    formula: cleaned,
    channels: {
      "mass-absorption": muPoints,
      beta: betaPoints,
      f2,
      "im-epsilon": imEpsilon,
      "im-chi": imChi,
      delta: deltaPoints,
      f1,
      "re-epsilon": reEpsilon,
      "re-chi": reChi,
    },
  };
}

/** Plot channels with Henke/CXRO bare-atom curves in {@link buildBareAtomRepresentationMatrix}. */
export const BARE_ATOM_OVERLAY_MATRIX_CHANNEL_IDS = [
  "mass-absorption",
  "beta",
  "f2",
  "im-epsilon",
  "im-chi",
  "delta",
  "f1",
  "re-epsilon",
  "re-chi",
] as const satisfies readonly NexafsPlotChannelId[];

const bareAtomOverlayMatrixChannelIds = new Set<NexafsPlotChannelId>(
  BARE_ATOM_OVERLAY_MATRIX_CHANNEL_IDS,
);

/**
 * Returns whether the active plot channel can show a tabulated bare-atom overlay.
 * Raw and 0–1 normalized spectroscopy traces are excluded; mass absorption and optical-constant channels are supported.
 */
export function bareAtomOverlaySupportedForChannel(
  channel: NexafsPlotChannelId,
): boolean {
  return bareAtomOverlayMatrixChannelIds.has(channel);
}

function channelShortLabel(channel: NexafsPlotChannelId): string {
  if (channel === "mass-absorption") {
    return "μ";
  }
  return getPlotChannelDefinition(channel).shortLabel;
}

function bareAtomReferenceCurveFromMatrixChannel(
  matrix: BareAtomRepresentationMatrix,
  channel: NexafsPlotChannelId,
  isDark: boolean,
  lineDash: ReferenceCurve["lineDash"],
): ReferenceCurve | null {
  if (!bareAtomOverlaySupportedForChannel(channel)) {
    return null;
  }
  const points = matrix.channels[channel];
  if (!points || points.length < 2) {
    return null;
  }
  return {
    label: `Bare atom ${channelShortLabel(channel)}`,
    color: bareAtomReferenceStrokeColor(isDark),
    lineDash,
    showInLegend: false,
    points: points.map((p) => ({
      energy: p.energy,
      absorption: p.absorption,
    })),
  };
}

/**
 * Selects a bare-atom reference trace from a precomputed representation matrix for the active
 * channel.
 */
export function bareAtomReferenceFromMatrix(
  matrix: BareAtomRepresentationMatrix,
  channel: NexafsPlotChannelId,
  isDark = false,
): ReferenceCurve | null {
  return bareAtomReferenceCurveFromMatrixChannel(
    matrix,
    channel,
    isDark,
    "solid",
  );
}

/**
 * Builds bare-atom reference overlays: one solid trace for the active channel, or imaginary (solid)
 * and real (dashed) pair when optical link roles are supplied.
 */
export function bareAtomReferencesForOverlay(
  matrix: BareAtomRepresentationMatrix,
  plotChannel: NexafsPlotChannelId,
  isDark: boolean,
  linkRoles?: BareAtomOverlayLinkRoles,
): ReferenceCurve[] {
  if (linkRoles) {
    const imaginary = bareAtomReferenceCurveFromMatrixChannel(
      matrix,
      linkRoles.imaginaryRole,
      isDark,
      "solid",
    );
    const real = bareAtomReferenceCurveFromMatrixChannel(
      matrix,
      linkRoles.realRole,
      isDark,
      "dash",
    );
    return [imaginary, real].filter((c): c is ReferenceCurve => c != null);
  }
  const single = bareAtomReferenceFromMatrix(matrix, plotChannel, isDark);
  return single ? [single] : [];
}
