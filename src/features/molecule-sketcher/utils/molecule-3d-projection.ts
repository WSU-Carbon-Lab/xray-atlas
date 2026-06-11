import type { Molecule } from "openchemlib";
import { Molecule as MoleculeCtor } from "openchemlib";

import type { BondDepthTier } from "~/lib/molecule-svg-3d-perspective";

import type { Molecule3dSession, View3d } from "./molecule-3d-depth-wireframe";

function matMul3(a: number[], b: number[]): number[] {
  const o = new Array<number>(9);
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      o[r * 3 + c] = 0;
      for (let k = 0; k < 3; k += 1) {
        o[r * 3 + c]! += a[r * 3 + k]! * b[k * 3 + c]!;
      }
    }
  }
  return o;
}

function matRotateX(rad: number): number[] {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [1, 0, 0, 0, c, -s, 0, s, c];
}

function matRotateY(rad: number): number[] {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}

function matRotateZ(rad: number): number[] {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

/**
 * Builds the combined intrinsic basis and user orbit rotation matrix.
 *
 * @param intrinsicRows - Row-major 3×3 session basis (PCA alignment).
 * @param view - User yaw, pitch, and roll.
 * @returns Row-major 3×3 matrix applied before perspective divide.
 */
export function combinedViewMatrix(intrinsicRows: number[], view: View3d): number[] {
  const Rz = matRotateZ(view.roll);
  const Ry = matRotateY(view.yaw);
  const Rx = matRotateX(view.pitch);
  const user = matMul3(Rz, matMul3(Ry, Rx));
  return matMul3(user, intrinsicRows);
}

/** Default perspective focal length in view-space units before panel scaling. */
export const DEFAULT_PERSPECTIVE_FOCAL = 520;

/** Weak-perspective focal length after unit-sphere normalization for cage 3D view. */
export const CAGE_PERSPECTIVE_FOCAL = 14;

/** Minimum camera distance offset so all atoms stay in front of the projection plane. */
export const MIN_CAMERA_Z_OFFSET = 0.12;

/** View-space coordinates for one atom after applying the session basis and user orbit. */
export interface ViewSpaceAtom {
  /** Atom index in the session molecule. */
  index: number;
  /** Horizontal coordinate in view space (before perspective divide). */
  x: number;
  /** Vertical coordinate in view space (SVG y increases downward after flip). */
  y: number;
  /** Depth toward the camera; larger values are closer to the viewer. */
  z: number;
}

/** Perspective-projected atom position in normalized plane coordinates (pre layout scaling). */
export interface ProjectedAtom2d {
  index: number;
  x: number;
  y: number;
  z: number;
}

/** One bond segment with endpoints in projected plane coordinates and linear depth. */
export interface ProjectedBond2d {
  bondIndex: number;
  atom0: number;
  atom1: number;
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
  /** Mean endpoint depth used for coarse ordering. */
  avgZ: number;
}

/** Result of z-buffer style bond visibility analysis for snapshot export. */
export interface BondVisibilityResult {
  /** Per bond index: true when any screen sample wins the depth buffer. */
  visibleByBondIndex: boolean[];
  /** Bond indices fully occluded from the current viewpoint. */
  omittedBondIndices: number[];
  /** Count of omitted bonds. */
  omittedBondCount: number;
}

/** Camera parameters derived from the conformer extent and current view. */
export interface PerspectiveCamera {
  focalLength: number;
  /** Closest atom depth in view space; used to convert depth to perspective distance. */
  zReferenceMax: number;
}

/**
 * Multiplies a 3×3 row-major matrix by a 3-vector.
 *
 * @param m - Nine matrix entries in row-major order.
 * @param p - Input vector `[x, y, z]`.
 * @returns Transformed vector.
 */
export function matVec3(
  m: number[],
  p: [number, number, number],
): [number, number, number] {
  return [
    m[0]! * p[0] + m[1]! * p[1] + m[2]! * p[2],
    m[3]! * p[0] + m[4]! * p[1] + m[5]! * p[2],
    m[6]! * p[0] + m[7]! * p[1] + m[8]! * p[2],
  ];
}

/**
 * Computes view-space coordinates for every atom in a 3D session at the given orbit.
 *
 * @param session - Centered conformer session with intrinsic PCA basis.
 * @param view - User yaw, pitch, roll, pan, and zoom.
 * @returns Parallel `x`, `y`, and `z` arrays indexed by atom; larger `z` is closer.
 */
export function computeViewSpaceCoords(
  session: Molecule3dSession,
  view: View3d,
): { x: number[]; y: number[]; z: number[] } {
  const R = combinedViewMatrix(session.rPca, view);
  const n = session.mol3d.getAtoms();
  const x: number[] = [];
  const y: number[] = [];
  const z: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const p: [number, number, number] = [
      session.centered[i * 3]!,
      session.centered[i * 3 + 1]!,
      session.centered[i * 3 + 2]!,
    ];
    const t = matVec3(R, p);
    x.push(t[0]);
    y.push(-t[1]);
    z.push(-t[2]);
  }
  return { x, y, z };
}

