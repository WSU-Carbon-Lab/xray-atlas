/**
 * Builds a three-level hierarchy (polarization id, theta, phi) for browse tables.
 */
import type { SpectrumPoint } from "~/components/plots/types";
import type { AnnotatedSpectrumRow } from "./mapDbSpectrumRowsToPoints";

export interface SpectrumPhiLeaf {
  phiKey: string;
  phi: number | null;
  label: string;
  points: SpectrumPoint[];
  minEnergy: number;
  maxEnergy: number;
}

export interface SpectrumThetaNode {
  thetaKey: string;
  theta: number | null;
  label: string;
  phiLeaves: SpectrumPhiLeaf[];
}

export interface SpectrumPolarizationNode {
  polarizationKey: string;
  polarizationId: string | null;
  label: string;
  thetaNodes: SpectrumThetaNode[];
}

function energyRangeLabel(minE: number, maxE: number): string {
  if (!Number.isFinite(minE) || !Number.isFinite(maxE)) return "—";
  return `${minE.toFixed(1)} – ${maxE.toFixed(1)} eV`;
}

function thetaKeyOf(p: SpectrumPoint): string {
  if (typeof p.theta === "number" && Number.isFinite(p.theta)) {
    return String(Math.round(p.theta * 1000) / 1000);
  }
  return "none";
}

function phiKeyOf(p: SpectrumPoint): string {
  if (typeof p.phi === "number" && Number.isFinite(p.phi)) {
    return String(Math.round(p.phi * 1000) / 1000);
  }
  return "none";
}

/**
 * Groups annotated spectrum rows by database polarization id, then theta, then phi; sorts each leaf by energy ascending.
 *
 * @param rows Annotated rows from `mapDbSpectrumRowsToAnnotated`.
 * @returns Polarization nodes ordered by label key; each node contains theta nodes and phi leaves with point arrays.
 */
export function groupSpectrumByPolarizationThetaPhi(
  rows: AnnotatedSpectrumRow[],
): SpectrumPolarizationNode[] {
  type Bucket = Map<
    string,
    Map<string, Map<string, SpectrumPoint[]>>
  >;

  const polBuckets: Bucket = new Map();

  for (const { polarizationId, point } of rows) {
    const polKey =
      polarizationId != null && polarizationId.length > 0
        ? polarizationId
        : "__none__";
    let thetaMap = polBuckets.get(polKey);
    if (!thetaMap) {
      thetaMap = new Map();
      polBuckets.set(polKey, thetaMap);
    }
    const tk = thetaKeyOf(point);
    let phiMap = thetaMap.get(tk);
    if (!phiMap) {
      phiMap = new Map();
      thetaMap.set(tk, phiMap);
    }
    const pk = phiKeyOf(point);
    const list = phiMap.get(pk);
    if (list) list.push(point);
    else phiMap.set(pk, [point]);
  }

  const polNodes: SpectrumPolarizationNode[] = [];

  const sortedPolKeys = Array.from(polBuckets.keys()).sort((a, b) =>
    a.localeCompare(b),
  );

  for (const polKey of sortedPolKeys) {
    const polarizationId = polKey === "__none__" ? null : polKey;
    const label =
      polarizationId != null
        ? `Polarization ${polarizationId.slice(0, 8)}`
        : "Polarization (unspecified)";

    const thetaMap = polBuckets.get(polKey)!;
    const thetaNodes: SpectrumThetaNode[] = [];

    const sortedThetaKeys = Array.from(thetaMap.keys()).sort((a, b) => {
      const na = a === "none" ? Number.NaN : Number(a);
      const nb = b === "none" ? Number.NaN : Number(b);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      if (Number.isFinite(na)) return -1;
      if (Number.isFinite(nb)) return 1;
      return a.localeCompare(b);
    });

    for (const tk of sortedThetaKeys) {
      const phiMap = thetaMap.get(tk)!;
      const phiLeaves: SpectrumPhiLeaf[] = [];
      const thetaVal = tk === "none" ? null : Number(tk);
      const thetaLabel =
        thetaVal != null && Number.isFinite(thetaVal)
          ? `Theta ${thetaVal.toFixed(1)} deg`
          : "Theta —";

      const sortedPhiKeys = Array.from(phiMap.keys()).sort((a, b) => {
        const na = a === "none" ? Number.NaN : Number(a);
        const nb = b === "none" ? Number.NaN : Number(b);
        if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
        if (Number.isFinite(na)) return -1;
        if (Number.isFinite(nb)) return 1;
        return a.localeCompare(b);
      });

      for (const pk of sortedPhiKeys) {
        const pts = phiMap.get(pk)!;
        pts.sort((a, b) => a.energy - b.energy);
        const energies = pts.map((p) => p.energy);
        const minE = energies.length ? Math.min(...energies) : Number.NaN;
        const maxE = energies.length ? Math.max(...energies) : Number.NaN;
        const phiVal = pk === "none" ? null : Number(pk);
        phiLeaves.push({
          phiKey: pk,
          phi: phiVal,
          label:
            phiVal != null && Number.isFinite(phiVal)
              ? `Phi ${phiVal.toFixed(1)} deg`
              : "Phi —",
          points: pts,
          minEnergy: minE,
          maxEnergy: maxE,
        });
      }

      thetaNodes.push({
        thetaKey: tk,
        theta: thetaVal,
        label: thetaLabel,
        phiLeaves,
      });
    }

    polNodes.push({
      polarizationKey: polKey,
      polarizationId,
      label,
      thetaNodes,
    });
  }

  return polNodes;
}

export function phiLeafEnergySubtitle(leaf: SpectrumPhiLeaf): string {
  return energyRangeLabel(leaf.minEnergy, leaf.maxEnergy);
}
