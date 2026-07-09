/**
 * Pure graph-editing operations for the interactive molecule draw canvas.
 *
 * This module owns structural mutations on an OpenChemLib `Molecule` (atoms,
 * bonds, elements, charges, layout stabilization) plus serialization to and
 * from the canvas molfile. It deliberately excludes view-space concerns
 * (`molecule-draw-geometry.ts`) and polymer notation (`polymer-bookends.ts`).
 *
 * Serialization invariant: the draw canvas persists **V2000** molfiles because
 * OpenChemLib round-trips metal-ligand (dative) bonds through V2000 (bond type
 * 8) but its V3000 writer emits bond type 9 which its own parser does not read
 * back. Callers must use {@link serializeDrawMolfile} / {@link parseDrawMolfile}
 * rather than calling `toMolfileV3` on canvas molecules.
 */

import type { Molecule } from "openchemlib";
import { Molecule as MoleculeCtor } from "openchemlib";

import { formatAlkylCnH2nPlus1 } from "~/lib/chem-formula-subscripts";

import { normalizeEditorAlkylCustomLabels } from "./alkyl-label-expand";
import {
  abbreviateTerminalAlkylChains,
  countAbbreviableAlkylTails,
} from "./carbon-chain-abbr";
import { collectAtomsOnSideOfBond, findBondIndex } from "./bond-fragment-transforms";
import {
  abbreviateNitrileGroups,
  countCoalescibleNitrileGroups,
} from "./depiction-coalescence";
import {
  rotateAllCoordsAroundPoint,
  translateAllCoords,
} from "./molecule-2d-transforms";
import {
  DRAW_STANDARD_BOND_LENGTH,
  pickDefaultSproutPosition,
  snapSproutPosition,
  type DrawPoint,
} from "./molecule-draw-geometry";
import type { AbbreviatedAlkylTailSpec, CageDepictionMode, DrawBondKind, RingTemplateCategory } from "../molecule-draw-types";
import {
  buildCageTemplateLayout,
  cageBondDepthTierIndicesToMarks,
  remapCageBondDepthTierMarksAfterFusion,
  remapCageBondDepthTierMarksAfterMerge,
  ringTemplateUsesCageProjection,
  type CageBondDepthTierByMark,
} from "./cage-template-placement";
import { applyView3dAxisPreset, defaultView3d, type View3d } from "./molecule-3d-depth-wireframe";

/**
 * Common heteroatom symbols offered in the element palette, ordered by
 * frequency of use in organic and materials chemistry sketches.
 */
export const COMMON_HETEROATOM_SYMBOLS = [
  "C",
  "N",
  "O",
  "S",
  "P",
  "F",
  "Cl",
  "Br",
  "I",
  "B",
  "Si",
] as const;

/**
 * Transition-metal symbols offered in the atom editor for coordination complexes.
 */
export const COMMON_METAL_SYMBOLS = [
  "Cu",
  "Fe",
  "Zn",
  "Ni",
  "Co",
  "Mn",
  "Pd",
  "Pt",
  "Ag",
  "Au",
] as const;

/**
 * Serializes a canvas molecule to its V2000 molfile string. V2000 is required
 * so dative (metal-ligand) bonds survive a parse round trip; see module docs.
 *
 * @param mol - Molecule to serialize; not mutated.
 * @returns V2000 molfile text.
 */
export function serializeDrawMolfile(mol: Molecule): string {
  return mol.toMolfile();
}

/**
 * Parses a canvas molfile (V2000 or V3000) into a fresh `Molecule` with ring
 * helper arrays prepared.
 *
 * @param molfile - Molfile text previously produced by the canvas or seeded
 *   from another source.
 * @returns Parsed molecule.
 * @throws Error when OpenChemLib cannot parse the molfile.
 */
export function parseDrawMolfile(molfile: string): Molecule {
  const mol = MoleculeCtor.fromMolfile(molfile);
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  return mol;
}

/**
 * Produces the molfile for an empty canvas (zero atoms, zero bonds).
 */
export function emptyDrawMolfile(): string {
  return new MoleculeCtor(0, 0).toMolfile();
}

/**
 * Reports whether the molecule has no atoms.
 */
export function moleculeIsEmpty(mol: Molecule): boolean {
  return mol.getAllAtoms() === 0;
}

/**
 * Maps a draw bond kind to the OpenChemLib bond type constant used by
 * `setBondType`. Dative maps to `cBondTypeMetalLigand`.
 */