/**
 * Builds focal length and depth reference for a session view, honoring zoom.
 *
 * @param session - 3D conformer session.
 * @param view - Current orbit state; zoom scales focal length.
 * @returns Perspective camera parameters.
 */
export function buildPerspectiveCamera(
  session: Molecule3dSession,
  view: View3d,
  focalLength = DEFAULT_PERSPECTIVE_FOCAL,
): PerspectiveCamera {
  const { z } = computeViewSpaceCoords(session, view);
  let zMax = -Infinity;
  for (const zi of z) {
    zMax = Math.max(zMax, zi);
  }
  if (!Number.isFinite(zMax)) {
    zMax = 1;
  }
  const zoom = Math.max(0.25, Math.min(4, view.zoom));
  return {
    focalLength: focalLength * zoom,
    zReferenceMax: zMax,
  };
}

/**
 * Applies a perspective divide to one view-space point.
 *
 * Larger `viewZ` means closer to the camera and yields a larger screen coordinate
 * for the same view-space lateral offset.
 *
 * @param viewX - Horizontal view-space coordinate.
 * @param viewY - Vertical view-space coordinate (already flipped for SVG).
 * @param viewZ - Depth toward the camera.
 * @param camera - Focal length and closest-atom depth reference.
 * @returns Normalized plane coordinates before layout scaling.
 */
export function projectViewSpacePoint(
  viewX: number,
  viewY: number,
  viewZ: number,
  camera: PerspectiveCamera,
): { x: number; y: number; z: number } {
  const effectiveDist = Math.max(
    camera.zReferenceMax - viewZ + MIN_CAMERA_Z_OFFSET,
    MIN_CAMERA_Z_OFFSET,
  );
  const w = camera.focalLength / effectiveDist;
  return { x: viewX * w, y: viewY * w, z: viewZ };
}

/**
 * Applies weak perspective so closer atoms scale up mildly without a funnel silhouette.
 *
 * Uses `f / (f + depth)` with depth measured from the closest atom in view space.
 *
 * @param viewX - Horizontal view-space coordinate.
 * @param viewY - Vertical view-space coordinate (already flipped for SVG).
 * @param viewZ - Depth toward the camera.
 * @param camera - Focal length and closest-atom depth reference.
 * @returns Normalized plane coordinates before layout scaling.
 */
export function projectViewSpacePointWeak(
  viewX: number,
  viewY: number,
  viewZ: number,
  camera: PerspectiveCamera,
): { x: number; y: number; z: number } {
  const depth = Math.max(camera.zReferenceMax - viewZ, 0);
  const w = camera.focalLength / (camera.focalLength + depth);
  return { x: viewX * w, y: viewY * w, z: viewZ };
}

/**
 * Scales centered conformer coordinates to unit radius for stable cage projection.
 *
 * @param session - Source session; centered array is scaled in the returned clone.
 * @returns Session clone whose centered coords fit inside the unit sphere.
 */
