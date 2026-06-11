import type { Molecule } from "openchemlib";

import type { DrawBondMark } from "../molecule-draw-types";
import {
  bookendBracketGeometry,
  bookendBracketPath,
  type DrawPoint,
} from "./molecule-draw-geometry";
import {
  moleculeSvgFontFamilyXmlAttribute,
  MOLECULE_SVG_LABEL_FONT_WEIGHT,
} from "~/lib/molecule-svg-typography";
import {
  MOLECULE_2D_BOOKEND_STROKE_WIDTH,
  MOLECULE_2D_BOOKEND_SUBSCRIPT_FONT_SIZE,
} from "./molecule-2d-depiction-style";
import type { DrawCanvasOclDepiction, OclAtomCircle } from "./molecule-2d-ocl-depiction";
import { resolveBondMark } from "./polymer-bookends";

/** One ChemDraw-style bracket path for polymer repeat-unit bookends. */
export interface BookendBracketSvgPath {
  /** SVG path `d` attribute for the bracket stroke. */
  d: string;
  /** Stable key for React or serialized SVG grouping. */
  key: string;
  /** Optional `n` subscript position for the closing bookend. */
  subscript?: DrawPoint;
}

function collectAtomsOnSideOfBond(
  mol: Molecule,
  atom0: number,
  atom1: number,
  startAtom: number,
): Set<number> {
  const visited = new Set<number>([startAtom]);
  const queue = [startAtom];
  while (queue.length > 0) {
    const current = queue.pop()!;
    const conn = mol.getConnAtoms(current);
    for (let index = 0; index < conn; index += 1) {
      const neighbor = mol.getConnAtom(current, index);
      const excluded =
        (current === atom0 && neighbor === atom1) ||
        (current === atom1 && neighbor === atom0);
      if (excluded) {
        continue;
      }
      if (visited.has(neighbor)) {
        continue;
      }
      visited.add(neighbor);
      queue.push(neighbor);
    }
  }
  return visited;
}

function canReachAtomsWithoutBond(
  mol: Molecule,
  startAtom: number,
  excludedBond: number,
  targets: readonly number[],
): boolean {
  const atom0 = mol.getBondAtom(0, excludedBond);
  const atom1 = mol.getBondAtom(1, excludedBond);
  const reached = collectAtomsOnSideOfBond(mol, atom0, atom1, startAtom);
  return targets.some((target) => reached.has(target));
}

function fragmentAtomCountExcludingBond(
  mol: Molecule,
  startAtom: number,
  excludedBond: number,
): number {
  const atom0 = mol.getBondAtom(0, excludedBond);
  const atom1 = mol.getBondAtom(1, excludedBond);
  const other = startAtom === atom0 ? atom1 : atom0;
  const visited = collectAtomsOnSideOfBond(mol, atom0, atom1, startAtom);
  return visited.has(other) ? visited.size - 1 : visited.size;
}

/**
 * Chooses which bond endpoint the opening bracket faces, matching the draw
 * canvas and workflow hint depictions.
 */
export function bookendOpeningTowardAtom(
  mol: Molecule,
  bond: number,
  isOpen: boolean,
  openMark: DrawBondMark | null,
  closeMark: DrawBondMark | null,
): number {
  const atom0 = mol.getBondAtom(0, bond);
  const atom1 = mol.getBondAtom(1, bond);
  const otherMark = isOpen ? closeMark : openMark;
  if (otherMark !== null) {
    const otherBond = resolveBondMark(mol, otherMark);
    if (otherBond >= 0) {
      const targets = [mol.getBondAtom(0, otherBond), mol.getBondAtom(1, otherBond)];
      const toward0 = canReachAtomsWithoutBond(mol, atom0, bond, targets);
      const toward1 = canReachAtomsWithoutBond(mol, atom1, bond, targets);
      if (toward0 && !toward1) {
        return atom0;
      }
      if (toward1 && !toward0) {
        return atom1;
      }
    }
  }
  const count0 = fragmentAtomCountExcludingBond(mol, atom0, bond);
  const count1 = fragmentAtomCountExcludingBond(mol, atom1, bond);
  if (isOpen) {
    return count0 <= count1 ? atom1 : atom0;
  }
  return count0 <= count1 ? atom0 : atom1;
}

