/**
 * Fullerene cage template layout via 3D conformer generation and orthographic
 * or perspective projection. Both 2D and 3D modes keep the full bond set in the
 * molfile; depictions mute rear bonds using depth-tier grey styling.
 */

import type { Molecule } from "openchemlib";
import { Molecule as MoleculeCtor } from "openchemlib";

import type { BondDepthTier } from "~/lib/molecule-svg-3d-perspective";

import type { CageDepictionMode } from "../molecule-draw-types";
import type { View3d } from "./molecule-3d-depth-wireframe";
import {
  applyView3dAxisPreset,
  createMolecule3dSession,
  DEFAULT_OCL_DEPICTION_TO_SVG_OPTIONS,
  defaultView3d,
  type Molecule3dSession,
} from "./molecule-3d-depth-wireframe";
import { MOLECULE_2D_FIT_PADDING_PX } from "./molecule-2d-depiction-style";
import {
  buildCageProjectedBonds,
  buildOrthographicProjectedBonds,
  classifyBondDepthTiers,
  fitProjectedAtomsToUnitDisc,
  measureCagePlaneNormalizationScale,
  projectSessionAtomsCageWeak,
  normalizeProjectedPlaneCoords,
  projectSessionAtomsOrthographic,
  scaleMolecule3dSessionToUnitSphere,
  scaleProjectedPlaneCoords,
} from "./molecule-3d-projection";
import { bondMarkKey } from "../molecule-draw-types";

/** Successful {@link buildCageTemplateLayout} result. */
export interface CageTemplateLayout {
  /** Molecule clone with projected 2D coordinates; full connectivity retained. */
  molecule: Molecule;
  /** Depiction mode used to build coordinates and bond marks. */
  mode: CageDepictionMode;
  /** Depth tier per bond index for muted rear-bond styling in depictions. */
  bondDepthTierByIndex: Map<number, BondDepthTier>;
}

/** Failed cage layout build. */
export interface CageTemplateLayoutFailure {
  ok: false;
  message: string;
}

export type CageTemplateLayoutResult = CageTemplateLayout | CageTemplateLayoutFailure;

/** Atom-pair keys ({@link bondMarkKey}) mapping to front/back depth tiers for cage view. */
export type CageBondDepthTierByMark = Readonly<Record<string, BondDepthTier>>;

const CAGE_FRONT_VIEW: View3d = applyView3dAxisPreset(defaultView3d(), "face");

/** OpenChemLib `toSVG` options for all-carbon cage wireframes (no atom labels). */
export type CageOclDepictionOptions = Omit<
  typeof DEFAULT_OCL_DEPICTION_TO_SVG_OPTIONS,
  "autoCropMargin"
> & {
  autoCrop: true;
  autoCropMargin: number;
  showAtomNumber: false;
  showBondNumber: false;
  chiralTextBelowMolecule: false;
};

/**
 * Builds OpenChemLib depiction options for fullerene cage wireframes.
 *
 * @param width - Target SVG width in user units (thumbnails pass menu size).
 * @param height - Target SVG height in user units.
 * @returns Options merged with {@link DEFAULT_OCL_DEPICTION_TO_SVG_OPTIONS} that
 *   suppress implicit hydrogens, stereo/chiral text, and atom numbering.
 */
export function configureOclDepictionForCage(
  width: number,
  height: number,
): CageOclDepictionOptions {
  const shortSide = Math.min(width, height);
  return {
    ...DEFAULT_OCL_DEPICTION_TO_SVG_OPTIONS,
    autoCrop: true,
    autoCropMargin: shortSide <= 48 ? 4 : MOLECULE_2D_FIT_PADDING_PX,
    showAtomNumber: false,
    showBondNumber: false,
    chiralTextBelowMolecule: false,
  };
}

/**
 * Removes atom label text from a cage depiction SVG root so only bond strokes remain.
 *
 * @param svgRoot - Parsed OpenChemLib SVG document element.
 */
export function stripCageDepictionLabelsFromSvgRoot(svgRoot: Element): void {
  svgRoot.querySelectorAll("text").forEach((textEl) => {
    textEl.remove();
  });
}