export function scaleMolecule3dSessionToUnitSphere(
  session: Molecule3dSession,
): Molecule3dSession {
  const n = session.mol3d.getAtoms();
  let maxRadius = 0;
  for (let i = 0; i < n; i += 1) {
    const r = Math.hypot(
      session.centered[i * 3]!,
      session.centered[i * 3 + 1]!,
      session.centered[i * 3 + 2]!,
    );
    maxRadius = Math.max(maxRadius, r);
  }
  if (maxRadius <= 1e-9) {
    return session;
  }
  const scale = 1 / maxRadius;
  const scaled = new Float64Array(session.centered.length);
  for (let i = 0; i < scaled.length; i += 1) {
    scaled[i] = session.centered[i]! * scale;
  }
  return { ...session, centered: scaled };
}

/**
 * Projects every atom in a session through perspective at the current view.
 *
 * @param session - 3D conformer session.
 * @param view - User orbit.
 * @returns Per-atom projected plane coordinates preserving depth for ordering.
 */
export function projectSessionAtoms(
  session: Molecule3dSession,
  view: View3d,
  focalLength = DEFAULT_PERSPECTIVE_FOCAL,
): ProjectedAtom2d[] {
  const { x, y, z } = computeViewSpaceCoords(session, view);
  const camera = buildPerspectiveCamera(session, view, focalLength);
  const out: ProjectedAtom2d[] = [];
  for (let i = 0; i < x.length; i += 1) {
    const p = projectViewSpacePoint(x[i]!, y[i]!, z[i]!, camera);
    out.push({ index: i, x: p.x, y: p.y, z: p.z });
  }
  return out;
}

/**
 * Projects session atoms with unit-sphere normalization and weak perspective for cages.
 *
 * @param session - 3D conformer session.
 * @param view - User orbit.
 * @param focalLength - Weak-perspective focal length; defaults to {@link CAGE_PERSPECTIVE_FOCAL}.
 * @returns Per-atom projected plane coordinates preserving view-space depth for ordering.
 */
export function projectSessionAtomsCageWeak(
  session: Molecule3dSession,
  view: View3d,
  focalLength = CAGE_PERSPECTIVE_FOCAL,
): ProjectedAtom2d[] {
  const unitSession = scaleMolecule3dSessionToUnitSphere(session);
  const { x, y, z } = computeViewSpaceCoords(unitSession, view);
  const camera = buildPerspectiveCamera(unitSession, view, focalLength);
  const out: ProjectedAtom2d[] = [];
  for (let i = 0; i < x.length; i += 1) {
    const p = projectViewSpacePointWeak(x[i]!, y[i]!, z[i]!, camera);
    out.push({ index: i, x: p.x, y: p.y, z: p.z });
  }
  return out;
}

/**
 * Projects every atom in a session with an orthographic front view (no perspective divide).
 *
 * Lateral coordinates match view-space x/y; depth is preserved for bond ordering and culling.
 *
 * @param session - 3D conformer session.
 * @param view - User orbit.
 * @returns Per-atom plane coordinates without perspective scaling.
 */
export function projectSessionAtomsOrthographic(
  session: Molecule3dSession,
  view: View3d,
): ProjectedAtom2d[] {
  const { x, y, z } = computeViewSpaceCoords(session, view);
  const out: ProjectedAtom2d[] = [];
  for (let i = 0; i < x.length; i += 1) {
    out.push({ index: i, x: x[i]!, y: y[i]!, z: z[i]! });
  }
  return out;
}

function buildProjectedBondsFromAtoms(
  mol: Molecule,
  atoms: ProjectedAtom2d[],
): ProjectedBond2d[] {
  const bonds = mol.getBonds();
  const byIndex = new Map(atoms.map((a) => [a.index, a]));
  const out: ProjectedBond2d[] = [];
  for (let b = 0; b < bonds; b += 1) {
    const a0 = mol.getBondAtom(0, b);
    const a1 = mol.getBondAtom(1, b);
    const p0 = byIndex.get(a0);
    const p1 = byIndex.get(a1);
    if (!p0 || !p1) continue;
    out.push({
      bondIndex: b,
      atom0: a0,
      atom1: a1,
      x0: p0.x,
      y0: p0.y,
      z0: p0.z,
      x1: p1.x,
      y1: p1.y,
      z1: p1.z,
      avgZ: (p0.z + p1.z) * 0.5,
    });
  }
  return out;
}

