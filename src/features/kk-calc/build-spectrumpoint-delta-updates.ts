import { computeDeltaFromBetaDiscreteKK } from "./kk-discrete-henke";

export interface SpectrumpointRowForKk {
  readonly id: string;
  readonly polarizationid: string | null;
  readonly energyev: number;
  readonly beta: number | null;
}

/**
 * Builds `{ id, delta }` updates for `spectrumpoints` rows by running
 * {@link computeDeltaFromBetaDiscreteKK} independently on each polarization id group.
 *
 * @param rows All spectrum rows for one experiment (any order); rows with null or
 *   non-finite `beta` are skipped entirely for KK (no update emitted for those ids).
 * @returns Update objects suitable for the authenticated `spectrumpoints.updateKkDeltaBatch`
 *   tRPC mutation payload shape.
 */
export function buildSpectrumpointDeltaUpdatesFromRows(
  rows: readonly SpectrumpointRowForKk[],
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
    const deltaArr = computeDeltaFromBetaDiscreteKK(E, B);
    for (let i = 0; i < group.length; i++) {
      const d = deltaArr[i]!;
      if (Number.isFinite(d)) {
        out.push({ id: group[i]!.id, delta: d });
      }
    }
  }

  return out;
}