/**
 * Removes atom label text from serialized cage depiction SVG markup.
 *
 * @param svgText - Raw OpenChemLib `toSVG` output.
 * @returns Markup with all `<text>` nodes removed.
 */
export function stripCageDepictionLabelsFromSvgMarkup(svgText: string): string {
  return svgText.replace(/<text\b[^>]*>[\s\S]*?<\/text>/gi, "");
}

/** Options for {@link projectCageSessionToPlane}. */
export interface CageProjectionOptions {
  /**
   * When set, skips median bond-length rescaling on every projection so orbit
   * drags and 2D/3D mode toggles preserve a stable spherical silhouette.
   */
  fixedPlaneScale?: number;
  /**
   * When `false`, {@link reapplyCageDepictionModeOnMolecule} updates bond marks
   * only and leaves canvas xy coordinates unchanged (2D/3D toolbar toggle).
   */
  touchCoordinates?: boolean;
}

/** One bond segment for the cage-orbit wireframe fast path. */
export interface CageOrbitWireframeBond {
  atom0: number;
  atom1: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  tier: BondDepthTier;
}

/** Lightweight cage-orbit frame for canvas wireframe rendering during drag. */
export interface CageOrbitWireframeFrame {
  planeX: number[];
  planeY: number[];
  bonds: CageOrbitWireframeBond[];
}

function applyPlaneCoordsToMolecule(mol: Molecule, x: number[], y: number[]): void {
  const n = mol.getAtoms();
  for (let i = 0; i < n; i += 1) {
    mol.setAtomX(i, x[i]!);
    mol.setAtomY(i, y[i]!);
    mol.setAtomZ(i, 0);
  }
  mol.ensureHelperArrays(MoleculeCtor.cHelperCIP);
}

function bondDepthTierIndicesToMarks(
  mol: Molecule,
  tiers: ReadonlyMap<number, BondDepthTier>,
): CageBondDepthTierByMark {
  const out: Record<string, BondDepthTier> = {};
  for (const [bondIndex, tier] of tiers) {
    if (bondIndex < 0 || bondIndex >= mol.getBonds()) {
      continue;
    }
    const atomA = mol.getBondAtom(0, bondIndex);
    const atomB = mol.getBondAtom(1, bondIndex);
    out[bondMarkKey(atomA, atomB)] = tier;
  }
  return out;
}

function fragmentCentroid(mol: Molecule, atomIndices: readonly number[]): { x: number; y: number } {
  let sumX = 0;
  let sumY = 0;
  for (const a of atomIndices) {
    sumX += mol.getAtomX(a);
    sumY += mol.getAtomY(a);
  }
  const n = atomIndices.length;
  return { x: sumX / n, y: sumY / n };
}

function cageFragmentsFromDepthMarks(
  depthMarks: CageBondDepthTierByMark,
): number[][] {
  const bondKeys = Object.keys(depthMarks);
  if (bondKeys.length === 0) {
    return [];
  }

  const parent = new Map<number, number>();
  const find = (atom: number): number => {
    let root = atom;
    while (parent.has(root)) {
      root = parent.get(root)!;
    }
    let current = atom;
    while (current !== root) {
      const next = parent.get(current)!;
      parent.set(current, root);
      current = next;
    }
    return root;
  };
  const unite = (atomA: number, atomB: number): void => {
    const rootA = find(atomA);
    const rootB = find(atomB);
    if (rootA !== rootB) {
      parent.set(rootA, rootB);
    }
  };

  const allAtoms = new Set<number>();
  for (const key of bondKeys) {
    const parts = key.split(":");
    const atomA = Number.parseInt(parts[0] ?? "", 10);
    const atomB = Number.parseInt(parts[1] ?? "", 10);
    if (!Number.isFinite(atomA) || !Number.isFinite(atomB)) {
      continue;
    }
    allAtoms.add(atomA);
    allAtoms.add(atomB);
    unite(atomA, atomB);
  }

  const groups = new Map<number, number[]>();
  for (const atom of allAtoms) {
    const root = find(atom);
    const group = groups.get(root) ?? [];
    group.push(atom);
    groups.set(root, group);
  }
  return [...groups.values()];
}