export function oclBondTypeForKind(kind: DrawBondKind): number {
  switch (kind) {
    case "single":
      return MoleculeCtor.cBondTypeSingle;
    case "double":
      return MoleculeCtor.cBondTypeDouble;
    case "triple":
      return MoleculeCtor.cBondTypeTriple;
    case "dative":
      return MoleculeCtor.cBondTypeMetalLigand;
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unsupported bond kind: ${String(exhaustive)}`);
    }
  }
}

/**
 * Classifies an existing bond as one of the draw kinds. Stereo wedge bonds
 * (up, down, cross) report `single` since their order is one; callers that
 * preserve wedges must check `getBondType` before rewriting the bond.
 *
 * @param mol - Molecule containing the bond.
 * @param bond - Bond index in `[0, mol.getBonds())`.
 * @returns Draw bond kind for the bond.
 * @throws RangeError when the bond index is out of range.
 */
export function drawBondKindOf(mol: Molecule, bond: number): DrawBondKind {
  assertBondIndex(mol, bond);
  if (mol.getBondType(bond) === MoleculeCtor.cBondTypeMetalLigand) {
    return "dative";
  }
  const order = mol.getBondOrder(bond);
  if (order >= 3) {
    return "triple";
  }
  if (order === 2) {
    return "double";
  }
  return "single";
}

/**
 * Adds a disconnected atom at the given 2D molecule-space coordinates and
 * starts a new fragment.
 *
 * @param mol - Molecule to mutate.
 * @param x - Molecule-space x coordinate.
 * @param y - Molecule-space y coordinate (chemistry convention, y up).
 * @param atomicNo - Atomic number for the new atom (6 for carbon).
 * @returns Index of the new atom.
 */
export function addIsolatedAtom(
  mol: Molecule,
  x: number,
  y: number,
  atomicNo: number,
): number {
  const atom = mol.addAtom(atomicNo);
  mol.setAtomX(atom, x);
  mol.setAtomY(atom, y);
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  return atom;
}

/**
 * Sprouts a new atom bonded to an existing atom, placing it at the given 2D
 * coordinates with the requested bond kind.
 *
 * @param mol - Molecule to mutate.
 * @param fromAtom - Existing atom index the bond starts from.
 * @param x - Molecule-space x for the new atom.
 * @param y - Molecule-space y for the new atom.
 * @param atomicNo - Atomic number for the new atom.
 * @param kind - Bond kind to create (`dative` points from `fromAtom` toward
 *   the new atom).
 * @returns Indices of the created atom and bond.
 * @throws RangeError when `fromAtom` is out of range.
 */
/**
 * Sprouts a carbon atom from `attachAtom` and labels it as an abbreviated alkyl
 * tail CnH2n+1 (database-style: one bond plus formula text, not a full chain).
 * The new atom receives the custom label; expand/abbreviate helpers treat it
 * like tails produced by {@link abbreviateTerminalAlkylChains}.
 *
 * @param mol - Molecule to mutate.
 * @param attachAtom - Existing atom that receives the new single bond.
 * @param spec - Tail length as carbon count n in CnH2n+1.
 * @param options.toward - Optional pointer target in molecule space; when set,
 *   sprout direction snaps like the draw tool; otherwise the widest free angle
 *   around `attachAtom` is used.
 * @returns Indices of the labeled tail atom and connecting bond.
 * @throws RangeError when `attachAtom` is out of range.
 * @throws Error when `spec.carbonCount` is not a positive integer.
 */
export function attachAbbreviatedAlkylTail(
  mol: Molecule,
  attachAtom: number,
  spec: AbbreviatedAlkylTailSpec,
  options?: { toward?: DrawPoint },
): { atom: number; bond: number } {
  assertAtomIndex(mol, attachAtom);
  if (!Number.isInteger(spec.carbonCount) || spec.carbonCount < 1) {
    throw new Error("Alkyl tail carbon count must be a positive integer.");
  }
  const from = { x: mol.getAtomX(attachAtom), y: mol.getAtomY(attachAtom) };
  const target =
    options?.toward !== undefined
      ? snapSproutPosition(from, options.toward, DRAW_STANDARD_BOND_LENGTH)
      : pickDefaultSproutPosition(mol, attachAtom);
  const { atom, bond } = addBondedAtom(mol, attachAtom, target.x, target.y, 6, "single");
  mol.setAtomCustomLabel(atom, formatAlkylCnH2nPlus1(spec.carbonCount));
  normalizeEditorAlkylCustomLabels(mol);
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  return { atom, bond };
}

export function addBondedAtom(
  mol: Molecule,
  fromAtom: number,
  x: number,
  y: number,
  atomicNo: number,
  kind: DrawBondKind,
): { atom: number; bond: number } {
  assertAtomIndex(mol, fromAtom);
  const atom = mol.addAtom(atomicNo);
  mol.setAtomX(atom, x);
  mol.setAtomY(atom, y);
  const bond = mol.addBond(fromAtom, atom);
  mol.setBondType(bond, oclBondTypeForKind(kind));
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  return { atom, bond };
}

/**
 * Connects two existing atoms with the requested bond kind. When a bond
 * already exists between them its type is rewritten instead of duplicating it.
 *
 * @param mol - Molecule to mutate.
 * @param atomA - First atom index.
 * @param atomB - Second atom index (must differ from `atomA`).
 * @param kind - Bond kind to apply.
 * @returns Index of the created or updated bond.
 * @throws Error when the atoms are identical; RangeError when out of range.
 */
export function connectAtoms(
  mol: Molecule,
  atomA: number,
  atomB: number,
  kind: DrawBondKind,
): number {
  assertAtomIndex(mol, atomA);
  assertAtomIndex(mol, atomB);
  if (atomA === atomB) {
    throw new Error("Cannot bond an atom to itself.");
  }
  const existing = findBondIndex(mol, atomA, atomB);
  if (existing >= 0) {
    mol.setBondType(existing, oclBondTypeForKind(kind));
    mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
    return existing;
  }
  const bond = mol.addBond(atomA, atomB);
  mol.setBondType(bond, oclBondTypeForKind(kind));
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  return bond;
}

/**
 * Cycles a bond through single, double, triple, and back to single. Dative
 * bonds reset to single on the first cycle. Stereo wedges are replaced by the
 * plain cycled type (the user explicitly retyped the bond).
 *
 * @param mol - Molecule to mutate.
 * @param bond - Bond index to cycle.
 * @returns The bond kind after cycling.
 * @throws RangeError when the bond index is out of range.
 */
export function cycleBondOrder(mol: Molecule, bond: number): DrawBondKind {
  const current = drawBondKindOf(mol, bond);
  const next: DrawBondKind =
    current === "single" ? "double" : current === "double" ? "triple" : "single";
  mol.setBondType(bond, oclBondTypeForKind(next));
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  return next;
}

/**
 * Rewrites a bond to the requested kind without cycling.
 *
 * @param mol - Molecule to mutate.
 * @param bond - Bond index to rewrite.
 * @param kind - Target bond kind.
 * @throws RangeError when the bond index is out of range.
 */
export function setBondKind(mol: Molecule, bond: number, kind: DrawBondKind): void {
  assertBondIndex(mol, bond);
  mol.setBondType(bond, oclBondTypeForKind(kind));
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
}

/**
 * Resolves an element symbol (case-sensitive IUPAC symbol such as `Cl`) to its
 * atomic number.
 *
 * @param symbol - Element symbol to resolve.
 * @returns Atomic number greater than zero.
 * @throws Error when the symbol is not a known element.
 */
export function atomicNoForSymbol(symbol: string): number {
  const trimmed = symbol.trim();
  if (!/^[A-Z][a-z]?$/u.test(trimmed)) {
    throw new Error(`"${symbol}" is not a valid element symbol.`);
  }
  const atomicNo = MoleculeCtor.getAtomicNoFromLabel(trimmed);
  if (atomicNo <= 0 || MoleculeCtor.cAtomLabel[atomicNo] !== trimmed) {
    throw new Error(`"${trimmed}" is not a known element.`);
  }
  return atomicNo;
}

/**
 * Reassigns the element of an existing atom.
 *
 * @param mol - Molecule to mutate.
 * @param atom - Atom index to change.
 * @param symbol - Element symbol (for example `N`, `O`, `Cl`).
 * @throws Error when the symbol is unknown; RangeError when out of range.
 */
export function setAtomElement(mol: Molecule, atom: number, symbol: string): void {
  assertAtomIndex(mol, atom);
  mol.setAtomicNo(atom, atomicNoForSymbol(symbol));
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
}

/**
 * Sets the formal charge on an atom. Charges flow through molfile and SMILES
 * output.
 *
 * @param mol - Molecule to mutate.
 * @param atom - Atom index to charge.
 * @param charge - Integer formal charge (clamped to [-4, 4] by the caller UI;
 *   no clamping here).
 * @throws RangeError when the atom index is out of range.
 */
export function setAtomChargeValue(mol: Molecule, atom: number, charge: number): void {
  assertAtomIndex(mol, atom);
  mol.setAtomCharge(atom, charge);
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
}

/**
 * Deletes an atom together with all bonds that reference it. Remaining atom
 * and bond indices are renumbered by OpenChemLib, so any caller-held marks
 * must be discarded after this call.
 *
 * @param mol - Molecule to mutate.
 * @param atom - Atom index to delete.
 * @throws RangeError when the atom index is out of range.
 */
export function deleteAtomCascade(mol: Molecule, atom: number): void {
  assertAtomIndex(mol, atom);
  mol.deleteAtom(atom);
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
}

/**
 * Deletes multiple atoms and their incident bonds in one mutation pass.
 * Indices are removed from highest to lowest so caller-supplied atom numbers
 * stay valid while the molecule renumbers.
 *
 * @param mol - Molecule to mutate.
 * @param atoms - Atom indices to delete; duplicates are ignored.
 * @throws RangeError when any atom index is out of range.
 */
export function deleteAtomsCascade(mol: Molecule, atoms: readonly number[]): void {
  const uniqueDescending = [...new Set(atoms)].sort((a, b) => b - a);
  for (const atom of uniqueDescending) {
    deleteAtomCascade(mol, atom);
  }
}

/**
 * Deletes a single bond, leaving both endpoint atoms in place. Bond indices
 * are renumbered, so caller-held marks must be discarded after this call.
 *
 * @param mol - Molecule to mutate.
 * @param bond - Bond index to delete.
 * @throws RangeError when the bond index is out of range.
 */
export function deleteBondOnly(mol: Molecule, bond: number): void {
  assertBondIndex(mol, bond);
  mol.deleteBond(bond);
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
}

/**
 * Recomputes idealized 2D coordinates for every fragment using OpenChemLib's
 * CoordinateInventor (the "stabilize" action). Runs with a fixed seed so the
 * result is deterministic for a given graph, and keeps explicit hydrogens the
 * user drew. Atom and bond indices are preserved; only coordinates change.
 * Connectivity, stereochemistry, and fragment orientation relative to one
 * another are unchanged; bond angles and lengths are normalized. The inventor
 * may rotate or translate each disconnected fragment as a rigid body when
 * assigning coordinates—the canvas re-fits its viewport afterwards.
 *
 * @param mol - Molecule to mutate in place.
 */
export function stabilizeLayout(mol: Molecule): void {
  mol.inventCoordinates({ seed: 0, keepHydrogens: true });
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
}

/** Counts returned by {@link prepareMoleculeForDatabase}. */
export interface PrepareForDatabaseCounts {
  /** Terminal alkyl chains abbreviated to CnH2n+1 labels. */
  alkylAbbreviated: number;
  /** Nitrile groups abbreviated as CN. */
  nitrileAbbreviated: number;
}

/**
 * Normalizes a drawn structure for Atlas database upload by abbreviating
 * terminal alkyl tails to CnH2n+1 labels and coalescing terminal nitrile
 * groups to CN/NC labels. Preserves the user's 2D rotation and orientation;
 * does not call {@link stabilizeLayout} or reinvent coordinates. Optional
 * whitespace compaction is separate via {@link cleanupMolecule2DSpacing}.
 *
 * Mutates `mol` in place. Call before canonical SMILES export or SVG snapshot
 * when the structure should match NEXAFS/molecule contribute conventions.
 *
 * @param mol - Molecule to prepare; mutated in place.
 * @returns Counts of alkyl and nitrile abbreviations applied.
 */
export function prepareMoleculeForDatabase(mol: Molecule): PrepareForDatabaseCounts {
  const alkylAbbreviated = abbreviateTerminalAlkylChains(mol);
  const nitrileAbbreviated = abbreviateNitrileGroups(mol);
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  return { alkylAbbreviated, nitrileAbbreviated };
}

/** Non-blocking readiness hints from {@link assessMoleculeDatabasePrep}. */
export interface MoleculeDatabasePrepAssessment {
  /** Terminal alkyl chains still drawn in full that prep would abbreviate. */
  abbreviableAlkylTails: number;
  /** Terminal C#N triple bonds still present that prep would coalesce. */
  coalescibleNitriles: number;
  /** Reader-facing hints; never block upload on their own. */
  warnings: string[];
}

/**
 * Inspects a drawing for upload-prep gaps without mutating it. Warnings are
 * informational: contributors may proceed with their chosen layout.
 *
 * @param mol - Molecule to assess; not mutated.
 * @returns Counts of pending abbreviations and human-readable warnings.
 */
export function assessMoleculeDatabasePrep(mol: Molecule): MoleculeDatabasePrepAssessment {
  const abbreviableAlkylTails = countAbbreviableAlkylTails(mol);
  const coalescibleNitriles = countCoalescibleNitrileGroups(mol);
  const warnings: string[] = [];
  if (abbreviableAlkylTails > 0) {
    warnings.push(
      `${abbreviableAlkylTails} long alkyl tail${abbreviableAlkylTails === 1 ? "" : "s"} still drawn in full; run Prepare for database to abbreviate.`,
    );
  }
  if (coalescibleNitriles > 0) {
    warnings.push(
      `${coalescibleNitriles} nitrile group${coalescibleNitriles === 1 ? "" : "s"} still use C#N triple bonds; run Prepare for database to label as CN.`,
    );
  }
  if (mol.getAllAtoms() === 0) {
    warnings.push("Draw a structure before upload prep.");
  }
  return { abbreviableAlkylTails, coalescibleNitriles, warnings };
}

