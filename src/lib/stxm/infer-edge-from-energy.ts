/**
 * STXM edge inference from scan energy range. Bands live in
 * `~/lib/nexafs/edge-energy-bands`; this module preserves the STXM label shape
 * (`C K`) for dashboard callers.
 */

import { inferEdgeBandFromEnergyRange } from "~/lib/nexafs/edge-energy-bands";

export type InferredStxmEdge = {
  label: string;
  energyMidEv: number;
};

/**
 * Infers a NEXAFS edge label from the scan energy range midpoint.
 *
 * @param energyMinEv - Inclusive lower scan energy (eV).
 * @param energyMaxEv - Inclusive upper scan energy (eV).
 * @returns STXM-style label (e.g. `C K`) and midpoint when a typical band matches; otherwise `null`.
 */
export function inferStxmEdgeFromEnergyRange(
  energyMinEv: number | null | undefined,
  energyMaxEv: number | null | undefined,
): InferredStxmEdge | null {
  const inferred = inferEdgeBandFromEnergyRange(energyMinEv, energyMaxEv);
  if (!inferred) {
    return null;
  }
  return { label: inferred.stxmLabel, energyMidEv: inferred.energyMidEv };
}