function expandCageFragmentViaConnectivity(
  mol: Molecule,
  fragment: readonly number[],
): number[] {
  if (fragment.length === 0) {
    return [];
  }
  const visited = new Set<number>();
  const queue = [...fragment];
  while (queue.length > 0) {
    const atom = queue.pop()!;
    if (visited.has(atom)) {
      continue;
    }
    visited.add(atom);
    const neighborCount = mol.getConnAtoms(atom);
    for (let i = 0; i < neighborCount; i += 1) {
      const neighbor = mol.getConnAtom(atom, i);
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }
  return [...visited];
}

function cageFragmentsForOrbitAlignment(
  mol: Molecule,
  depthMarks: CageBondDepthTierByMark,
): number[][] {
  return cageFragmentsFromDepthMarks(depthMarks).map((fragment) =>
    expandCageFragmentViaConnectivity(mol, fragment),
  );
}

function translatePlaneCoordsForFragment(
  mol: Molecule,
  frag: readonly number[],
  planeX: readonly number[],
  planeY: readonly number[],
): void {
  const oldCentroid = fragmentCentroid(mol, frag);
  let sumNewX = 0;
  let sumNewY = 0;
  for (const a of frag) {
    sumNewX += planeX[a]!;
    sumNewY += planeY[a]!;
  }
  const n = frag.length;
  const dx = oldCentroid.x - sumNewX / n;
  const dy = oldCentroid.y - sumNewY / n;
  for (const a of frag) {
    mol.setAtomX(a, planeX[a]! + dx);
    mol.setAtomY(a, planeY[a]! + dy);
    mol.setAtomZ(a, 0);
  }
}

/**
 * Projects a 3D session to normalized plane coordinates for the given cage mode.
 *
 * @param session - Active conformer session from {@link createMolecule3dSession}.
 * @param mode - `2d` uses orthographic projection; `3d` uses cage-tuned perspective.
 * @param view - Camera orbit; cage placement uses the face preset.
 * @returns Plane x/y arrays, per-atom depth, depth tiers, and layout scale.
 */
export function projectCageSessionToPlane(
  session: Molecule3dSession,
  mode: CageDepictionMode,
  view: View3d = CAGE_FRONT_VIEW,
  options?: CageProjectionOptions,
): {
  x: number[];
  y: number[];
  atomDepth: number[];
  bondDepthTierByIndex: Map<number, BondDepthTier>;
  planeScale: number;
} {
  const unitSession = scaleMolecule3dSessionToUnitSphere(session);
  if (mode === "2d") {
    const projected = projectSessionAtomsOrthographic(unitSession, view);
    const planeScale =
      options?.fixedPlaneScale ??
      measureCagePlaneNormalizationScale(session.mol3d, projected);
    const normalized =
      options?.fixedPlaneScale !== undefined
        ? scaleProjectedPlaneCoords(projected, options.fixedPlaneScale)
        : normalizeProjectedPlaneCoords(session.mol3d, projected);
    const bonds = buildOrthographicProjectedBonds(unitSession, view);
    const bondDepthTierByIndex = classifyBondDepthTiers(bonds);
    return {
      x: normalized.x,
      y: normalized.y,
      atomDepth: normalized.z,
      bondDepthTierByIndex,
      planeScale,
    };
  }

  const weakProjected = fitProjectedAtomsToUnitDisc(
    projectSessionAtomsCageWeak(unitSession, view),
  );
  const planeScale =
    options?.fixedPlaneScale ??
    measureCagePlaneNormalizationScale(session.mol3d, weakProjected);
  const normalized =
    options?.fixedPlaneScale !== undefined
      ? scaleProjectedPlaneCoords(weakProjected, options.fixedPlaneScale)
      : normalizeProjectedPlaneCoords(session.mol3d, weakProjected);
  const bonds = buildCageProjectedBonds(session, view);
  const bondDepthTierByIndex = classifyBondDepthTiers(bonds);
  return {
    x: normalized.x,
    y: normalized.y,
    atomDepth: normalized.z,
    bondDepthTierByIndex,
    planeScale,
  };
}

/**
 * Measures the layout scale for a cage session at the face-on view; callers cache
 * this value and pass it as {@link CageProjectionOptions.fixedPlaneScale} during orbit.
 *
 * @param session - MMFF-relaxed unit-sphere cage session.
 * @param view - View preset; defaults to the face-on cage view.
 * @returns Multiplier for {@link scaleProjectedPlaneCoords}.
 */
export function measureCageFacePlaneScale(
  session: Molecule3dSession,
  view: View3d = CAGE_FRONT_VIEW,
): number {
  const unitSession = scaleMolecule3dSessionToUnitSphere(session);
  const weakProjected = fitProjectedAtomsToUnitDisc(
    projectSessionAtomsCageWeak(unitSession, view),
  );
  return measureCagePlaneNormalizationScale(session.mol3d, weakProjected);
}

/**
 * Builds cage layout marks and plane coordinates from an existing 3D session.
 *
 * @param session - Conformer session whose atom indices match the target molecule.
 * @param mode - Cage depiction mode.
 * @returns Plane coordinates and bond marks for the session molecule.
 */
export function buildCageLayoutFromSession(
  session: Molecule3dSession,
  mode: CageDepictionMode,
  view: View3d = CAGE_FRONT_VIEW,
  options?: CageProjectionOptions,
): {
  x: number[];
  y: number[];
  bondDepthTierByIndex: Map<number, BondDepthTier>;
  planeScale: number;
} {
  const { x, y, bondDepthTierByIndex, planeScale } = projectCageSessionToPlane(
    session,
    mode,
    view,
    options,
  );
  return { x, y, bondDepthTierByIndex, planeScale };
}

/**
 * Builds a cage template molecule with projected coordinates from a 3D conformer.
 *
 * Both `2d` (orthographic) and `3d` (perspective) modes retain all bonds in the
 * molfile and return depth tiers for muted rear-bond styling in depictions.
 *
 * @param templateSmiles - Tabulated fullerene SMILES (for example C60, C70).
 * @param mode - Cage depiction mode; defaults to `2d`.
 * @param view - Camera orbit for projection.
 * @returns Layout with projected coords and depth-tier marks, or a failure message.
 */
export function buildCageTemplateLayout(
  templateSmiles: string,
  mode: CageDepictionMode = "2d",
  view: View3d = CAGE_FRONT_VIEW,
): CageTemplateLayoutResult {
  const trimmed = templateSmiles.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: "Template SMILES is empty." };
  }

  let template: Molecule;
  try {
    template = MoleculeCtor.fromSmiles(trimmed);
  } catch {
    return { ok: false, message: "Could not parse fullerene SMILES." };
  }

  const sessionResult = createMolecule3dSession(template);
  if (!sessionResult.ok) {
    return { ok: false, message: sessionResult.message };
  }

  const { x, y, bondDepthTierByIndex } = buildCageLayoutFromSession(
    sessionResult.session,
    mode,
    view,
  );

  if (x.length !== template.getAllAtoms()) {
    return { ok: false, message: "3D projection atom count mismatch." };
  }

  applyPlaneCoordsToMolecule(template, x, y);
  template.ensureHelperArrays(MoleculeCtor.cHelperRings);

  return {
    molecule: template,
    mode,
    bondDepthTierByIndex,
  };
}

