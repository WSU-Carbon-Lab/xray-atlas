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
import type { StxmIngestionPlotChannel } from "./stxm-ingestion-display";

/** Derived optical-constant plot channels computed from beta, delta, and stoichiometry. */
export type StxmDerivedOpticalChannelId =
  | "f2"
  | "f1"
  | "im-epsilon"
  | "re-epsilon"
  | "im-chi"
  | "re-chi";

const DERIVED_OPTICAL_CHANNEL_IDS = new Set<StxmDerivedOpticalChannelId>([
  "f2",
  "f1",
  "im-epsilon",
  "re-epsilon",
  "im-chi",
  "re-chi",
]);

/**
 * Returns true when the plot channel is derived from stored beta, delta, and a chemical formula.
 */
export function isStxmDerivedOpticalPlotChannel(
  channel: StxmIngestionPlotChannel,
): channel is StxmDerivedOpticalChannelId {
  return DERIVED_OPTICAL_CHANNEL_IDS.has(channel as StxmDerivedOpticalChannelId);
}

/**
 * Resolves the number density (atoms/cm³) for kkcalc-style ASF conversions at 1 g/cm³.
 *
 * @param formula Chemical formula string; whitespace is trimmed before parsing.
 * @returns Number density or null when the formula is empty or invalid.
 */
export function resolveStxmOpticalNumberDensity(formula: string): number | null {
  const trimmed = formula.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const composition = parseChemicalFormula(trimmed);
    const mass = formulaMassFromComposition(composition);
    return numberDensityFromMassDensity(DEFAULT_KK_MASS_DENSITY_G_CM3, mass);
  } catch {
    return null;
  }
}

function pairedBetaDelta(
  energyEv: readonly number[],
  beta: readonly number[] | null | undefined,
  delta: readonly number[] | null | undefined,
): Array<{ index: number; beta: number; delta: number }> | null {
  if (!beta || !delta || energyEv.length === 0) {
    return null;
  }
  const paired: Array<{ index: number; beta: number; delta: number }> = [];
  const len = Math.min(energyEv.length, beta.length, delta.length);
  for (let index = 0; index < len; index += 1) {
    const b = beta[index];
    const d = delta[index];
    if (typeof b === "number" && Number.isFinite(b) && typeof d === "number" && Number.isFinite(d)) {
      paired.push({ index, beta: b, delta: d });
    }
  }
  return paired.length > 0 ? paired : null;
}

/**
 * Builds a per-energy derived optical-constant series aligned to `energyEv`.
 *
 * @param channel Derived channel id (f₂, f₁, Im/Re ε, Im/Re χ).
 * @param energyEv Energy samples in eV.
 * @param beta Imaginary refractive index beta per energy.
 * @param delta Real refractive decrement delta per energy.
 * @param formula Chemical formula for ASF scaling; omit or empty disables derivation.
 * @returns Values aligned to `energyEv`, or null when inputs are insufficient.
 */
export function deriveStxmOpticalChannelSeries(
  channel: StxmDerivedOpticalChannelId,
  energyEv: readonly number[],
  beta: readonly number[] | null | undefined,
  delta: readonly number[] | null | undefined,
  formula: string | null | undefined,
): number[] | null {
  const paired = pairedBetaDelta(energyEv, beta, delta);
  if (!paired) {
    return null;
  }
  const nd = resolveStxmOpticalNumberDensity(formula?.trim() ?? "");
  if (nd == null) {
    return null;
  }

  const out = Array.from({ length: energyEv.length }, () => Number.NaN);

  if (
    channel === "im-epsilon" ||
    channel === "re-epsilon" ||
    channel === "im-chi" ||
    channel === "re-chi"
  ) {
    for (const { index, beta: b, delta: d } of paired) {
      const reN = 1 - d;
      const imN = b;
      const reEps = reN * reN - imN * imN;
      const imEps = 2 * reN * imN;
      out[index] =
        channel === "im-epsilon" || channel === "im-chi"
          ? imEps
          : channel === "re-epsilon"
            ? reEps
            : reEps - 1;
    }
    return out;
  }

  const indices = paired.map((row) => row.index);
  const energies = paired.map((row) => energyEv[row.index]!);
  const betas = paired.map((row) => row.beta);
  const deltas = paired.map((row) => row.delta);

  if (channel === "f2") {
    const f2 = refractiveBetaToImaginaryAsf(energies, betas, nd);
    paired.forEach((row, i) => {
      out[row.index] = f2[i]!;
    });
    return out;
  }

  const f1 = opticalDeltaToRealAsf(energies, deltas, nd);
  indices.forEach((index, i) => {
    out[index] = f1[i]!;
  });
  return out;
}

/**
 * Reports whether derived f/ε/χ channels can be rendered from reduced spectra and formula.
 */
export function stxmDerivedOpticalChannelsAvailable(
  energyEv: readonly number[],
  beta: readonly number[] | null | undefined,
  delta: readonly number[] | null | undefined,
  formula: string | null | undefined,
): boolean {
  if (resolveStxmOpticalNumberDensity(formula?.trim() ?? "") == null) {
    return false;
  }
  return pairedBetaDelta(energyEv, beta, delta) != null;
}

/**
 * Maps legacy STXM plot channel ids to the NEXAFS-aligned optical-constant ids.
 */
export function migrateStxmIngestionPlotChannel(
  channel: StxmIngestionPlotChannel | "chi",
): StxmIngestionPlotChannel {
  if (channel === "chi") {
    return "im-chi";
  }
  return channel;
}