/**
 * Builds projected bond segments from a session at the current perspective view.
 *
 * @param session - 3D conformer session.
 * @param view - User orbit.
 * @returns One record per bond with endpoint coordinates and mean depth.
 */
export function buildProjectedBonds(
  session: Molecule3dSession,
  view: View3d,
  focalLength = DEFAULT_PERSPECTIVE_FOCAL,
): ProjectedBond2d[] {
  return buildProjectedBondsFromAtoms(
    session.mol3d,
    projectSessionAtoms(session, view, focalLength),
  );
}

/**
 * Builds weak-perspective projected bond segments for cage 3D depiction.
 *
 * @param session - 3D conformer session.
 * @param view - User orbit.
 * @param focalLength - Weak-perspective focal length.
 * @returns One record per bond with endpoint coordinates and mean depth.
 */
export function buildCageProjectedBonds(
  session: Molecule3dSession,
  view: View3d,
  focalLength = CAGE_PERSPECTIVE_FOCAL,
): ProjectedBond2d[] {
  return buildProjectedBondsFromAtoms(
    session.mol3d,
    projectSessionAtomsCageWeak(session, view, focalLength),
  );
}

/**
 * Builds projected bond segments from an orthographic front-view projection.
 *
 * @param session - 3D conformer session.
 * @param view - User orbit.
 * @returns One record per bond with endpoint coordinates and mean depth.
 */
export function buildOrthographicProjectedBonds(
  session: Molecule3dSession,
  view: View3d,
): ProjectedBond2d[] {
  return buildProjectedBondsFromAtoms(
    session.mol3d,
    projectSessionAtomsOrthographic(session, view),
  );
}

/**
 * Linearly interpolates depth along a projected bond segment.
 *
 * @param bond - Projected bond segment.
 * @param t - Parameter in `[0, 1]` along the segment.
 * @returns Depth at `t`.
 */
export function bondDepthAt(bond: ProjectedBond2d, t: number): number {
  const u = Math.max(0, Math.min(1, t));
  return bond.z0 + (bond.z1 - bond.z0) * u;
}

/**
 * Classifies bonds into front and back depth tiers using the median bond depth.
 *
 * @param bonds - Projected bond segments.
 * @returns Map from bond index to `"front"` or `"back"`.
 */
export function classifyBondDepthTiers(
  bonds: ProjectedBond2d[],
): Map<number, BondDepthTier> {
  const tiers = new Map<number, BondDepthTier>();
  if (bonds.length === 0) return tiers;
  const median = medianBondDepth(bonds);
  for (const b of bonds) {
    tiers.set(b.bondIndex, b.avgZ >= median ? "front" : "back");
  }
  return tiers;
}

function medianBondDepth(bonds: ProjectedBond2d[]): number {
  const sortedDepths = bonds.map((b) => b.avgZ).sort((a, b) => a - b);
  return sortedDepths[Math.floor(sortedDepths.length / 2)] ?? sortedDepths[0]!;
}

/**
 * Computes the median-bond-length scale factor used to map cage projections into
 * OpenChemLib depiction coordinates for a session at the given view.
 *
 * @param mol - Molecule whose bond topology defines the median length target.
 * @param projected - Weak- or orthographic-projected atoms before layout scaling.
 * @returns Multiplier applied after centering projected coordinates at the origin.
 */