/**
 * Converts bond-index depth tiers to atom-pair marks on a molecule.
 *
 * @param mol - Molecule whose bond indices define the tiers.
 * @param bondDepthTierByIndex - Map from bond index to depth tier.
 * @returns Record keyed by {@link bondMarkKey}.
 */
export function cageBondDepthTierIndicesToMarks(
  mol: Molecule,
  bondDepthTierByIndex: ReadonlyMap<number, BondDepthTier>,
): CageBondDepthTierByMark {
  return bondDepthTierIndicesToMarks(mol, bondDepthTierByIndex);
}

/**
 * Resolves depth-tier marks to a bond-index map on a molecule.
 *
 * @param mol - Current editor molecule.
 * @param marks - Atom-pair keyed depth tiers from placement or fusion.
 * @returns Map from bond index to `"front"` or `"back"`.
 */
export function cageBondDepthTierMapFromMarks(
  mol: Molecule,
  marks: CageBondDepthTierByMark,
): Map<number, BondDepthTier> {
  const out = new Map<number, BondDepthTier>();
  for (const key of Object.keys(marks)) {
    const tier = marks[key];
    if (tier === undefined) {
      continue;
    }
    const parts = key.split(":");
    const atomA = Number.parseInt(parts[0] ?? "", 10);
    const atomB = Number.parseInt(parts[1] ?? "", 10);
    if (!Number.isFinite(atomA) || !Number.isFinite(atomB)) {
      continue;
    }
    for (let b = 0; b < mol.getBonds(); b += 1) {
      const u = mol.getBondAtom(0, b);
      const v = mol.getBondAtom(1, b);
      if ((u === atomA && v === atomB) || (u === atomB && v === atomA)) {
        out.set(b, tier);
        break;
      }
    }
  }
  return out;
}