/**
 * Computes the arithmetic mean of all atom coordinates in molecule space.
 */
export function moleculeCentroid2D(mol: Molecule): DrawPoint {
  const count = mol.getAllAtoms();
  if (count === 0) {
    return { x: 0, y: 0 };
  }
  let sumX = 0;
  let sumY = 0;
  for (let a = 0; a < count; a += 1) {
    sumX += mol.getAtomX(a);
    sumY += mol.getAtomY(a);
  }
  return { x: sumX / count, y: sumY / count };
}

/** Result of {@link placeRingTemplate} including optional cage depiction marks. */
export interface PlaceRingTemplateResult {
  /** Heavy atoms added by merging the template. */
  added: number;
  /** Depth tiers for cage bonds, keyed by atom pair after merge. */
  cageBondDepthTierByMark?: CageBondDepthTierByMark;
}

/**
 * Options for {@link placeRingTemplate} and {@link fuseRingTemplateOnBond}.
 */
export interface RingTemplatePlacementOptions {
  /** When `"cage"`, layout uses 3D conformer front-view projection. */
  templateCategory?: RingTemplateCategory;
  /** Cage depiction mode when {@link templateCategory} is `"cage"`. Defaults to `2d`. */
  cageDepictionMode?: CageDepictionMode;
  /** Camera orbit for cage projection in `3d` mode; defaults to the face preset. */
  cageView3d?: View3d;
}