export function measureCagePlaneNormalizationScale(
  mol: Molecule,
  projected: ProjectedAtom2d[],
): number {
  const x2 = projected.map((p) => p.x);
  const y2 = projected.map((p) => p.y);
  const bondLengths: number[] = [];
  const bonds = mol.getBonds();
  for (let b = 0; b < bonds; b += 1) {
    const a0 = mol.getBondAtom(0, b);
    const a1 = mol.getBondAtom(1, b);
    const length = Math.hypot(x2[a0]! - x2[a1]!, y2[a0]! - y2[a1]!);
    if (length > 1e-9) {
      bondLengths.push(length);
    }
  }
  bondLengths.sort((a, b) => a - b);
  const targetAv =
    bondLengths.length > 0
      ? (bondLengths[Math.floor(bondLengths.length / 2)] ??
        MoleculeCtor.getDefaultAverageBondLength())
      : MoleculeCtor.getDefaultAverageBondLength();
  const ideal = MoleculeCtor.getDefaultAverageBondLength();
  return targetAv > 1e-9 ? ideal / targetAv : 1;
}

/**
 * Centers projected plane coordinates and applies a fixed layout scale without
 * recomputing the scale from the current perspective divide.
 *
 * @param projected - Atoms after unit-disc fit and perspective projection.
 * @param planeScale - Layout scale from {@link measureCagePlaneNormalizationScale}.
 * @returns Parallel x/y/z arrays indexed by atom.
 */
export function scaleProjectedPlaneCoords(
  projected: ProjectedAtom2d[],
  planeScale: number,
): { x: number[]; y: number[]; z: number[] } {
  const n = projected.length;
  if (n === 0) {
    return { x: [], y: [], z: [] };
  }
  let mx = 0;
  let my = 0;
  for (const atom of projected) {
    mx += atom.x;
    my += atom.y;
  }
  mx /= n;
  my /= n;
  const x: number[] = [];
  const y: number[] = [];
  const z: number[] = [];
  for (const atom of projected) {
    x.push((atom.x - mx) * planeScale);
    y.push((atom.y - my) * planeScale);
    z.push(atom.z);
  }
  return { x, y, z };
}

/**
 * Builds projected bond segments for a stripped depiction molecule using per-atom depth.
 *
 * Bond indices match the depiction molecule passed to OpenChemLib `toSVG`, not the raw 3D session.
 *
 * @param mol - Hydrogen-stripped molecule used for SVG export.
 * @param atomDepth - Per-atom depth toward the camera, indexed like `mol`.
 * @param planeX - Depiction-plane x coordinate per atom.
 * @param planeY - Depiction-plane y coordinate per atom.
 * @returns Projected bond segments keyed by depiction bond index.
 */
export function buildDepictionProjectedBonds(
  mol: Molecule,
  atomDepth: number[],
  planeX: number[],
  planeY: number[],
): ProjectedBond2d[] {
  const bondCount = mol.getBonds();
  const out: ProjectedBond2d[] = [];
  for (let b = 0; b < bondCount; b += 1) {
    const a0 = mol.getBondAtom(0, b);
    const a1 = mol.getBondAtom(1, b);
    const z0 = atomDepth[a0]!;
    const z1 = atomDepth[a1]!;
    out.push({
      bondIndex: b,
      atom0: a0,
      atom1: a1,
      x0: planeX[a0]!,
      y0: planeY[a0]!,
      z0,
      x1: planeX[a1]!,
      y1: planeY[a1]!,
      z1,
      avgZ: (z0 + z1) * 0.5,
    });
  }
  return out;
}

/**
 * Classifies depiction bond depth tiers using z-buffer visibility and median depth.
 *
 * Fully occluded bonds are always `"back"`. Visible bonds at or above the median depth are
 * `"front"`; visible bonds below the median are `"back"`.
 *
 * @param mol - Hydrogen-stripped depiction molecule.
 * @param atomDepth - Per-atom depth toward the camera.
 * @param planeX - Depiction-plane x coordinate per atom.
 * @param planeY - Depiction-plane y coordinate per atom.
 * @returns Map from depiction bond index to depth tier.
 */
