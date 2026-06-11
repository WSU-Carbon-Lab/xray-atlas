import type { Molecule } from "openchemlib";

import { ensureMolHelpers } from "./molecule-2d-transforms";

export function heavyAtomsAreBonded(
  mol: Molecule,
  atomA: number,
  atomB: number,
): boolean {
  ensureMolHelpers(mol);
  const n = mol.getAtoms();
  if (
    !Number.isFinite(atomA) ||
    !Number.isFinite(atomB) ||
    atomA < 0 ||
    atomB < 0 ||
    atomA >= n ||
    atomB >= n ||
    atomA === atomB
  ) {
    return false;
  }
  const nc = mol.getConnAtoms(atomA);
  for (let i = 0; i < nc; i += 1) {
    if (mol.getConnAtom(atomA, i) === atomB) {
      return true;
    }
  }
  return false;
}

export function collectAtomsOnSideOfBond(
  mol: Molecule,
  bondAtomA: number,
  bondAtomB: number,
  startFrom: number,
): Set<number> {
  ensureMolHelpers(mol);
  const seen = new Set<number>([startFrom]);
  const stack = [startFrom];
  while (stack.length > 0) {
    const u = stack.pop()!;
    const nc = mol.getConnAtoms(u);
    for (let i = 0; i < nc; i += 1) {
      const v = mol.getConnAtom(u, i);
      if (
        (u === bondAtomA && v === bondAtomB) ||
        (u === bondAtomB && v === bondAtomA)
      ) {
        continue;
      }
      if (!seen.has(v)) {
        seen.add(v);
        stack.push(v);
      }
    }
  }
  return seen;
}

export function reflectPointAcrossLine(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { x: number; y: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-18) {
    return { x: px, y: py };
  }
  const t = ((px - ax) * dx + (py - ay) * dy) / len2;
  const projx = ax + t * dx;
  const projy = ay + t * dy;
  return { x: 2 * projx - px, y: 2 * projy - py };
}

export function findBondIndex(mol: Molecule, atomA: number, atomB: number): number {
  ensureMolHelpers(mol);
  const n = mol.getBonds();
  for (let bi = 0; bi < n; bi += 1) {
    const a0 = mol.getBondAtom(0, bi);
    const a1 = mol.getBondAtom(1, bi);
    if (
      (a0 === atomA && a1 === atomB) ||
      (a0 === atomB && a1 === atomA)
    ) {
      return bi;
    }
  }
  return -1;
}

export function flipSmallerFragmentAcrossBond(
  mol: Molecule,
  bondAtomA: number,
  bondAtomB: number,
): void {
  ensureMolHelpers(mol);
  if (!heavyAtomsAreBonded(mol, bondAtomA, bondAtomB)) {
    throw new Error("Pivot: the two atoms must share a bond.");
  }
  const sideA = collectAtomsOnSideOfBond(mol, bondAtomA, bondAtomB, bondAtomA);
  const sideB = collectAtomsOnSideOfBond(mol, bondAtomA, bondAtomB, bondAtomB);
  const flipA = sideA.size <= sideB.size;
  const toFlip = flipA ? sideA : sideB;
  const ax = mol.getAtomX(bondAtomA);
  const ay = mol.getAtomY(bondAtomA);
  const bx = mol.getAtomX(bondAtomB);
  const by = mol.getAtomY(bondAtomB);
  for (const a of toFlip) {
    const x = mol.getAtomX(a);
    const y = mol.getAtomY(a);
    const rp = reflectPointAcrossLine(x, y, ax, ay, bx, by);
    mol.setAtomX(a, rp.x);
    mol.setAtomY(a, rp.y);
  }
}

export function rotateFragmentAroundBondPivot(
  mol: Molecule,
  pivotAtom: number,
  bondMateAtom: number,
  angleRad: number,
): void {
  ensureMolHelpers(mol);
  if (!heavyAtomsAreBonded(mol, pivotAtom, bondMateAtom)) {
    throw new Error("Pivot: the two atoms must share a bond.");
  }
  const side = collectAtomsOnSideOfBond(mol, pivotAtom, bondMateAtom, bondMateAtom);
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  const px = mol.getAtomX(pivotAtom);
  const py = mol.getAtomY(pivotAtom);
  for (const a of side) {
    const x = mol.getAtomX(a) - px;
    const y = mol.getAtomY(a) - py;
    mol.setAtomX(a, x * c - y * s + px);
    mol.setAtomY(a, x * s + y * c + py);
  }
}