function prepareTemplateMolecule(
  templateSmiles: string,
  options?: RingTemplatePlacementOptions,
): {
  template: Molecule;
  cageBondDepthTierByMark?: CageBondDepthTierByMark;
} {
  const trimmed = templateSmiles.trim();
  if (trimmed.length === 0) {
    throw new Error("Template SMILES is empty.");
  }
  if (
    options?.templateCategory !== undefined &&
    ringTemplateUsesCageProjection(options.templateCategory)
  ) {
    const mode = options.cageDepictionMode ?? "2d";
    const view =
      options.cageView3d ?? applyView3dAxisPreset(defaultView3d(), "face");
    const layout = buildCageTemplateLayout(trimmed, mode, view);
    if ("ok" in layout) {
      throw new Error(layout.message);
    }
    return {
      template: layout.molecule,
      cageBondDepthTierByMark: cageBondDepthTierIndicesToMarks(
        layout.molecule,
        layout.bondDepthTierByIndex,
      ),
    };
  }
  const template = MoleculeCtor.fromSmiles(trimmed);
  template.inventCoordinates({ seed: 0, keepHydrogens: true });
  template.ensureHelperArrays(MoleculeCtor.cHelperRings);
  return { template };
}

/**
 * Places a ring or fragment template onto the canvas molecule by parsing
 * `templateSmiles`, generating 2D coordinates, translating the template so
 * its atom centroid sits at `centerPoint`, and merging it with
 * {@link Molecule.addMolecule}. On an empty canvas the drawing becomes the
 * lone template; when atoms already exist the template is added as a new
 * disconnected fragment at the click location.
 *
 * Fullerene cages use 3D conformer projection instead of SMILES `inventCoordinates`.
 *
 * @param mol - Target molecule to mutate.
 * @param templateSmiles - SMILES for the template fragment.
 * @param centerPoint - Molecule-space point where the template centroid is placed.
 * @param options - Optional category hint for cage 3D projection.
 * @returns Atoms added and optional cage bond depth marks.
 * @throws Error when SMILES parsing or coordinate generation fails.
 */