/** Cage depiction marks resolved for a single render pass. */
export interface ResolvedCageDepictionOptions {
  /** Depth tier marks for muted rear-bond styling in both 2D and 3D cage views. */
  depthMarks: CageBondDepthTierByMark;
}

/**
 * Clones a draw-canvas molecule for depiction using V2000 molfile round-trip.
 *
 * Draw-canvas molecules must use {@link Molecule.toMolfile} (V2000), not
 * `toMolfileV3`, so bond connectivity survives the clone.
 *
 * @param mol - Live editor molecule; not mutated.
 * @returns Independent clone with identical atoms and bonds.
 */
export function cloneDrawCanvasMolecule(mol: Molecule): Molecule {
  return MoleculeCtor.fromMolfile(mol.toMolfile());
}

/**
 * Resolves cage depth-tier marks for canvas, snapshot, and thumbnail rendering.
 *
 * @param depthMarks - Stored depth-tier marks from placement or mode switch.
 * @returns Marks to pass into depiction cloning and depth styling.
 */
export function resolveCageDepictionOptions(
  depthMarks: CageBondDepthTierByMark,
): ResolvedCageDepictionOptions {
  return { depthMarks };
}

/**
 * Re-projects cage fragments on a molecule to a new depiction mode without changing connectivity.
 *
 * Preserves each cage fragment's canvas centroid while updating coordinates and depth tiers.
 *
 * @param mol - Editor molecule to mutate in place.
 * @param mode - Target cage depiction mode (`2d` orthographic or `3d` perspective).
 * @param depthMarks - Current depth-tier marks identifying cage bonds.
 * @param view - Active cage orbit; unchanged between mode toggles.
 * @returns Updated depth-tier marks for the new mode.
 */
export function reapplyCageDepictionModeOnMolecule(
  mol: Molecule,
  mode: CageDepictionMode,
  depthMarks: CageBondDepthTierByMark,
  view: View3d = CAGE_FRONT_VIEW,
  sessionOverride?: Molecule3dSession,
  options?: CageProjectionOptions,
): {
  depthMarks: CageBondDepthTierByMark;
  planeScale: number;
} {
  const cageFragments = cageFragmentsForOrbitAlignment(mol, depthMarks);
  if (cageFragments.length === 0) {
    return { depthMarks: {}, planeScale: 1 };
  }

  const sessionResult =
    sessionOverride !== undefined
      ? ({ ok: true as const, session: sessionOverride })
      : createMolecule3dSession(mol);
  if (!sessionResult.ok) {
    return { depthMarks, planeScale: 1 };
  }

  const layout = buildCageLayoutFromSession(
    sessionResult.session,
    mode,
    view,
    options,
  );
  if (options?.touchCoordinates !== false) {
    for (const frag of cageFragments) {
      translatePlaneCoordsForFragment(mol, frag, layout.x, layout.y);
    }
    mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  }

  const newDepth: Record<string, BondDepthTier> = {};
  for (const frag of cageFragments) {
    const fragSet = new Set(frag);
    for (const [bondIndex, tier] of layout.bondDepthTierByIndex) {
      const atomA = mol.getBondAtom(0, bondIndex);
      const atomB = mol.getBondAtom(1, bondIndex);
      if (fragSet.has(atomA) && fragSet.has(atomB)) {
        newDepth[bondMarkKey(atomA, atomB)] = tier;
      }
    }
  }

  return {
    depthMarks: newDepth,
    planeScale: layout.planeScale,
  };
}

