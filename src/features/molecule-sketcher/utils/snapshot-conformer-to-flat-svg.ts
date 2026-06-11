import type { Molecule } from "openchemlib";
import { Molecule as MoleculeCtor } from "openchemlib";

import {
  DEFAULT_OCL_DEPICTION_TO_SVG_OPTIONS,
  type DepthWireframeOptions,
  type Molecule3dSession,
  type View3d,
} from "./molecule-3d-depth-wireframe";
import {
  buildProjectedBonds,
  computeBondVisibility,
  normalizeProjectedPlaneCoords,
  projectSessionAtoms,
  snapshotViewMatrix,
} from "./molecule-3d-projection";

/** Metadata returned alongside a flat SVG snapshot for audit and persistence hooks. */
export interface ConformerSnapshotMetadata {
  /** Row-major 3×3 view matrix applied before perspective divide. */
  viewMatrix: number[];
  /** Bond indices omitted because they are fully occluded at this viewpoint. */
  omittedBondIndices: number[];
  /** Count of omitted bonds. */
  omittedBondCount: number;
  /** Total bond count before occlusion filtering. */
  totalBondCount: number;
  /** Molfile V3000 of the flattened 2D structure (visible connectivity only in depiction). */
  flattenedMolfileV3: string;
}

/** Successful flat snapshot export. */
export interface ConformerSnapshotResult {
  ok: true;
  svg: string;
  metadata: ConformerSnapshotMetadata;
}

/** Failed flat snapshot export. */
export interface ConformerSnapshotFailure {
  ok: false;
  message: string;
}

export type SnapshotConformerToFlatSvgResult =
  | ConformerSnapshotResult
  | ConformerSnapshotFailure;

function applyPlaneCoordsToMolecule(
  mol: Molecule,
  x: number[],
  y: number[],
): void {
  const n = mol.getAtoms();
  for (let i = 0; i < n; i += 1) {
    mol.setAtomX(i, x[i]!);
    mol.setAtomY(i, y[i]!);
    mol.setAtomZ(i, 0);
  }
  mol.ensureHelperArrays(MoleculeCtor.cHelperCIP);
}

/**
 * Removes bonds occluded from the current viewpoint on a molecule clone used only for depiction.
 *
 * Deletion proceeds from highest bond index downward so indices remain stable.
 *
 * @param mol - Molecule clone; mutated in place.
 * @param omittedBondIndices - Bond indices to delete.
 */
export function removeOccludedBondsFromMolecule(
  mol: Molecule,
  omittedBondIndices: number[],
): void {
  const sorted = [...omittedBondIndices].sort((a, b) => b - a);
  for (const bi of sorted) {
    if (bi >= 0 && bi < mol.getBonds()) {
      mol.deleteBond(bi);
      mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
    }
  }
}

/**
 * Collapses the current 3D conformer and camera view to a flat 2D SVG suitable for storage.
 *
 * Bonds fully hidden behind others from the snapshot viewpoint are removed from the depiction
 * clone before SVG generation; connectivity metadata lists which bonds were dropped.
 *
 * @param session - Active 3D conformer session.
 * @param view - User orbit at snapshot time.
 * @param molfile2d - Canonical 2D molfile for stereo labels when atom count matches.
 * @param opts - SVG width, height, id, and theme flag.
 * @returns SVG string and snapshot metadata, or a failure message.
 */
export function snapshotConformerToFlatSvg(
  session: Molecule3dSession,
  view: View3d,
  molfile2d: string,
  opts: DepthWireframeOptions,
): SnapshotConformerToFlatSvgResult {
  const projected = projectSessionAtoms(session, view);
  const bonds = buildProjectedBonds(session, view);
  const visibility = computeBondVisibility(bonds);

  const projectedCoords = normalizeProjectedPlaneCoords(
    session.mol3d,
    projected,
  );

  let mol: MoleculeCtor;
  try {
    mol = MoleculeCtor.fromMolfile(molfile2d);
  } catch {
    mol = MoleculeCtor.fromMolfile(session.mol3d.toMolfileV3());
  }
  if (mol.getAtoms() !== projectedCoords.x.length) {
    mol = MoleculeCtor.fromMolfile(session.mol3d.toMolfileV3());
  }

  applyPlaneCoordsToMolecule(mol, projectedCoords.x, projectedCoords.y);
  removeOccludedBondsFromMolecule(mol, visibility.omittedBondIndices);
  mol.removeExplicitHydrogens();

  let svg: string;
  try {
    svg = mol.toSVG(opts.width, opts.height, opts.svgId, {
      ...DEFAULT_OCL_DEPICTION_TO_SVG_OPTIONS,
    });
  } catch {
    return { ok: false, message: "Could not render flat snapshot SVG." };
  }

  return {
    ok: true,
    svg,
    metadata: {
      viewMatrix: snapshotViewMatrix(session, view),
      omittedBondIndices: visibility.omittedBondIndices,
      omittedBondCount: visibility.omittedBondCount,
      totalBondCount: bonds.length,
      flattenedMolfileV3: mol.toMolfileV3(),
    },
  };
}