export function placeRingTemplate(
  mol: Molecule,
  templateSmiles: string,
  centerPoint: DrawPoint,
  options?: RingTemplatePlacementOptions,
): PlaceRingTemplateResult {
  const { template, cageBondDepthTierByMark: templateDepthMarks } =
    prepareTemplateMolecule(templateSmiles, options);
  const atomCount = template.getAllAtoms();
  if (atomCount === 0) {
    return { added: 0 };
  }
  const centroid = moleculeCentroid2D(template);
  translateAllCoords(
    template,
    centerPoint.x - centroid.x,
    centerPoint.y - centroid.y,
  );
  const atomsBefore = mol.getAllAtoms();
  mol.addMolecule(template);
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  if (atomsBefore > 0) {
    stabilizeLayout(mol);
  }
  const added = mol.getAllAtoms() - atomsBefore;
  const cageBondDepthTierByMark =
    templateDepthMarks !== undefined
      ? remapCageBondDepthTierMarksAfterMerge(templateDepthMarks, atomsBefore)
      : undefined;
  return { added, cageBondDepthTierByMark };
}

/**
 * Merges a disconnected SMILES fragment onto the canvas at `centerPoint` without
 * re-stabilizing the existing drawing. Parses `smiles`, generates 2D coordinates
 * for the fragment only, translates its centroid to `centerPoint`, and merges
 * via {@link Molecule.addMolecule}. Use when composing structures from catalog
 * or pasted SMILES; use {@link loadSmiles} / {@link placeRingTemplate} when a
 * full-canvas relayout is acceptable.
 *
 * @param mol - Target molecule to mutate.
 * @param smiles - SMILES string for the fragment to add.
 * @param centerPoint - Molecule-space point where the fragment centroid is placed.
 * @returns Number of atoms added by the merge.
 * @throws Error when SMILES parsing or coordinate generation fails.
 */
