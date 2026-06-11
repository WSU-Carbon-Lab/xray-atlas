import type { Molecule } from "openchemlib";

import type { DrawBondMark } from "../molecule-draw-types";
import { resolveBondMark } from "./polymer-bookends";

const COORD_MATCH_TOLERANCE = 0.02;

/**
 * Locates an atom in `mol` whose 2D/3D coordinates match `(x, y, z)` within
 * {@link COORD_MATCH_TOLERANCE}.
 */
function findAtomByCoordinates(
  mol: Molecule,
  x: number,
  y: number,
  z: number,
): number | null {
  const count = mol.getAllAtoms();
  for (let atom = 0; atom < count; atom += 1) {
    if (
      Math.abs(mol.getAtomX(atom) - x) <= COORD_MATCH_TOLERANCE &&
      Math.abs(mol.getAtomY(atom) - y) <= COORD_MATCH_TOLERANCE &&
      Math.abs(mol.getAtomZ(atom) - z) <= COORD_MATCH_TOLERANCE
    ) {
      return atom;
    }
  }
  return null;
}

/**
 * Remaps a bond mark from a pre-edit molecule onto an edited molecule by
 * matching endpoint coordinates. Returns null when either endpoint was removed
 * or the bond no longer exists.
 *
 * @param before - Molecule before an in-place edit such as database prep.
 * @param after - Molecule after the edit; not mutated.
 * @param mark - Bond mark using indices from `before`.
 */
export function remapDrawBondMarkAfterMolEdit(
  before: Molecule,
  after: Molecule,
  mark: DrawBondMark,
): DrawBondMark | null {
  if (
    mark.atomA < 0 ||
    mark.atomA >= before.getAllAtoms() ||
    mark.atomB < 0 ||
    mark.atomB >= before.getAllAtoms()
  ) {
    return null;
  }
  const ax = before.getAtomX(mark.atomA);
  const ay = before.getAtomY(mark.atomA);
  const az = before.getAtomZ(mark.atomA);
  const bx = before.getAtomX(mark.atomB);
  const by = before.getAtomY(mark.atomB);
  const bz = before.getAtomZ(mark.atomB);
  const newA = findAtomByCoordinates(after, ax, ay, az);
  const newB = findAtomByCoordinates(after, bx, by, bz);
  if (newA === null || newB === null) {
    return null;
  }
  const remapped: DrawBondMark = { atomA: newA, atomB: newB };
  if (mark.openingFlip === true) {
    remapped.openingFlip = true;
  }
  if (resolveBondMark(after, remapped) < 0) {
    return null;
  }
  return remapped;
}

/** Opening and closing bookend bond marks keyed by atom index. */
export interface RemapBookendMarksInput {
  open: DrawBondMark | null;
  close: DrawBondMark | null;
}

/**
 * Remaps opening and closing bookend marks after database prep or other edits
 * that preserve survivor atom coordinates.
 *
 * @param before - Molecule before the edit.
 * @param after - Molecule after the edit.
 * @param bookends - Current bookend marks referencing `before`.
 */
export function remapBookendMarksAfterMolEdit(
  before: Molecule,
  after: Molecule,
  bookends: RemapBookendMarksInput,
): RemapBookendMarksInput {
  const open =
    bookends.open === null
      ? null
      : remapDrawBondMarkAfterMolEdit(before, after, bookends.open);
  const close =
    bookends.close === null
      ? null
      : remapDrawBondMarkAfterMolEdit(before, after, bookends.close);
  return { open, close };
}