/**
 * Builds a wireframe-only cage-orbit frame without mutating the editor molecule.
 *
 * Used as a lightweight projection preview helper and in regression tests.
 *
 * @param mol - Current editor molecule (coordinates used for fragment centroids).
 * @param session - Cached MMFF cage session with unit-sphere centered coords.
 * @param view - Active orbit view.
 * @param depthMarks - Atom-pair depth tiers identifying cage bonds.
 * @param omittedMarks - Atom-pair omission marks identifying cage bonds.
 * @param planeScale - Cached face-on layout scale for stable weak perspective.
 * @returns Bond segments and plane coordinates for wireframe overlay rendering.
 */
export function buildCageOrbitWireframeFrame(
  mol: Molecule,
  session: Molecule3dSession,
  view: View3d,
  depthMarks: CageBondDepthTierByMark,
  planeScale: number,
): CageOrbitWireframeFrame {
  const cageFragments = cageFragmentsForOrbitAlignment(mol, depthMarks);
  const layout = buildCageLayoutFromSession(session, "3d", view, {
    fixedPlaneScale: planeScale,
  });
  const planeX = [...layout.x];
  const planeY = [...layout.y];
  for (const frag of cageFragments) {
    const oldCentroid = fragmentCentroid(mol, frag);
    let sumNewX = 0;
    let sumNewY = 0;
    for (const a of frag) {
      sumNewX += planeX[a]!;
      sumNewY += planeY[a]!;
    }
    const n = frag.length;
    const dx = oldCentroid.x - sumNewX / n;
    const dy = oldCentroid.y - sumNewY / n;
    for (const a of frag) {
      planeX[a] = planeX[a]! + dx;
      planeY[a] = planeY[a]! + dy;
    }
  }

  const tierByBondIndex = layout.bondDepthTierByIndex;
  const bonds: CageOrbitWireframeBond[] = [];
  for (let b = 0; b < mol.getBonds(); b += 1) {
    const tier = tierByBondIndex.get(b);
    if (tier === undefined) {
      continue;
    }
    const atom0 = mol.getBondAtom(0, b);
    const atom1 = mol.getBondAtom(1, b);
    bonds.push({
      atom0,
      atom1,
      x0: planeX[atom0]!,
      y0: planeY[atom0]!,
      x1: planeX[atom1]!,
      y1: planeY[atom1]!,
      tier,
    });
  }

  return { planeX, planeY, bonds };
}

/**
 * Writes a cage-orbit wireframe frame into a molecule, preserving each cage fragment
 * centroid while flattening z to zero.
 *
 * @param mol - Editor molecule to mutate in place.
 * @param frame - Last projected orbit frame (same coordinates shown during drag).
 * @param omittedMarks - Atom-pair omission marks identifying cage fragments.
 * @param depthMarks - Atom-pair depth-tier marks identifying cage fragments.
 * @returns Updated depth-tier marks derived from `frame.bonds`.
 */