function circleForAtom(
  atomCircles: ReadonlyMap<number, OclAtomCircle>,
  atom: number,
): OclAtomCircle | undefined {
  return atomCircles.get(atom);
}

function appendBookendBracketPath(
  mol: Molecule,
  depiction: DrawCanvasOclDepiction,
  mark: DrawBondMark,
  isOpen: boolean,
  openMark: DrawBondMark | null,
  closeMark: DrawBondMark | null,
  bothBookendsSet: boolean,
  key: string,
  paths: BookendBracketSvgPath[],
): void {
  const bond = resolveBondMark(mol, mark);
  if (bond < 0) {
    return;
  }
  const atom0 = mol.getBondAtom(0, bond);
  const atom1 = mol.getBondAtom(1, bond);
  const circle0 = circleForAtom(depiction.atomCircles, atom0);
  const circle1 = circleForAtom(depiction.atomCircles, atom1);
  if (circle0 === undefined || circle1 === undefined) {
    return;
  }
  const openingToward = bookendOpeningTowardAtom(
    mol,
    bond,
    isOpen,
    openMark,
    closeMark,
  );
  const geom = bookendBracketGeometry(
    circle0.center,
    circle1.center,
    isOpen,
    openingToward,
    atom0,
    atom1,
    mark.openingFlip === true,
  );
  const entry: BookendBracketSvgPath = {
    d: bookendBracketPath(geom),
    key,
  };
  if (!isOpen && bothBookendsSet) {
    entry.subscript = {
      x:
        geom.mid.x +
        geom.tangent.x * geom.hookPx * 0.85 +
        geom.normal.x * geom.heightPx * 0.42,
      y:
        geom.mid.y +
        geom.tangent.y * geom.hookPx * 0.85 +
        geom.normal.y * geom.heightPx * 0.42,
    };
  }
  paths.push(entry);
}

/**
 * Builds ChemDraw-style `[` / `]` bracket paths in OCL depiction coordinates
 * for database snapshot SVG export.
 */
export function buildBookendBracketSvgPaths(
  mol: Molecule,
  depiction: DrawCanvasOclDepiction,
  openMark: DrawBondMark | null,
  closeMark: DrawBondMark | null,
): BookendBracketSvgPath[] {
  const paths: BookendBracketSvgPath[] = [];
  const bothBookendsSet = openMark !== null && closeMark !== null;
  if (openMark !== null) {
    appendBookendBracketPath(
      mol,
      depiction,
      openMark,
      true,
      openMark,
      closeMark,
      bothBookendsSet,
      "bookend-open",
      paths,
    );
  }
  if (closeMark !== null) {
    appendBookendBracketPath(
      mol,
      depiction,
      closeMark,
      false,
      openMark,
      closeMark,
      bothBookendsSet,
      "bookend-close",
      paths,
    );
  }
  return paths;
}

/**
 * Serializes bookend bracket paths as SVG markup using the themed bond stroke.
 */
export function serializeBookendBracketSvgMarkup(
  paths: readonly BookendBracketSvgPath[],
  bondStroke: string,
): string {
  return paths
    .map((item) => {
      const subscript =
        item.subscript === undefined
          ? ""
          : `<text x="${item.subscript.x}" y="${item.subscript.y}" font-family="${moleculeSvgFontFamilyXmlAttribute()}" font-size="${MOLECULE_2D_BOOKEND_SUBSCRIPT_FONT_SIZE}" font-weight="${MOLECULE_SVG_LABEL_FONT_WEIGHT}" fill="${bondStroke}">n</text>`;
      return `<g><path d="${item.d}" fill="none" stroke="${bondStroke}" stroke-width="${MOLECULE_2D_BOOKEND_STROKE_WIDTH}" stroke-linecap="square" stroke-linejoin="miter"/>${subscript}</g>`;
    })
    .join("");
}
