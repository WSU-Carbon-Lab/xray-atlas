import type { Molecule } from "openchemlib";
import { Molecule as MoleculeCtor } from "openchemlib";

import {
  normalizeChHydrideDisplayLabels,
  normalizeEditorAlkylCustomLabels,
  normalizeTerminalCarbonHydrideLabels,
} from "./alkyl-label-expand";
import { standardizeDepictionStereo } from "./molfile-depiction-standardize";

const N = 7;
const C = 6;

export function abbreviateNitrileGroups(mol: Molecule): number {
  const n = coalesceNitrileTripleBonds(mol);
  if (n > 0) {
    mol.inventCoordinates({});
  }
  return n;
}

export function coalesceNitrileTripleBonds(mol: Molecule): number {
  let count = 0;
  let changed = true;
  while (changed) {
    changed = false;
    mol.ensureHelperArrays(MoleculeCtor.cHelperNeighbours);
    const bonds = mol.getBonds();
    for (let b = 0; b < bonds; b += 1) {
      if (mol.getBondOrder(b) !== 3) continue;
      const a0 = mol.getBondAtom(0, b);
      const a1 = mol.getBondAtom(1, b);
      const z0 = mol.getAtomicNo(a0);
      const z1 = mol.getAtomicNo(a1);
      if (!((z0 === C && z1 === N) || (z0 === N && z1 === C))) continue;
      const cIdx = z0 === C ? a0 : a1;
      const nIdx = z0 === N ? a0 : a1;
      if (mol.getConnAtoms(nIdx) === 1) {
        mol.setAtomCharge(cIdx, 0);
        mol.setAtomCharge(nIdx, 0);
        mol.deleteAtom(nIdx);
        mol.setAtomCustomLabel(cIdx, "CN");
        count += 1;
        changed = true;
        break;
      }
      if (mol.getConnAtoms(cIdx) === 1) {
        mol.setAtomCharge(cIdx, 0);
        mol.setAtomCharge(nIdx, 0);
        mol.deleteAtom(cIdx);
        mol.setAtomCustomLabel(nIdx, "NC");
        count += 1;
        changed = true;
        break;
      }
    }
  }
  return count;
}

export interface DepictionCoalescenceResult {
  nitrileGroupsCoalesced: number;
  terminalMethylLabelsApplied: boolean;
}

export function applyDepictionCoalescence(mol: Molecule): DepictionCoalescenceResult {
  standardizeDepictionStereo(mol);
  const nitrileGroupsCoalesced = coalesceNitrileTripleBonds(mol);
  normalizeEditorAlkylCustomLabels(mol);
  normalizeChHydrideDisplayLabels(mol);
  const terminalMethylLabelsApplied = normalizeTerminalCarbonHydrideLabels(mol);
  mol.inventCoordinates({});
  return { nitrileGroupsCoalesced, terminalMethylLabelsApplied };
}
