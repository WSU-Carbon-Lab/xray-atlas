/**
 * Polymer bookend and chunk-classification logic for the draw canvas.
 *
 * Owns the BigSMILES-flavored layer on top of a drawn molecule: validating
 * which bonds may carry repeat-unit bookends (`{` / `}`) or block-boundary
 * cuts, extracting the repeat unit between two bookends, and cutting the
 * structure into ordered block fragments. All operations work on a compact
 * copy of the input molecule, so canvas atom and bond indices are never
 * mutated. Notation here is deliberately "BigSMILES-like": one SMILES per
 * block with `[<]` / `[>]` bonding descriptors at cut sites; full stochastic
 * grammar (nested objects, ladder descriptors) is out of scope.
 */

import type { Molecule } from "openchemlib";
import { Molecule as MoleculeCtor } from "openchemlib";

import { findBondIndex } from "./bond-fragment-transforms";
import type { DrawBondMark } from "../molecule-draw-types";

/** Fragment row compatible with `fragmentsToBlockRecords` in molecule-sketcher bigsmiles. */
export interface BookendFragmentRecord {
  index: number;
  smiles: string;
  cutLabels: number[];
}

/** Successful repeat-unit extraction between two bookend bonds. */
export interface BookendExtractionSuccess {
  ok: true;
  /**
   * Repeat unit with `[<]` at the opening cut and `[>]` at the closing cut,
   * for example `[<]CC(c1ccccc1)[>]` for polystyrene.
   */
  repeatUnitSmiles: string;
  /** Left end group with its attachment marked `[*]`, or null when absent. */
  leftEndSmiles: string | null;
  /** Right end group with its attachment marked `[*]`, or null when absent. */
  rightEndSmiles: string | null;
  /**
   * BigSMILES-like assembly `left{[<]repeat[>]}right`; end groups appear
   * verbatim with terminal attachment stars stripped.
   */
  bigSmiles: string;
}

/** Failed extraction with a user-facing error message. */
export interface BookendExtractionFailure {
  ok: false;
  error: string;
}

/** Result of {@link extractBookendRegion}. */
export type BookendExtraction =
  | BookendExtractionSuccess
  | BookendExtractionFailure;

/** Result of {@link cutChunkFragments}. */
export type ChunkCutResult =
  | {
      ok: true;
      /** Fragments in canvas atom order, one per block between cuts. */
      fragments: BookendFragmentRecord[];
      /**
       * Chained BigSMILES-like notation: each block's SMILES with `[?:n]`
       * wildcards rewritten to `[<]` / `[>]` descriptors, wrapped in braces
       * and concatenated in fragment order.
       */
      chainNotation: string;
    }
  | { ok: false; error: string };

/**
 * Resolves a bond mark (atom pair) to the current bond index, or -1 when the
 * atoms are out of range or no longer bonded.
 */
export function resolveBondMark(mol: Molecule, mark: DrawBondMark): number {
  const n = mol.getAllAtoms();
  if (
    mark.atomA < 0 ||
    mark.atomB < 0 ||
    mark.atomA >= n ||
    mark.atomB >= n ||
    mark.atomA === mark.atomB
  ) {
    return -1;
  }
  return findBondIndex(mol, mark.atomA, mark.atomB);
}

/**
 * Collects bond marks for bonds that cross the boundary of a selected atom set
 * (exactly one endpoint selected). Used to place chunk cuts around a marquee
 * selection for BigSMILES block classification.
 */
export function boundaryBondMarksForAtoms(
  mol: Molecule,
  selectedAtoms: ReadonlySet<number>,
): DrawBondMark[] {
  if (selectedAtoms.size === 0) {
    return [];
  }
  const marks: DrawBondMark[] = [];
  for (let b = 0; b < mol.getBonds(); b += 1) {
    const atomA = mol.getBondAtom(0, b);
    const atomB = mol.getBondAtom(1, b);
    const aSelected = selectedAtoms.has(atomA);
    const bSelected = selectedAtoms.has(atomB);
    if (aSelected !== bSelected) {
      marks.push({ atomA, atomB });
    }
  }
  return marks;
}

/** Reports whether two bond marks refer to the same unordered atom pair. */
export function bondMarksEqual(a: DrawBondMark, b: DrawBondMark): boolean {
  return (
    (a.atomA === b.atomA && a.atomB === b.atomB) ||
    (a.atomA === b.atomB && a.atomB === b.atomA)
  );
}

/**
 * Validates that a bond may carry a bookend or chunk cut: it must be a plain
 * single bond (order one, not dative), must not be part of any ring, and both
 * endpoints must be heavy atoms.
 *
 * @param mol - Molecule containing the bond; helper arrays are ensured.
 * @param bond - Bond index to validate.
 * @returns A user-facing error message, or null when the bond is markable.
 */