export function classifyDepictionBondDepthTiers(
  mol: Molecule,
  atomDepth: number[],
  planeX: number[],
  planeY: number[],
): Map<number, BondDepthTier> {
  const bonds = buildDepictionProjectedBonds(mol, atomDepth, planeX, planeY);
  return classifyBondDepthTiers(bonds);
}

export interface BondVisibilityOptions {
  /** Grid resolution for the depth buffer (square). Defaults to 192. */
  gridSize?: number;
  /** Fraction of bond samples that must win depth to count as visible. Defaults to 0.08. */
  visibilityThreshold?: number;
  /** Sample count along each bond. Defaults to 48. */
  samplesPerBond?: number;
}

/**
 * Determines which bonds are visible from the current perspective using a grid depth buffer.
 *
 * Bonds that never win a depth sample against overlapping segments are treated as fully occluded
 * and listed in `omittedBondIndices` for flat snapshot export.
 *
 * @param bonds - Projected bond segments in plane coordinates.
 * @param opts - Grid resolution and visibility threshold.
 * @returns Visibility flags and omitted bond indices.
 */
export function computeBondVisibility(
  bonds: ProjectedBond2d[],
  opts?: BondVisibilityOptions,
): BondVisibilityResult {
  const gridSize = opts?.gridSize ?? 192;
  const threshold = opts?.visibilityThreshold ?? 0.08;
  const samplesPerBond = opts?.samplesPerBond ?? 48;

  if (bonds.length === 0) {
    return {
      visibleByBondIndex: [],
      omittedBondIndices: [],
      omittedBondCount: 0,
    };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const b of bonds) {
    minX = Math.min(minX, b.x0, b.x1);
    maxX = Math.max(maxX, b.x0, b.x1);
    minY = Math.min(minY, b.y0, b.y1);
    maxY = Math.max(maxY, b.y0, b.y1);
  }
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  const pad = 0.06;
  minX -= spanX * pad;
  maxX += spanX * pad;
  minY -= spanY * pad;
  maxY += spanY * pad;

  const toGx = (x: number) =>
    Math.max(0, Math.min(gridSize - 1, ((x - minX) / (maxX - minX)) * (gridSize - 1)));
  const toGy = (y: number) =>
    Math.max(0, Math.min(gridSize - 1, ((y - minY) / (maxY - minY)) * (gridSize - 1)));

  const depthBuf = new Float32Array(gridSize * gridSize).fill(-Infinity);
  const winnerBuf = new Int32Array(gridSize * gridSize).fill(-1);
  const lineWidth = Math.max(1.2, Math.min(spanX, spanY) * 0.018);

  for (const b of bonds) {
    for (let s = 0; s <= samplesPerBond; s += 1) {
      const t = s / samplesPerBond;
      const px = b.x0 + (b.x1 - b.x0) * t;
      const py = b.y0 + (b.y1 - b.y0) * t;
      const z = bondDepthAt(b, t);
      const gx = toGx(px);
      const gy = toGy(py);
      const r = Math.ceil(lineWidth * (gridSize / spanX));
      for (let oy = -r; oy <= r; oy += 1) {
        for (let ox = -r; ox <= r; ox += 1) {
          const ix = Math.round(gx) + ox;
          const iy = Math.round(gy) + oy;
          if (ix < 0 || iy < 0 || ix >= gridSize || iy >= gridSize) continue;
          const cell = iy * gridSize + ix;
          if (z >= depthBuf[cell]!) {
            depthBuf[cell] = z;
            winnerBuf[cell] = b.bondIndex;
          }
        }
      }
    }
  }

  const maxBond = bonds.reduce((m, b) => Math.max(m, b.bondIndex), 0);
  const winSamples = new Int32Array(maxBond + 1);
  const totalSamples = new Int32Array(maxBond + 1);

  for (const b of bonds) {
    for (let s = 0; s <= samplesPerBond; s += 1) {
      const t = s / samplesPerBond;
      const px = b.x0 + (b.x1 - b.x0) * t;
      const py = b.y0 + (b.y1 - b.y0) * t;
      const z = bondDepthAt(b, t);
      totalSamples[b.bondIndex]! += 1;
      const gx = Math.round(toGx(px));
      const gy = Math.round(toGy(py));
      if (gx < 0 || gy < 0 || gx >= gridSize || gy >= gridSize) continue;
      const cell = gy * gridSize + gx;
      if (winnerBuf[cell] === b.bondIndex && Math.abs(depthBuf[cell]! - z) < 1e-9) {
        winSamples[b.bondIndex]! += 1;
      }
    }
  }

  const visibleByBondIndex: boolean[] = [];
  const omittedBondIndices: number[] = [];
  for (const b of bonds) {
    const total = totalSamples[b.bondIndex] ?? 0;
    const wins = winSamples[b.bondIndex] ?? 0;
    const visible = total === 0 ? true : wins / total >= threshold;
    visibleByBondIndex[b.bondIndex] = visible;
    if (!visible) omittedBondIndices.push(b.bondIndex);
  }

  return {
    visibleByBondIndex,
    omittedBondIndices,
    omittedBondCount: omittedBondIndices.length,
  };
}

