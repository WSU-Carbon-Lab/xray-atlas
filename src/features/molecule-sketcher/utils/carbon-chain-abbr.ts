import type { Molecule } from "openchemlib";
import { Molecule as MoleculeCtor } from "openchemlib";

import { formatAlkylCnH2nPlus1 } from "~/lib/chem-formula-subscripts";

const CARBON = 6;

const DEFAULT_MIN_TAIL_CARBONS = 2;

function isSaturatedCarbonChainBond(mol: Molecule, bond: number): boolean {
  if (mol.getBondOrder(bond) !== 1) return false;
  if (mol.isAromaticBond(bond)) return false;
  const a0 = mol.getBondAtom(0, bond);
  const a1 = mol.getBondAtom(1, bond);
  return mol.getAtomicNo(a0) === CARBON && mol.getAtomicNo(a1) === CARBON;
}

function buildTerminalCarbonPathFromLeaf(mol: Molecule, leaf: number): number[] | null {
  if (mol.getAtomicNo(leaf) !== CARBON || mol.getConnAtoms(leaf) !== 1) {
    return null;
  }
  const path: number[] = [];
  let cur = leaf;
  let prev = -1;
  for (;;) {
    path.push(cur);
    const nbs: number[] = [];
    const nc = mol.getConnAtoms(cur);
    for (let i = 0; i < nc; i += 1) {
      const nb = mol.getConnAtom(cur, i);
      if (nb !== prev) nbs.push(nb);
    }
    if (nbs.length !== 1) break;
    const nxt = nbs[0]!;
    const b = mol.getBond(cur, nxt);
    if (b < 0 || !isSaturatedCarbonChainBond(mol, b)) break;
    if (mol.getAtomicNo(nxt) !== CARBON) break;
    if (mol.getConnAtoms(nxt) > 2) break;
    prev = cur;
    cur = nxt;
  }
  return path.length > 0 ? path : null;
}

export function abbreviateTerminalAlkylChains(
  mol: Molecule,
  minTailCarbons: number = DEFAULT_MIN_TAIL_CARBONS,
): number {
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  let total = 0;
  let changed = true;
  while (changed) {
    changed = false;
    const heavy = mol.getAtoms();
    const leaves: number[] = [];
    for (let a = 0; a < heavy; a += 1) {
      if (mol.getAtomicNo(a) === CARBON && mol.getConnAtoms(a) === 1) {
        leaves.push(a);
      }
    }
    for (const leaf of leaves) {
      if (leaf >= mol.getAtoms()) continue;
      const path = buildTerminalCarbonPathFromLeaf(mol, leaf);
      const L = path?.length ?? 0;
      if (!path || L < 2 || L < minTailCarbons) continue;

      const attach = path[L - 1]!;
      if (mol.isRingAtom(attach)) continue;

      const toDelete = path.slice(0, L - 1);
      const sorted = [...toDelete].sort((x, y) => y - x);
      mol.deleteAtoms(sorted);

      let attachIdx = attach;
      for (const d of sorted) {
        if (d < attachIdx) attachIdx -= 1;
      }

      const label = formatAlkylCnH2nPlus1(L);
      mol.setAtomCustomLabel(attachIdx, label);
      mol.inventCoordinates({});
      total += 1;
      changed = true;
      break;
    }
  }
  return total;
}