export function validateMarkableBond(mol: Molecule, bond: number): string | null {
  if (bond < 0 || bond >= mol.getBonds()) {
    return "That bond no longer exists.";
  }
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  if (mol.getBondType(bond) === MoleculeCtor.cBondTypeMetalLigand) {
    return "Bookends and cuts cannot be placed on dative bonds.";
  }
  if (mol.isRingBond(bond)) {
    return "Bookends and cuts cannot cross a ring bond; pick an acyclic single bond.";
  }
  if (mol.getBondOrder(bond) !== 1) {
    return "Bookends and cuts require a single bond.";
  }
  const a0 = mol.getBondAtom(0, bond);
  const a1 = mol.getBondAtom(1, bond);
  if (mol.getAtomicNo(a0) <= 1 || mol.getAtomicNo(a1) <= 1) {
    return "Bookends and cuts must sit between heavy atoms.";
  }
  return null;
}

interface CutSpec {
  mark: DrawBondMark;
  label: number;
}

/**
 * Cuts the listed bonds on a compact copy of the molecule, planting map-
 * numbered attachment atoms (atomic number zero) on both sides of each cut,
 * and returns the resulting fragments with mapped SMILES. Returns null when
 * any mark fails to resolve.
 */
function cutOnCopy(
  mol: Molecule,
  cuts: CutSpec[],
): { fragments: Molecule[]; smiles: string[] } | null {
  const work = mol.getCompactCopy();
  work.ensureHelperArrays(MoleculeCtor.cHelperRings);

  const resolved: { atomA: number; atomB: number; label: number }[] = [];
  for (const cut of cuts) {
    const bond = resolveBondMark(work, cut.mark);
    if (bond < 0) {
      return null;
    }
    resolved.push({ atomA: cut.mark.atomA, atomB: cut.mark.atomB, label: cut.label });
  }

  for (const cut of resolved) {
    const bond = findBondIndex(work, cut.atomA, cut.atomB);
    if (bond < 0) {
      return null;
    }
    work.deleteBond(bond);
  }
  work.ensureHelperArrays(MoleculeCtor.cHelperNeighbours);

  for (const cut of resolved) {
    const sideA = work.addAtom(0);
    work.addBond(cut.atomA, sideA);
    work.setAtomMapNo(sideA, cut.label, false);
    const sideB = work.addAtom(0);
    work.addBond(cut.atomB, sideB);
    work.setAtomMapNo(sideB, cut.label, false);
  }
  work.ensureHelperArrays(MoleculeCtor.cHelperNeighbours);
  work.setFragment(true);

  const fragments = work.getFragments();
  const smiles: string[] = [];
  for (const fragment of fragments) {
    fragment.ensureHelperArrays(MoleculeCtor.cHelperNeighbours);
    fragment.setFragment(true);
    smiles.push(fragment.toIsomericSmiles({ includeMapping: true }));
  }
  return { fragments, smiles };
}

/** Collects the cut labels whose attachment atoms live in the fragment. */
function fragmentCutLabels(fragment: Molecule, labels: number[]): number[] {
  const present: number[] = [];
  for (const label of labels) {
    const n = fragment.getAllAtoms();
    for (let a = 0; a < n; a += 1) {
      if (fragment.getAtomicNo(a) === 0 && fragment.getAtomMapNo(a) === label) {
        present.push(label);
        break;
      }
    }
  }
  return present;
}

/**
 * Rewrites every `[?:label]` wildcard token OpenChemLib emits for mapped
 * attachment atoms into the given descriptor text.
 */
export function replaceWildcardLabel(
  smiles: string,
  label: number,
  descriptor: string,
): string {
  return smiles.split(`[?:${label}]`).join(descriptor);
}

/** Strips a single leading and trailing `[*]` attachment star for display. */
function stripTerminalStars(smiles: string): string {
  let out = smiles;
  if (out.startsWith("[*]")) {
    out = out.slice(3);
  }
  if (out.endsWith("[*]")) {
    out = out.slice(0, -3);
  }
  return out;
}

/**
 * Extracts the repeat unit bracketed by two bookend bonds.
 *
 * Both marks must resolve to distinct, markable bonds (see
 * {@link validateMarkableBond}); cutting them must yield a fragment touching
 * both cut sites, which becomes the repeat unit. Fragments touching only one
 * cut become end groups. The output SMILES carry `[<]` at the opening cut and
 * `[>]` at the closing cut, and the assembled string follows
 * `left{[<]repeat[>]}right`.
 *
 * @param mol - Drawn molecule; never mutated.
 * @param openMark - Bond carrying the `{` bookend.
 * @param closeMark - Bond carrying the `}` bookend.
 * @returns Discriminated result with the extraction or a user-facing error.
 */