/**
 * Serializes the combined view matrix for snapshot metadata.
 *
 * @param session - 3D session.
 * @param view - Current orbit.
 * @returns Nine row-major matrix entries.
 */
export function snapshotViewMatrix(
  session: Molecule3dSession,
  view: View3d,
): number[] {
  return combinedViewMatrix(session.rPca, view);
}

/**
 * Uniformly scales projected plane coordinates to fit inside the unit disc.
 *
 * @param atoms - Perspective- or orthographic-projected atoms.
 * @returns Atoms scaled so the farthest center lies on the unit circle.
 */
export function fitProjectedAtomsToUnitDisc(
  atoms: ProjectedAtom2d[],
): ProjectedAtom2d[] {
  let maxRadius = 0;
  for (const atom of atoms) {
    maxRadius = Math.max(maxRadius, Math.hypot(atom.x, atom.y));
  }
  if (maxRadius <= 1e-9) {
    return atoms;
  }
  const scale = 1 / maxRadius;
  return atoms.map((atom) => ({
    ...atom,
    x: atom.x * scale,
    y: atom.y * scale,
  }));
}

/**
 * Maps projected plane coordinates to the same normalized bond-length scale used by OCL depictions.
 *
 * @param mol - Molecule whose bonds define the target average length.
 * @param projected - Perspective-projected atom coordinates.
 * @returns Scaled and centered `x`/`y` arrays indexed by atom.
 */
export function normalizeProjectedPlaneCoords(
  mol: Molecule,
  projected: ProjectedAtom2d[],
): { x: number[]; y: number[]; z: number[] } {
  const x2 = projected.map((p) => p.x);
  const y2 = projected.map((p) => p.y);
  const z = projected.map((p) => p.z);
  const n = mol.getAtoms();
  const bondLengths: number[] = [];
  const bonds = mol.getBonds();
  for (let b = 0; b < bonds; b += 1) {
    const a0 = mol.getBondAtom(0, b);
    const a1 = mol.getBondAtom(1, b);
    const length = Math.hypot(x2[a0]! - x2[a1]!, y2[a0]! - y2[a1]!);
    if (length > 1e-9) {
      bondLengths.push(length);
    }
  }
  bondLengths.sort((a, b) => a - b);
  const targetAv =
    bondLengths.length > 0
      ? (bondLengths[Math.floor(bondLengths.length / 2)] ??
        MoleculeCtor.getDefaultAverageBondLength())
      : MoleculeCtor.getDefaultAverageBondLength();
  const ideal = MoleculeCtor.getDefaultAverageBondLength();
  const s = targetAv > 1e-9 ? ideal / targetAv : 1;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i += 1) {
    mx += x2[i]!;
    my += y2[i]!;
  }
  mx /= n;
  my /= n;
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i += 1) {
    x.push((x2[i]! - mx) * s);
    y.push((y2[i]! - my) * s);
  }
  return { x, y, z };
}
