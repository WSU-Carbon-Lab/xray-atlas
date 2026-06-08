export type InferredStxmEdge = {
  label: string;
  energyMidEv: number;
};

const EDGE_BANDS: Array<{ label: string; minEv: number; maxEv: number }> = [
  { label: "C K", minEv: 275, maxEv: 320 },
  { label: "N K", minEv: 395, maxEv: 430 },
  { label: "O K", minEv: 525, maxEv: 560 },
  { label: "F K", minEv: 680, maxEv: 710 },
  { label: "S K", minEv: 2450, maxEv: 2520 },
];

/**
 * Infers a NEXAFS edge label from the scan energy range midpoint.
 */
export function inferStxmEdgeFromEnergyRange(
  energyMinEv: number | null | undefined,
  energyMaxEv: number | null | undefined,
): InferredStxmEdge | null {
  if (
    energyMinEv === null ||
    energyMaxEv === null ||
    energyMinEv === undefined ||
    energyMaxEv === undefined ||
    !Number.isFinite(energyMinEv) ||
    !Number.isFinite(energyMaxEv)
  ) {
    return null;
  }
  const mid = (energyMinEv + energyMaxEv) / 2;
  for (const band of EDGE_BANDS) {
    if (mid >= band.minEv && mid <= band.maxEv) {
      return { label: band.label, energyMidEv: mid };
    }
  }
  return null;
}
