import type { Molecule } from "openchemlib";
import { Molecule as MoleculeCtor } from "openchemlib";

export function ensureMolHelpers(mol: Molecule): void {
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
}

export function rotateAllCoordsAroundPoint(
  mol: Molecule,
  px: number,
  py: number,
  angleRad: number,
): void {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  const n = mol.getAllAtoms();
  for (let a = 0; a < n; a += 1) {
    const x = mol.getAtomX(a) - px;
    const y = mol.getAtomY(a) - py;
    mol.setAtomX(a, x * c - y * s + px);
    mol.setAtomY(a, x * s + y * c + py);
  }
}

export function translateAllCoords(mol: Molecule, dx: number, dy: number): void {
  const n = mol.getAllAtoms();
  for (let a = 0; a < n; a += 1) {
    mol.setAtomX(a, mol.getAtomX(a) + dx);
    mol.setAtomY(a, mol.getAtomY(a) + dy);
  }
}

export function applyHorizonFrame(
  mol: Molecule,
  originAtom: number,
  horizonNeighborAtom: number,
  centerX: number,
  centerY: number,
): void {
  ensureMolHelpers(mol);
  const nAtoms = mol.getAtoms();
  if (
    originAtom < 0 ||
    originAtom >= nAtoms ||
    horizonNeighborAtom < 0 ||
    horizonNeighborAtom >= nAtoms
  ) {
    throw new RangeError("Origin or horizon atom index is out of range.");
  }
  if (originAtom === horizonNeighborAtom) {
    throw new Error("Horizon neighbor must differ from the origin atom.");
  }
  let isNeighbor = false;
  const conn = mol.getConnAtoms(originAtom);
  for (let i = 0; i < conn; i += 1) {
    if (mol.getConnAtom(originAtom, i) === horizonNeighborAtom) {
      isNeighbor = true;
      break;
    }
  }
  if (!isNeighbor) {
    throw new Error("Horizon atom must be bonded to the origin atom.");
  }
  const ox = mol.getAtomX(originAtom);
  const oy = mol.getAtomY(originAtom);
  const nx = mol.getAtomX(horizonNeighborAtom);
  const ny = mol.getAtomY(horizonNeighborAtom);
  const vx = nx - ox;
  const vy = ny - oy;
  const len = Math.hypot(vx, vy);
  if (len < 1e-9) {
    throw new Error("Horizon bond has zero length in 2D.");
  }
  const angle = Math.atan2(vy, vx);
  translateAllCoords(mol, -ox, -oy);
  rotateAllCoordsAroundPoint(mol, 0, 0, -angle);
  translateAllCoords(mol, centerX, centerY);
}

export function heavyAtomCentroid2D(mol: Molecule): { x: number; y: number } {
  const n = mol.getAtoms();
  if (n === 0) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (let a = 0; a < n; a += 1) {
    sx += mol.getAtomX(a);
    sy += mol.getAtomY(a);
  }
  return { x: sx / n, y: sy / n };
}

export function scaleCoordsAboutCentroid(mol: Molecule, factor: number): void {
  ensureMolHelpers(mol);
  const n = mol.getAllAtoms();
  if (n === 0) return;
  let sx = 0;
  let sy = 0;
  for (let a = 0; a < n; a += 1) {
    sx += mol.getAtomX(a);
    sy += mol.getAtomY(a);
  }
  const cx = sx / n;
  const cy = sy / n;
  for (let a = 0; a < n; a += 1) {
    const x = mol.getAtomX(a);
    const y = mol.getAtomY(a);
    mol.setAtomX(a, cx + (x - cx) * factor);
    mol.setAtomY(a, cy + (y - cy) * factor);
  }
}

export function cleanupMolecule2DSpacing(mol: Molecule): void {
  ensureMolHelpers(mol);
  scaleCoordsAboutCentroid(mol, 1.06);
}

export function findLargestCarbonOnlyFragment(mol: Molecule): Set<number> | null {
  ensureMolHelpers(mol);
  const n = mol.getAtoms();
  const adj: number[][] = Array.from({ length: n }, () => []);
  const bonds = mol.getBonds();
  for (let b = 0; b < bonds; b += 1) {
    const a0 = mol.getBondAtom(0, b);
    const a1 = mol.getBondAtom(1, b);
    adj[a0]!.push(a1);
    adj[a1]!.push(a0);
  }
  const carbon = new Set<number>();
  for (let a = 0; a < n; a += 1) {
    if (mol.getAtomicNo(a) === 6) carbon.add(a);
  }
  let best: Set<number> | null = null;
  let bestSize = 0;
  const seen = new Set<number>();
  for (const start of carbon) {
    if (seen.has(start)) continue;
    const comp = new Set<number>();
    const st: number[] = [start];
    while (st.length > 0) {
      const a = st.pop()!;
      if (seen.has(a)) continue;
      if (!carbon.has(a)) continue;
      seen.add(a);
      comp.add(a);
      for (const nb of adj[a]!) {
        if (carbon.has(nb) && !seen.has(nb)) st.push(nb);
      }
    }
    if (comp.size > bestSize) {
      bestSize = comp.size;
      best = comp;
    }
  }
  if (!best || best.size < 20) return null;
  return best;
}

function scaleCoordsAboutCentroidForAtoms(
  mol: Molecule,
  factor: number,
  atoms: Set<number>,
): void {
  if (atoms.size === 0) return;
  let sx = 0;
  let sy = 0;
  for (const a of atoms) {
    sx += mol.getAtomX(a);
    sy += mol.getAtomY(a);
  }
  const cx = sx / atoms.size;
  const cy = sy / atoms.size;
  for (const a of atoms) {
    const x = mol.getAtomX(a);
    const y = mol.getAtomY(a);
    mol.setAtomX(a, cx + (x - cx) * factor);
    mol.setAtomY(a, cy + (y - cy) * factor);
  }
}

export function cleanupMolecule2DSpacingSubstituentOnly(mol: Molecule): void {
  ensureMolHelpers(mol);
  const cage = findLargestCarbonOnlyFragment(mol);
  if (!cage) {
    cleanupMolecule2DSpacing(mol);
    return;
  }
  const movable = new Set<number>();
  const n = mol.getAtoms();
  for (let a = 0; a < n; a += 1) {
    if (!cage.has(a)) movable.add(a);
  }
  if (movable.size === 0) return;
  scaleCoordsAboutCentroidForAtoms(mol, 1.06, movable);
}

export function alignBondVectorToAxis(
  mol: Molecule,
  atomA: number,
  atomB: number,
  axis: "x" | "y",
): void {
  ensureMolHelpers(mol);
  const n = mol.getAtoms();
  if (atomA < 0 || atomA >= n || atomB < 0 || atomB >= n) {
    throw new RangeError("Atom index out of range.");
  }
  const ax = mol.getAtomX(atomA);
  const ay = mol.getAtomY(atomA);
  const bx = mol.getAtomX(atomB);
  const by = mol.getAtomY(atomB);
  const vx = bx - ax;
  const vy = by - ay;
  const len = Math.hypot(vx, vy);
  if (len < 1e-9) {
    throw new Error("Atoms coincide in 2D.");
  }
  const base = Math.atan2(vy, vx);
  const target = axis === "x" ? 0 : Math.PI / 2;
  const delta = target - base;
  const c = heavyAtomCentroid2D(mol);
  rotateAllCoordsAroundPoint(mol, c.x, c.y, delta);
}
