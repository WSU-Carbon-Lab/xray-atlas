import {
  computeDeltaFromBetaKkcalcStyle,
  type KkcalcMaterialContext,
} from "./compute-delta-from-beta-kkcalc-style";
import { alignKkDeltaToSpectrumEnergyAxis } from "./makima-interpolate";

export interface SpectrumpointRowForKk {
  readonly id: string;
  readonly polarizationid: string | null;
  readonly energyev: number;
  readonly beta: number | null;
}

/**
 * Builds `{ id, delta }` updates for `spectrumpoints` rows by running kkcalc2-style KK in TypeScript
 * on each polarization id group, then {@link alignKkDeltaToSpectrumEnergyAxis} so each persisted `delta`
 * is defined on the row's `energyev` axis (makima remap when the KK grid differs from stored energies).
 *
 * @param rows All spectrum rows for one experiment (any order); rows with null or
 *   non-finite `beta` are skipped entirely for KK (no update emitted for those ids).
 * @param material Stoichiometry and mass density for kkcalc2 conversions.
 * @returns Update objects suitable for the authenticated `spectrumpoints.updateKkDeltaBatch`
 *   tRPC mutation payload shape.
 */
export function buildSpectrumpointDeltaUpdatesFromRows(
  rows: readonly SpectrumpointRowForKk[],
  material: KkcalcMaterialContext,
): { id: string; delta: number }[] {
  const eligible = rows.filter(
    (r) => r.beta != null && Number.isFinite(r.beta) && Number.isFinite(r.energyev),
  );
  if (eligible.length < 4) {
    return [];
  }

  const byPol = new Map<string | null, SpectrumpointRowForKk[]>();
  for (const r of eligible) {
    const list = byPol.get(r.polarizationid);
    if (list) {
      list.push(r);
    } else {
      byPol.set(r.polarizationid, [r]);
    }
  }

  const out: { id: string; delta: number }[] = [];

  for (const group of byPol.values()) {
    group.sort((a, b) => a.energyev - b.energyev);
    const E = group.map((r) => r.energyev);
    const B = group.map((r) => r.beta!);
    for (let i = 1; i < E.length; i++) {
      if (E[i]! <= E[i - 1]!) {
        return [];
      }
    }
    const deltaArr = computeDeltaFromBetaKkcalcStyle({
      energyEv: E,
      beta: B,
      stoichiometryFormula: material.stoichiometryFormula,
      densityGPerCm3: material.massDensityGPerCm3,
      henkeMergeDomain: material.henkeMergeDomain,
    });
    const aligned = alignKkDeltaToSpectrumEnergyAxis(E, E, deltaArr);
    for (let i = 0; i < group.length; i++) {
      const d = aligned[i]!;
      if (Number.isFinite(d)) {
        out.push({ id: group[i]!.id, delta: d });
      }
    }
  }

  return out;
}
