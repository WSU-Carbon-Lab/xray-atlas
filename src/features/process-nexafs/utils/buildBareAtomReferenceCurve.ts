import type { ReferenceCurve } from "~/components/plots/types";
import {
  computeDeltaFromBetaKkcalcStyle,
  DEFAULT_KK_MASS_DENSITY_G_CM3,
} from "~/features/kk-calc/compute-delta-from-beta-kkcalc-style";
import { alignKkDeltaToSpectrumEnergyAxis } from "~/features/kk-calc/makima-interpolate";
import { prepareStrictlyAscendingEnergyBetaForKk } from "~/features/kk-calc/prepare-strictly-ascending-energy-beta-for-kk";

import type { BareAtomPoint } from "../types";
import { computeBetaIndex } from "./betaIndex";

/** Y-axis basis for a tabulated bare-atom reference overlay on spectrum plots. */
export type BareAtomReferenceDataView = "absorption" | "beta" | "delta";

const BARE_ATOM_REFERENCE_COLOR = "#6b7280";

/**
 * Builds one bare-atom reference trace from CXRO-derived mass absorption on the spectrum energy
 * grid: μ for absorption view, β from μ and Henke μ, or δ from bare-atom β via kkcalc-style KK with
 * makima alignment onto `targetEnergyEv` when `dataView` is `delta`.
 *
 * @param args.bareMu Henke/CXRO mass absorption samples on the geometry energy grid.
 * @param args.dataView Plot basis for the reference trace.
 * @param args.stoichiometryFormula Chemical formula for KK stoichiometry and Henke tails.
 * @param args.label Trace label (shown in tooltips; legend hidden by default).
 * @param args.targetEnergyEv Destination energies for δ samples; required for correct δ overlay alignment.
 * @param args.henkeMergeDomain Optional Henke tail merge window for KK on bare-atom β.
 * @param args.massDensityGPerCm3 Mass density (g/cm³) for optical constants conversion.
 * @returns A reference curve, or `null` when inputs are insufficient or KK fails.
 */
export function buildBareAtomReferenceCurve(args: {
  readonly bareMu: readonly BareAtomPoint[];
  readonly dataView: BareAtomReferenceDataView;
  readonly stoichiometryFormula: string;
  readonly label: string;
  readonly targetEnergyEv?: readonly number[];
  readonly henkeMergeDomain?: readonly [number, number];
  readonly massDensityGPerCm3?: number;
}): ReferenceCurve | null {
  const formula = args.stoichiometryFormula.trim();
  if (!formula || args.bareMu.length === 0) {
    return null;
  }

  const base = {
    label: args.label,
    color: BARE_ATOM_REFERENCE_COLOR,
    showInLegend: false as const,
  };

  if (args.dataView === "absorption") {
    return {
      ...base,
      points: args.bareMu.map((p) => ({
        energy: p.energy,
        absorption: p.absorption,
      })),
    };
  }

  const muLike = args.bareMu.map((p) => ({
    energy: p.energy,
    absorption: p.absorption,
  }));
  const betaLike = computeBetaIndex(
    muLike,
    muLike.map((p) => p.energy),
    [...args.bareMu],
  );

  if (args.dataView === "beta") {
    return {
      ...base,
      points: betaLike.map((p) => ({
        energy: p.energy,
        absorption: p.absorption,
      })),
    };
  }

  const targetEnergyEv =
    args.targetEnergyEv && args.targetEnergyEv.length >= 4
      ? [...args.targetEnergyEv]
      : betaLike.map((p) => p.energy);
  if (targetEnergyEv.length < 4) {
    return null;
  }
  targetEnergyEv.sort((a, b) => a - b);

  const prepared = prepareStrictlyAscendingEnergyBetaForKk(
    betaLike.map((p) => p.energy),
    betaLike.map((p) => p.absorption),
  );
  if (prepared.energyEv.length < 4) {
    return null;
  }

  let rawDelta: number[];
  try {
    rawDelta = computeDeltaFromBetaKkcalcStyle({
      energyEv: prepared.energyEv,
      beta: prepared.beta,
      stoichiometryFormula: formula,
      densityGPerCm3: args.massDensityGPerCm3 ?? DEFAULT_KK_MASS_DENSITY_G_CM3,
      henkeMergeDomain: args.henkeMergeDomain,
    });
  } catch {
    return null;
  }

  const kkMin = prepared.energyEv[0]!;
  const kkMax = prepared.energyEv[prepared.energyEv.length - 1]!;
  const alignmentTarget = targetEnergyEv.filter(
    (energy) => energy >= kkMin && energy <= kkMax,
  );
  const gridForAlign =
    alignmentTarget.length >= 4 ? alignmentTarget : [...targetEnergyEv];

  const aligned = alignKkDeltaToSpectrumEnergyAxis(
    gridForAlign,
    prepared.energyEv,
    rawDelta,
  );

  const points = gridForAlign
    .map((energy, i) => ({
      energy,
      absorption: aligned[i]!,
    }))
    .filter((p) => Number.isFinite(p.absorption));

  if (points.length < 2) {
    return null;
  }

  return {
    ...base,
    points,
  };
}