export function addSmilesFragment(
  mol: Molecule,
  smiles: string,
  centerPoint: DrawPoint,
): number {
  const trimmed = smiles.trim();
  if (trimmed.length === 0) {
    throw new Error("SMILES is empty.");
  }
  const template = MoleculeCtor.fromSmiles(trimmed);
  template.inventCoordinates({ seed: 0, keepHydrogens: true });
  template.ensureHelperArrays(MoleculeCtor.cHelperRings);
  const atomCount = template.getAllAtoms();
  if (atomCount === 0) {
    return 0;
  }
  const centroid = moleculeCentroid2D(template);
  translateAllCoords(
    template,
    centerPoint.x - centroid.x,
    centerPoint.y - centroid.y,
  );
  const atomsBefore = mol.getAllAtoms();
  mol.addMolecule(template);
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  return mol.getAllAtoms() - atomsBefore;
}

/**
 * Picks a peripheral template bond to share when fusing a ring template onto an
 * existing bond. Prefers bonds whose endpoints have the fewest heavy-atom
 * neighbors so bicyclic templates fuse on an outer edge rather than a bridge.
 */
function pickTemplateFusionBond(template: Molecule): number {
  const bonds = template.getBonds();
  if (bonds === 0) {
    throw new Error("Template has no bonds to fuse.");
  }
  let bestBond = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let b = 0; b < bonds; b += 1) {
    const a0 = template.getBondAtom(0, b);
    const a1 = template.getBondAtom(1, b);
    const score = template.getConnAtoms(a0) + template.getConnAtoms(a1);
    if (score < bestScore) {
      bestScore = score;
      bestBond = b;
    }
  }
  return bestBond;
}

function bondSideScore(
  mol: Molecule,
  atomA: number,
  atomB: number,
  point: DrawPoint,
): number {
  const ax = mol.getAtomX(atomA);
  const ay = mol.getAtomY(atomA);
  const bx = mol.getAtomX(atomB);
  const by = mol.getAtomY(atomB);
  const nx = -(by - ay);
  const ny = bx - ax;
  return (point.x - ax) * nx + (point.y - ay) * ny;
}

function templateNewAtomsCentroid(
  template: Molecule,
  skipAtoms: ReadonlySet<number>,
): DrawPoint {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (let a = 0; a < template.getAllAtoms(); a += 1) {
    if (skipAtoms.has(a)) {
      continue;
    }
    sumX += template.getAtomX(a);
    sumY += template.getAtomY(a);
    count += 1;
  }
  if (count === 0) {
    return { x: 0, y: 0 };
  }
  return { x: sumX / count, y: sumY / count };
}

function alignTemplateOnTargetBond(
  template: Molecule,
  templateBond: number,
  target: Molecule,
  targetBond: number,
  swapTemplateEnds: boolean,
  flip180: boolean,
): void {
  let tA = template.getBondAtom(0, templateBond);
  let tB = template.getBondAtom(1, templateBond);
  if (swapTemplateEnds) {
    const tmp = tA;
    tA = tB;
    tB = tmp;
  }
  const aA = target.getBondAtom(0, targetBond);
  const aB = target.getBondAtom(1, targetBond);
  const dx = target.getAtomX(aA) - template.getAtomX(tA);
  const dy = target.getAtomY(aA) - template.getAtomY(tA);
  translateAllCoords(template, dx, dy);
  const ax = target.getAtomX(aA);
  const ay = target.getAtomY(aA);
  const bx = target.getAtomX(aB);
  const by = target.getAtomY(aB);
  const tx = template.getAtomX(tB);
  const ty = template.getAtomY(tB);
  const angTarget = Math.atan2(by - ay, bx - ax);
  const angTemplate = Math.atan2(ty - ay, tx - ax);
  let delta = angTarget - angTemplate;
  if (flip180) {
    delta += Math.PI;
  }
  rotateAllCoordsAroundPoint(template, ax, ay, delta);
}