export function extractBookendRegion(
  mol: Molecule,
  openMark: DrawBondMark,
  closeMark: DrawBondMark,
): BookendExtraction {
  if (bondMarksEqual(openMark, closeMark)) {
    return { ok: false, error: "Opening and closing bookends must sit on different bonds." };
  }
  const openBond = resolveBondMark(mol, openMark);
  const closeBond = resolveBondMark(mol, closeMark);
  if (openBond < 0 || closeBond < 0) {
    return { ok: false, error: "A bookend bond no longer exists; replace the bookends." };
  }
  const openError = validateMarkableBond(mol, openBond);
  if (openError !== null) {
    return { ok: false, error: openError };
  }
  const closeError = validateMarkableBond(mol, closeBond);
  if (closeError !== null) {
    return { ok: false, error: closeError };
  }

  const cut = cutOnCopy(mol, [
    { mark: openMark, label: 1 },
    { mark: closeMark, label: 2 },
  ]);
  if (cut === null) {
    return { ok: false, error: "A bookend bond no longer exists; replace the bookends." };
  }

  let repeatSmiles: string | null = null;
  let leftSmiles: string | null = null;
  let rightSmiles: string | null = null;
  for (let i = 0; i < cut.fragments.length; i += 1) {
    const fragment = cut.fragments[i];
    const smiles = cut.smiles[i];
    if (fragment === undefined || smiles === undefined) {
      continue;
    }
    const labels = fragmentCutLabels(fragment, [1, 2]);
    if (labels.length === 2) {
      if (repeatSmiles !== null) {
        return {
          ok: false,
          error: "Bookends bracket an ambiguous region; place them on one linear chain.",
        };
      }
      repeatSmiles = smiles;
    } else if (labels.length === 1 && labels[0] === 1) {
      leftSmiles = smiles;
    } else if (labels.length === 1 && labels[0] === 2) {
      rightSmiles = smiles;
    }
  }

  if (repeatSmiles === null) {
    return {
      ok: false,
      error:
        "No connected region lies between the bookends; both must cut the same chain.",
    };
  }

  const repeatUnitSmiles = replaceWildcardLabel(
    replaceWildcardLabel(repeatSmiles, 1, "[<]"),
    2,
    "[>]",
  );
  const leftEndSmiles =
    leftSmiles === null ? null : replaceWildcardLabel(leftSmiles, 1, "[*]");
  const rightEndSmiles =
    rightSmiles === null ? null : replaceWildcardLabel(rightSmiles, 2, "[*]");

  const leftText = leftEndSmiles === null ? "" : stripTerminalStars(leftEndSmiles);
  const rightText = rightEndSmiles === null ? "" : stripTerminalStars(rightEndSmiles);
  const bigSmiles = `${leftText}{${repeatUnitSmiles}}${rightText}`;

  return { ok: true, repeatUnitSmiles, leftEndSmiles, rightEndSmiles, bigSmiles };
}

/**
 * Cuts the molecule at every chunk mark and returns ordered block fragments
 * for BigSMILES-style classification.
 *
 * Each mark must resolve to a markable bond (see {@link validateMarkableBond});
 * duplicates are rejected. Fragment SMILES keep OpenChemLib's `[?:n]` mapped
 * wildcards so they plug directly into `fragmentsToBlockRecords`; the chained
 * notation rewrites each label to alternating `[<]` / `[>]` descriptors and
 * wraps every block in braces.
 *
 * @param mol - Drawn molecule; never mutated.
 * @param marks - Block-boundary bond marks in placement order.
 * @returns Discriminated result with fragments and chained notation, or a
 *   user-facing error.
 */
export function cutChunkFragments(
  mol: Molecule,
  marks: DrawBondMark[],
): ChunkCutResult {
  if (marks.length === 0) {
    return { ok: false, error: "Place at least one block cut on an acyclic single bond." };
  }
  for (let i = 0; i < marks.length; i += 1) {
    for (let j = i + 1; j < marks.length; j += 1) {
      const a = marks[i];
      const b = marks[j];
      if (a !== undefined && b !== undefined && bondMarksEqual(a, b)) {
        return { ok: false, error: "Two block cuts target the same bond." };
      }
    }
  }
  for (const mark of marks) {
    const bond = resolveBondMark(mol, mark);
    if (bond < 0) {
      return { ok: false, error: "A block cut bond no longer exists; clear the cuts." };
    }
    const error = validateMarkableBond(mol, bond);
    if (error !== null) {
      return { ok: false, error };
    }
  }

  const cut = cutOnCopy(
    mol,
    marks.map((mark, i) => ({ mark, label: i + 1 })),
  );
  if (cut === null) {
    return { ok: false, error: "A block cut bond no longer exists; clear the cuts." };
  }

  const allLabels = marks.map((_, i) => i + 1);
  const fragments: BookendFragmentRecord[] = [];
  for (let i = 0; i < cut.fragments.length; i += 1) {
    const fragment = cut.fragments[i];
    const smiles = cut.smiles[i];
    if (fragment === undefined || smiles === undefined) {
      continue;
    }
    fragments.push({
      index: i,
      smiles,
      cutLabels: fragmentCutLabels(fragment, allLabels),
    });
  }

  const chainNotation = fragments
    .map((fragment) => {
      let text = fragment.smiles;
      for (const label of fragment.cutLabels) {
        text = replaceWildcardLabel(text, label, label % 2 === 1 ? "[<]" : "[>]");
      }
      return `{${text}}`;
    })
    .join("");

  return { ok: true, fragments, chainNotation };
}