export function applyCageOrbitWireframeFrameToMolecule(
  mol: Molecule,
  frame: CageOrbitWireframeFrame,
  depthMarks: CageBondDepthTierByMark,
): CageBondDepthTierByMark {
  const cageFragments = cageFragmentsForOrbitAlignment(mol, depthMarks);
  if (cageFragments.length === 0) {
    return depthMarks;
  }
  for (const frag of cageFragments) {
    translatePlaneCoordsForFragment(mol, frag, frame.planeX, frame.planeY);
  }
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);

  const newDepth: Record<string, BondDepthTier> = {};
  for (const frag of cageFragments) {
    const fragSet = new Set(frag);
    for (const bond of frame.bonds) {
      if (fragSet.has(bond.atom0) && fragSet.has(bond.atom1)) {
        newDepth[bondMarkKey(bond.atom0, bond.atom1)] = bond.tier;
      }
    }
  }
  return newDepth;
}

/**
 * Projects the current cage orbit view and commits plane coordinates to a molecule
 * using the same path as {@link buildCageOrbitWireframeFrame}.
 *
 * @param mol - Editor molecule to mutate in place.
 * @param session - Cached MMFF cage session for the molecule.
 * @param view - Active orbit view at pointerup.
 * @param omittedMarks - Stored 2D cage omission marks.
 * @param depthMarks - Stored 3D cage depth-tier marks.
 * @param planeScale - Cached layout scale from face-on placement.
 * @returns Updated depth-tier marks for the committed view.
 */
export function commitCageOrbitProjectionToMolecule(
  mol: Molecule,
  session: Molecule3dSession,
  view: View3d,
  depthMarks: CageBondDepthTierByMark,
  planeScale: number,
): CageBondDepthTierByMark {
  const frame = buildCageOrbitWireframeFrame(mol, session, view, depthMarks, planeScale);
  return applyCageOrbitWireframeFrameToMolecule(mol, frame, depthMarks);
}

/**
 * Remaps template depth-tier marks onto a merged target molecule.
 *
 * @param templateMarks - Marks on the template before merge.
 * @param atomIndexOffset - Target index of template atom 0 after merge.
 * @returns Marks keyed for the combined molecule.
 */
export function remapCageBondDepthTierMarksAfterMerge(
  templateMarks: CageBondDepthTierByMark,
  atomIndexOffset: number,
): CageBondDepthTierByMark {
  const out: Record<string, BondDepthTier> = {};
  for (const key of Object.keys(templateMarks)) {
    const tier = templateMarks[key];
    if (tier === undefined) {
      continue;
    }
    const parts = key.split(":");
    const atomA = Number.parseInt(parts[0] ?? "", 10);
    const atomB = Number.parseInt(parts[1] ?? "", 10);
    if (!Number.isFinite(atomA) || !Number.isFinite(atomB)) {
      continue;
    }
    out[bondMarkKey(atomA + atomIndexOffset, atomB + atomIndexOffset)] = tier;
  }
  return out;
}

/**
 * Remaps template depth-tier marks through a fusion atom index map.
 *
 * @param templateMarks - Marks on the template before merge.
 * @param atomMap - Template atom index to target atom index.
 * @returns Marks keyed for the fused target molecule.
 */
export function remapCageBondDepthTierMarksAfterFusion(
  templateMarks: CageBondDepthTierByMark,
  atomMap: ReadonlyMap<number, number>,
): CageBondDepthTierByMark {
  const out: Record<string, BondDepthTier> = {};
  for (const key of Object.keys(templateMarks)) {
    const tier = templateMarks[key];
    if (tier === undefined) {
      continue;
    }
    const parts = key.split(":");
    const templateA = Number.parseInt(parts[0] ?? "", 10);
    const templateB = Number.parseInt(parts[1] ?? "", 10);
    if (!Number.isFinite(templateA) || !Number.isFinite(templateB)) {
      continue;
    }
    const targetA = atomMap.get(templateA);
    const targetB = atomMap.get(templateB);
    if (targetA === undefined || targetB === undefined) {
      continue;
    }
    out[bondMarkKey(targetA, targetB)] = tier;
  }
  return out;
}

/**
 * Returns true when a ring template preset should use 3D cage projection.
 *
 * @param category - Ring template menu category.
 */
export function ringTemplateUsesCageProjection(
  category: "ring" | "macrocycle" | "cage",
): boolean {
  return category === "cage";
}