function mergeAlignedTemplateOnBond(
  target: Molecule,
  template: Molecule,
  templateBond: number,
  targetBond: number,
  swapTemplateEnds: boolean,
): { added: number; atomMap: Map<number, number> } {
  let tA = template.getBondAtom(0, templateBond);
  let tB = template.getBondAtom(1, templateBond);
  if (swapTemplateEnds) {
    const tmp = tA;
    tA = tB;
    tB = tmp;
  }
  const aA = target.getBondAtom(0, targetBond);
  const aB = target.getBondAtom(1, targetBond);
  const atomMap = new Map<number, number>();
  atomMap.set(tA, aA);
  atomMap.set(tB, aB);
  let added = 0;
  for (let a = 0; a < template.getAllAtoms(); a += 1) {
    if (a === tA || a === tB) {
      continue;
    }
    const newAtom = target.addAtom(template.getAtomicNo(a));
    target.setAtomX(newAtom, template.getAtomX(a));
    target.setAtomY(newAtom, template.getAtomY(a));
    atomMap.set(a, newAtom);
    added += 1;
  }
  for (let b = 0; b < template.getBonds(); b += 1) {
    const u = template.getBondAtom(0, b);
    const v = template.getBondAtom(1, b);
    const mappedU = atomMap.get(u);
    const mappedV = atomMap.get(v);
    if (mappedU === undefined || mappedV === undefined) {
      continue;
    }
    if (findBondIndex(target, mappedU, mappedV) >= 0) {
      continue;
    }
    target.addOrChangeBond(mappedU, mappedV, template.getBondOrder(b));
  }
  target.ensureHelperArrays(MoleculeCtor.cHelperRings);
  return { added, atomMap };
}

function chooseFusionOrientation(
  template: Molecule,
  templateBond: number,
  target: Molecule,
  targetBond: number,
  templateSmiles: string,
  options?: RingTemplatePlacementOptions,
): { swapTemplateEnds: boolean; flip180: boolean } {
  const aA = target.getBondAtom(0, targetBond);
  const aB = target.getBondAtom(1, targetBond);
  const sideA = collectAtomsOnSideOfBond(target, aA, aB, aA);
  const sideB = collectAtomsOnSideOfBond(target, aA, aB, aB);
  const bulkSide = sideA.size >= sideB.size ? sideA : sideB;
  let bulkScore = 0;
  for (const atom of bulkSide) {
    if (atom === aA || atom === aB) {
      continue;
    }
    bulkScore += bondSideScore(target, aA, aB, {
      x: target.getAtomX(atom),
      y: target.getAtomY(atom),
    });
  }
  const bulkSign = bulkScore === 0 ? 1 : Math.sign(bulkScore);
  const skip = new Set<number>([
    template.getBondAtom(0, templateBond),
    template.getBondAtom(1, templateBond),
  ]);
  let best = { swapTemplateEnds: false, flip180: false };
  let bestDistance = Number.NEGATIVE_INFINITY;
  for (const swapTemplateEnds of [false, true]) {
    for (const flip180 of [false, true]) {
      const { template: trial } = prepareTemplateMolecule(templateSmiles, options);
      trial.ensureHelperArrays(MoleculeCtor.cHelperRings);
      alignTemplateOnTargetBond(
        trial,
        templateBond,
        target,
        targetBond,
        swapTemplateEnds,
        flip180,
      );
      const centroid = templateNewAtomsCentroid(trial, skip);
      const centroidSide = bondSideScore(target, aA, aB, centroid);
      const separation =
        bulkSign === 0
          ? Math.abs(centroidSide)
          : centroidSide * -bulkSign;
      if (separation > bestDistance) {
        bestDistance = separation;
        best = { swapTemplateEnds, flip180 };
      }
    }
  }
  return best;
}

/** Result of {@link fuseRingTemplateOnBond} including optional cage depiction marks. */
export interface FuseRingTemplateResult {
  /** New heavy atoms added (template atoms minus the two shared fusion atoms). */
  added: number;
  /** Depth tiers for cage bonds after fusion merge. */
  cageBondDepthTierByMark?: CageBondDepthTierByMark;
}

/**
 * Fuses a ring template onto an existing bond by sharing that bond as one edge
 * of the template ring. Parses `templateSmiles`, aligns the template so a
 * peripheral template bond coincides with `bondIndex`, merges new template
 * atoms into `mol`, and preserves bond orders via {@link Molecule.addOrChangeBond}.
 *
 * Fullerene cages use 3D conformer projection instead of SMILES `inventCoordinates`.
 *
 * @param mol - Target molecule to mutate.
 * @param templateSmiles - SMILES for the ring template fragment.
 * @param bondIndex - Bond index in `mol` that becomes the shared fusion edge.
 * @param options - Optional category hint for cage 3D projection.
 * @returns Atoms added and optional cage bond depth marks.
 * @throws Error when SMILES parsing fails or `bondIndex` is out of range.
 */
export function fuseRingTemplateOnBond(
  mol: Molecule,
  templateSmiles: string,
  bondIndex: number,
  options?: RingTemplatePlacementOptions,
): FuseRingTemplateResult {
  assertBondIndex(mol, bondIndex);
  const { template, cageBondDepthTierByMark: templateDepthMarks } =
    prepareTemplateMolecule(templateSmiles, options);
  template.ensureHelperArrays(MoleculeCtor.cHelperRings);
  if (template.getAllAtoms() < 3) {
    throw new Error("Template must contain at least three atoms to fuse.");
  }
  const templateBond = pickTemplateFusionBond(template);
  const orientation = chooseFusionOrientation(
    template,
    templateBond,
    mol,
    bondIndex,
    templateSmiles,
    options,
  );
  alignTemplateOnTargetBond(
    template,
    templateBond,
    mol,
    bondIndex,
    orientation.swapTemplateEnds,
    orientation.flip180,
  );
  const { added, atomMap } = mergeAlignedTemplateOnBond(
    mol,
    template,
    templateBond,
    bondIndex,
    orientation.swapTemplateEnds,
  );
  const cageBondDepthTierByMark =
    templateDepthMarks !== undefined
      ? remapCageBondDepthTierMarksAfterFusion(templateDepthMarks, atomMap)
      : undefined;
  return { added, cageBondDepthTierByMark };
}

/**
 * Fuses a ring template onto an existing bond identified by its endpoint atoms.
 * When `atomA` and `atomB` are not bonded, throws; otherwise delegates to
 * {@link fuseRingTemplateOnBond}.
 *
 * @param mol - Target molecule to mutate.
 * @param templateSmiles - SMILES for the ring template fragment.
 * @param atomA - First endpoint of the shared fusion bond.
 * @param atomB - Second endpoint; must differ from `atomA` and be bonded to it.
 * @param options - Optional category hint for cage 3D projection.
 * @returns Atoms added and optional cage bond depth marks.
 * @throws Error when the atoms are not bonded or indices are invalid.
 */
export function fuseRingTemplateOnAtoms(
  mol: Molecule,
  templateSmiles: string,
  atomA: number,
  atomB: number,
  options?: RingTemplatePlacementOptions,
): FuseRingTemplateResult {
  assertAtomIndex(mol, atomA);
  assertAtomIndex(mol, atomB);
  if (atomA === atomB) {
    throw new Error("Fusion atoms must differ.");
  }
  const bondIndex = findBondIndex(mol, atomA, atomB);
  if (bondIndex < 0) {
    throw new Error("Fusion atoms are not bonded.");
  }
  return fuseRingTemplateOnBond(mol, templateSmiles, bondIndex, options);
}

/**
 * Computes the canonical isomeric SMILES of the molecule without mutating it.
 * Output is deterministic for equivalent graphs regardless of drawing order.
 * Dative bonds are an OpenChemLib SMILES limitation: metal-ligand bonds are
 * emitted as disconnected components, so callers should surface a note when
 * the molecule contains them.
 *
 * @param mol - Molecule to canonicalize; not mutated.
 * @returns Canonical isomeric SMILES (empty string for an empty molecule).
 */
export function canonicalSmilesOf(mol: Molecule): string {
  if (moleculeIsEmpty(mol)) {
    return "";
  }
  const copy = mol.getCompactCopy();
  copy.ensureHelperArrays(MoleculeCtor.cHelperNeighbours);
  return copy.toIsomericSmiles();
}

/**
 * Reports whether the molecule contains at least one dative (metal-ligand)
 * bond, used to surface the SMILES-export caveat in the UI.
 */
export function hasDativeBond(mol: Molecule): boolean {
  for (let b = 0; b < mol.getBonds(); b += 1) {
    if (mol.getBondType(b) === MoleculeCtor.cBondTypeMetalLigand) {
      return true;
    }
  }
  return false;
}

function assertAtomIndex(mol: Molecule, atom: number): void {
  if (!Number.isInteger(atom) || atom < 0 || atom >= mol.getAllAtoms()) {
    throw new RangeError(`Atom index ${atom} is out of range.`);
  }
}

function assertBondIndex(mol: Molecule, bond: number): void {
  if (!Number.isInteger(bond) || bond < 0 || bond >= mol.getBonds()) {
    throw new RangeError(`Bond index ${bond} is out of range.`);
  }
}
