/**
 * View-space geometry for the interactive molecule draw canvas.
 *
 * Owns the mapping between molecule coordinates (OpenChemLib 2D space, y up)
 * and SVG screen coordinates (y down), hit-testing of atoms and bonds under a
 * pointer, angle snapping for sprouted bonds, and parallel-line offsets for
 * multi-bond rendering. Everything here is pure math over plain data; this
 * module never mutates molecules and never touches the DOM.
 */

import type { Molecule } from "openchemlib";
import { Molecule as MoleculeCtor } from "openchemlib";

import type { DoubleBondOffsetMode } from "../molecule-draw-types";
import {
  MOLECULE_2D_BOND_ENDPOINT_TRIM_RADIUS_PX,
  MOLECULE_2D_JUNCTION_DEGREE_MIN,
  MOLECULE_2D_JUNCTION_VERTEX_CORE_RADIUS_PX,
} from "./molecule-2d-depiction-style";

/** 2D point in either molecule or screen space. */
export interface DrawPoint {
  x: number;
  y: number;
}

/**
 * Affine transform from molecule space to screen space:
 * `screenX = offsetX + scale * molX`, `screenY = offsetY - scale * molY`
 * (y axis flips because chemistry coordinates point up while SVG points down).
 */
export interface DrawViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  /**
   * When `false`, molecule y increases downward like OpenChemLib SVG space.
   * Default chemistry mapping flips y (`true` or omitted).
   */
  flipY?: boolean;
}

/** Minimum interactive canvas zoom (fraction of fit-to-view scale). */
export const DRAW_VIEW_ZOOM_MIN = 0.25;

/** Maximum interactive canvas zoom (fraction of fit-to-view scale). */
export const DRAW_VIEW_ZOOM_MAX = 4;

/**
 * Clamps a canvas zoom factor to {@link DRAW_VIEW_ZOOM_MIN} and
 * {@link DRAW_VIEW_ZOOM_MAX}.
 */
export function clampViewZoom(zoom: number): number {
  return Math.max(DRAW_VIEW_ZOOM_MIN, Math.min(DRAW_VIEW_ZOOM_MAX, zoom));
}

/** Result of hit-testing the pointer against the molecule depiction. */
export type DrawHit =
  | { kind: "atom"; atom: number }
  | { kind: "bond"; bond: number }
  | { kind: "empty" };

/**
 * Options for {@link hitTestMolecule} and {@link hitTestDepictionView}. When
 * `preferBonds` is true, bond stems win more readily over atoms outside the
 * junction vertex core so bond-targeting tools (order, bookends, chunk cuts)
 * register on stems. Hover may pass `preferBonds: true` for those tools.
 */
export interface HitTestOptions {
  preferBonds?: boolean;
}

/**
 * Standard sprouted-bond length in molecule space. OpenChemLib's default
 * average bond length is about 1.5 units (its molfile standard), so new atoms
 * are placed at this distance from their parent.
 */
export const DRAW_STANDARD_BOND_LENGTH = 1.5;

/**
 * Computes a view transform that fits all atoms inside the viewport with the
 * given padding while clamping the zoom so single atoms and tiny fragments do
 * not blow up to fill the screen.
 *
 * @param mol - Molecule whose 2D coordinates are fitted; not mutated.
 * @param viewportWidth - Viewport width in pixels; must be positive.
 * @param viewportHeight - Viewport height in pixels; must be positive.
 * @param paddingPx - Inner padding in pixels reserved on each side.
 * @param maxScale - Upper bound on pixels per molecule unit (zoom clamp).
 * @returns Transform centering the molecule; for an empty molecule, returns a
 *   transform centered on the viewport at `maxScale`.
 */
/**
 * Applies a screen-space pan offset on top of a base view transform. Pan does
 * not change molecule coordinates; it only shifts the viewport.
 */
export function withViewPan(
  transform: DrawViewTransform,
  pan: DrawPoint,
): DrawViewTransform {
  return {
    scale: transform.scale,
    offsetX: transform.offsetX + pan.x,
    offsetY: transform.offsetY + pan.y,
    flipY: transform.flipY,
  };
}

/**
 * Scales a view transform about a fixed screen-space origin so the world point
 * under `origin` stays pinned while zoom changes.
 */
export function withViewZoom(
  transform: DrawViewTransform,
  zoom: number,
  origin: DrawPoint,
): DrawViewTransform {
  const z = clampViewZoom(zoom);
  return {
    scale: transform.scale * z,
    offsetX: origin.x - (origin.x - transform.offsetX) * z,
    offsetY: origin.y - (origin.y - transform.offsetY) * z,
    flipY: transform.flipY,
  };
}

/** Pan and zoom options applied on top of a fit or OCL-aligned base transform. */
export interface DrawViewComposeOptions {
  pan?: DrawPoint;
  zoom?: number;
  zoomOrigin?: DrawPoint;
}

/**
 * Composes fit/OCL base mapping with viewport pan and zoom. Hit-testing and
 * overlay placement should use the returned transform; OCL markup rendered in
 * base space can share the same pan/zoom via {@link panZoomSvgGroupTransform}.
 */
export function composeDrawViewTransform(
  base: DrawViewTransform,
  options: DrawViewComposeOptions = {},
): DrawViewTransform {
  const pan = options.pan ?? { x: 0, y: 0 };
  const zoom = options.zoom ?? 1;
  const zoomOrigin = options.zoomOrigin ?? { x: 0, y: 0 };
  if (zoom === 1) {
    return withViewPan(base, pan);
  }
  return withViewPan(withViewZoom(base, zoom, zoomOrigin), pan);
}

/**
 * Builds an SVG group `transform` that applies pan and uniform zoom about
 * `origin` to content already positioned in base view space.
 */
export function panZoomSvgGroupTransform(
  pan: DrawPoint,
  zoom: number,
  origin: DrawPoint,
): string {
  const z = clampViewZoom(zoom);
  if (z === 1 && pan.x === 0 && pan.y === 0) {
    return "";
  }
  const ox = origin.x;
  const oy = origin.y;
  return `translate(${pan.x} ${pan.y}) translate(${ox} ${oy}) scale(${z}) translate(${-ox} ${-oy})`;
}

/**
 * Maps a screen-space point under an updated zoom while keeping the molecule
 * point beneath `screenPoint` fixed.
 */
export function zoomDrawViewAtScreenPoint(
  base: DrawViewTransform,
  view: { pan: DrawPoint; zoom: number; zoomOrigin: DrawPoint },
  screenPoint: DrawPoint,
  zoomFactor: number,
): { pan: DrawPoint; zoom: number; zoomOrigin: DrawPoint } {
  const current = composeDrawViewTransform(base, view);
  const mol = screenToMolecule(current, screenPoint);
  const newZoom = clampViewZoom(view.zoom * zoomFactor);
  const zoomed = composeDrawViewTransform(base, {
    pan: view.pan,
    zoom: newZoom,
    zoomOrigin: screenPoint,
  });
  const zoomedScreen = moleculeToScreen(zoomed, mol);
  return {
    pan: {
      x: view.pan.x + (screenPoint.x - zoomedScreen.x),
      y: view.pan.y + (screenPoint.y - zoomedScreen.y),
    },
    zoom: newZoom,
    zoomOrigin: screenPoint,
  };
}

/**
 * Converts a DOM pointer position into SVG user units using the element CTM so
 * CSS-scaled canvases stay aligned with hit-testing math.
 */
export function pointerToSvgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): DrawPoint | null {
  const ctm = svg.getScreenCTM();
  if (ctm === null) {
    return null;
  }
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const local = point.matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
}

/**
 * Lists atom indices whose screen positions fall inside an axis-aligned
 * rectangle in screen pixels (inclusive bounds).
 */
export function atomsInScreenRect(
  mol: Molecule,
  transform: DrawViewTransform,
  rect: { x0: number; y0: number; x1: number; y1: number },
): number[] {
  const minX = Math.min(rect.x0, rect.x1);
  const maxX = Math.max(rect.x0, rect.x1);
  const minY = Math.min(rect.y0, rect.y1);
  const maxY = Math.max(rect.y0, rect.y1);
  const hits: number[] = [];
  for (let a = 0; a < mol.getAllAtoms(); a += 1) {
    const screen = moleculeToScreen(transform, {
      x: mol.getAtomX(a),
      y: mol.getAtomY(a),
    });
    if (
      screen.x >= minX &&
      screen.x <= maxX &&
      screen.y >= minY &&
      screen.y <= maxY
    ) {
      hits.push(a);
    }
  }
  return hits;
}

export function fitViewTransform(
  mol: Molecule,
  viewportWidth: number,
  viewportHeight: number,
  paddingPx: number,
  maxScale: number,
): DrawViewTransform {
  const atomCount = mol.getAllAtoms();
  if (atomCount === 0) {
    return {
      scale: maxScale,
      offsetX: viewportWidth / 2,
      offsetY: viewportHeight / 2,
    };
  }
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let a = 0; a < atomCount; a += 1) {
    const x = mol.getAtomX(a);
    const y = mol.getAtomY(a);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  const usableW = Math.max(viewportWidth - 2 * paddingPx, 1);
  const usableH = Math.max(viewportHeight - 2 * paddingPx, 1);
  const scale = Math.min(usableW / spanX, usableH / spanY, maxScale);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  return {
    scale,
    offsetX: viewportWidth / 2 - scale * centerX,
    offsetY: viewportHeight / 2 + scale * centerY,
  };
}

/** Maps a molecule-space point to screen space. */
export function moleculeToScreen(
  transform: DrawViewTransform,
  point: DrawPoint,
): DrawPoint {
  const ySign = transform.flipY === false ? 1 : -1;
  return {
    x: transform.offsetX + transform.scale * point.x,
    y: transform.offsetY + ySign * transform.scale * point.y,
  };
}

/** Maps a screen-space point back to molecule space (inverse of {@link moleculeToScreen}). */
export function screenToMolecule(
  transform: DrawViewTransform,
  point: DrawPoint,
): DrawPoint {
  const ySign = transform.flipY === false ? 1 : -1;
  return {
    x: (point.x - transform.offsetX) / transform.scale,
    y: (ySign * (point.y - transform.offsetY)) / transform.scale,
  };
}

/** Pan/zoom state applied on top of a base OCL or fit view transform. */
export interface DrawViewPanZoom {
  pan: DrawPoint;
  zoom: number;
  zoomOrigin: DrawPoint;
}

/**
 * Maps a point in base depiction viewBox space through the canvas pan/zoom group
 * into root SVG user coordinates.
 */
export function baseViewPointToScreen(
  point: DrawPoint,
  panZoom: DrawViewPanZoom,
): DrawPoint {
  const z = clampViewZoom(panZoom.zoom);
  const ox = panZoom.zoomOrigin.x;
  const oy = panZoom.zoomOrigin.y;
  return {
    x: panZoom.pan.x + ox + z * (point.x - ox),
    y: panZoom.pan.y + oy + z * (point.y - oy),
  };
}

/**
 * Inverts {@link baseViewPointToScreen} for pointer positions in root SVG space.
 */
export function screenPointToBaseView(
  point: DrawPoint,
  panZoom: DrawViewPanZoom,
): DrawPoint {
  const z = clampViewZoom(panZoom.zoom);
  const ox = panZoom.zoomOrigin.x;
  const oy = panZoom.zoomOrigin.y;
  return {
    x: ox + (point.x - panZoom.pan.x - ox) / z,
    y: oy + (point.y - panZoom.pan.y - oy) / z,
  };
}

/**
 * Resolves an atom center in base depiction space, preferring parsed OCL hit
 * circle centers when present so overlays align with rendered bond junctions.
 */
export function atomCenterInBaseView(
  mol: Molecule,
  atom: number,
  baseTransform: DrawViewTransform,
  oclAtomCenters: ReadonlyMap<number, DrawPoint> | null,
): DrawPoint {
  const ocl = oclAtomCenters?.get(atom);
  if (ocl !== undefined) {
    return ocl;
  }
  return moleculeToScreen(baseTransform, {
    x: mol.getAtomX(atom),
    y: mol.getAtomY(atom),
  });
}

/**
 * Pointer hit radius for an atom center. Junction atoms use the same radius as
 * chain atoms; vertex-core priority is handled in {@link resolveDrawHitPriority}.
 */
export function atomPointerHitRadiusPx(
  _mol: Molecule,
  _atom: number,
  baseRadiusPx: number,
): number {
  return baseRadiusPx;
}

/**
 * Per-endpoint trim for bond hit segments: junction endpoints use the smaller
 * {@link MOLECULE_2D_BOND_ENDPOINT_TRIM_RADIUS_PX} so stems stay clickable.
 */
export function bondEndpointTrimRadiusPx(
  mol: Molecule,
  atom: number,
  baseTrimPx: number,
): number {
  return mol.getConnAtoms(atom) >= MOLECULE_2D_JUNCTION_DEGREE_MIN
    ? MOLECULE_2D_BOND_ENDPOINT_TRIM_RADIUS_PX
    : baseTrimPx;
}

/**
 * Resolves overlapping atom and bond hits using distance to the nearest feature.
 * Pointers inside {@link MOLECULE_2D_JUNCTION_VERTEX_CORE_RADIUS_PX} of a
 * junction atom center always resolve to that atom; otherwise the closer hit
 * wins, with bonds favored on ties when `preferBonds` is set.
 */
export function resolveDrawHitPriority(
  atomHit: boolean,
  bestAtom: number,
  bondHit: boolean,
  bestBond: number,
  bestAtomDist: number,
  bestBondDist: number,
  preferBonds: boolean,
  vertexCoreRadiusPx: number = MOLECULE_2D_JUNCTION_VERTEX_CORE_RADIUS_PX,
): DrawHit {
  if (!atomHit && !bondHit) {
    return { kind: "empty" };
  }
  if (atomHit && !bondHit) {
    return { kind: "atom", atom: bestAtom };
  }
  if (bondHit && !atomHit) {
    return { kind: "bond", bond: bestBond };
  }
  if (bestAtomDist <= vertexCoreRadiusPx) {
    return { kind: "atom", atom: bestAtom };
  }
  const bondBiasPx = preferBonds ? 3 : 0;
  if (bestBondDist <= bestAtomDist + bondBiasPx - 1e-6) {
    return { kind: "bond", bond: bestBond };
  }
  return { kind: "atom", atom: bestAtom };
}

/**
 * Hit-tests a pointer against atoms and bonds using base-view atom centers from
 * OCL SVG hit circles (preferred) or molecule coordinates mapped through
 * `baseTransform`.
 */
export function hitTestDepictionView(
  mol: Molecule,
  pointer: DrawPoint,
  baseTransform: DrawViewTransform,
  panZoom: DrawViewPanZoom,
  oclAtomCenters: ReadonlyMap<number, DrawPoint> | null,
  atomRadiusPx: number,
  bondTolerancePx: number,
  options?: HitTestOptions,
): DrawHit {
  const pointerBase = screenPointToBaseView(pointer, panZoom);

  let bestAtom = -1;
  let bestAtomDist = Number.POSITIVE_INFINITY;
  for (let a = 0; a < mol.getAllAtoms(); a += 1) {
    const center = atomCenterInBaseView(mol, a, baseTransform, oclAtomCenters);
    const d = Math.hypot(center.x - pointerBase.x, center.y - pointerBase.y);
    const radius = atomPointerHitRadiusPx(mol, a, atomRadiusPx);
    if (d <= radius && d < bestAtomDist) {
      bestAtomDist = d;
      bestAtom = a;
    }
  }
  const atomHit = bestAtom >= 0;

  let bestBond = -1;
  let bestBondDist = Number.POSITIVE_INFINITY;
  for (let b = 0; b < mol.getBonds(); b += 1) {
    const a0 = mol.getBondAtom(0, b);
    const a1 = mol.getBondAtom(1, b);
    const p0 = atomCenterInBaseView(mol, a0, baseTransform, oclAtomCenters);
    const p1 = atomCenterInBaseView(mol, a1, baseTransform, oclAtomCenters);
    const trimStart = bondEndpointTrimRadiusPx(mol, a0, atomRadiusPx);
    const trimEnd = bondEndpointTrimRadiusPx(mol, a1, atomRadiusPx);
    const [bp0, bp1] = trimSegmentEnds(p0, p1, trimStart, trimEnd);
    const d = distancePointToSegment(pointerBase, bp0, bp1);
    if (d <= bondTolerancePx && d < bestBondDist) {
      bestBondDist = d;
      bestBond = b;
    }
  }
  const bondHit = bestBond >= 0;

  return resolveDrawHitPriority(
    atomHit,
    bestAtom,
    bondHit,
    bestBond,
    bestAtomDist,
    bestBondDist,
    options?.preferBonds === true,
  );
}

/**
 * Lists atom indices whose base-view centers fall inside a screen-space marquee
 * rectangle in root SVG coordinates.
 */
export function atomsInDepictionScreenRect(
  mol: Molecule,
  baseTransform: DrawViewTransform,
  panZoom: DrawViewPanZoom,
  oclAtomCenters: ReadonlyMap<number, DrawPoint> | null,
  rect: { x0: number; y0: number; x1: number; y1: number },
): number[] {
  const minX = Math.min(rect.x0, rect.x1);
  const maxX = Math.max(rect.x0, rect.x1);
  const minY = Math.min(rect.y0, rect.y1);
  const maxY = Math.max(rect.y0, rect.y1);
  const hits: number[] = [];
  for (let a = 0; a < mol.getAllAtoms(); a += 1) {
    const screen = baseViewPointToScreen(
      atomCenterInBaseView(mol, a, baseTransform, oclAtomCenters),
      panZoom,
    );
    if (
      screen.x >= minX &&
      screen.x <= maxX &&
      screen.y >= minY &&
      screen.y <= maxY
    ) {
      hits.push(a);
    }
  }
  return hits;
}

/**
 * Hit-tests a screen-space pointer position against atoms and bonds. When both
 * are in range, the pointer resolves by distance except inside the junction
 * vertex core; bond segments exclude short endpoint trims.
 *
 * @param mol - Molecule providing coordinates and bond topology; not mutated.
 * @param transform - Active view transform.
 * @param pointer - Pointer position in screen pixels.
 * @param atomRadiusPx - Base hit radius around each atom center in pixels.
 * @param bondTolerancePx - Maximum perpendicular distance from a bond segment
 *   in pixels.
 * @returns The closest hit, or `{ kind: "empty" }` when nothing is in range.
 */
export function hitTestMolecule(
  mol: Molecule,
  transform: DrawViewTransform,
  pointer: DrawPoint,
  atomRadiusPx: number,
  bondTolerancePx: number,
  options?: HitTestOptions,
): DrawHit {
  let bestAtom = -1;
  let bestAtomDist = Number.POSITIVE_INFINITY;
  for (let a = 0; a < mol.getAllAtoms(); a += 1) {
    const p = moleculeToScreen(transform, { x: mol.getAtomX(a), y: mol.getAtomY(a) });
    const d = Math.hypot(p.x - pointer.x, p.y - pointer.y);
    const radius = atomPointerHitRadiusPx(mol, a, atomRadiusPx);
    if (d <= radius && d < bestAtomDist) {
      bestAtomDist = d;
      bestAtom = a;
    }
  }
  const atomHit = bestAtom >= 0;

  let bestBond = -1;
  let bestBondDist = Number.POSITIVE_INFINITY;
  for (let b = 0; b < mol.getBonds(); b += 1) {
    const a0 = mol.getBondAtom(0, b);
    const a1 = mol.getBondAtom(1, b);
    const p0 = moleculeToScreen(transform, { x: mol.getAtomX(a0), y: mol.getAtomY(a0) });
    const p1 = moleculeToScreen(transform, { x: mol.getAtomX(a1), y: mol.getAtomY(a1) });
    const trimStart = bondEndpointTrimRadiusPx(mol, a0, atomRadiusPx);
    const trimEnd = bondEndpointTrimRadiusPx(mol, a1, atomRadiusPx);
    const [bp0, bp1] = trimSegmentEnds(p0, p1, trimStart, trimEnd);
    const d = distancePointToSegment(pointer, bp0, bp1);
    if (d <= bondTolerancePx && d < bestBondDist) {
      bestBondDist = d;
      bestBond = b;
    }
  }
  const bondHit = bestBond >= 0;

  return resolveDrawHitPriority(
    atomHit,
    bestAtom,
    bondHit,
    bestBond,
    bestAtomDist,
    bestBondDist,
    options?.preferBonds === true,
  );
}

/** Screen-space parameters for drawing a polymer bookend bracket on a bond. */
export interface BookendBracketGeometry {
  /** Bond midpoint in screen pixels. */
  mid: DrawPoint;
  /** Unit vector along the bond (atom0 to atom1). */
  tangent: DrawPoint;
  /** Unit normal perpendicular to the bond (screen y-down). */
  normal: DrawPoint;
  /** Bracket height in pixels (span along normal). */
  heightPx: number;
  /** Hook depth in pixels (span along tangent for `[` / `]` arms). */
  hookPx: number;
  /** Bar offset from midpoint along tangent (positions the vertical stroke). */
  barOffsetPx: number;
  /** True for opening `[`, false for closing `]`. */
  isOpen: boolean;
}

/**
 * Builds screen-space geometry for a ChemDraw-style square bookend bracket
 * centered on a bond midpoint with the bond line passing through the bracket
 * center.
 *
 * @param p0 - Screen position of the first bond atom.
 * @param p1 - Screen position of the second bond atom.
 * @param isOpen - When true, draws `[`; when false, draws `]`.
 * @param openingTowardAtom - Atom index on the opening side; the bracket opens
 *   toward this endpoint. When null, opens toward `p1`.
 * @param atom0 - Index of the atom at `p0`.
 * @param atom1 - Index of the atom at `p1`.
 * @param openingFlip - When true, mirrors bracket opening to the opposite side
 *   of the bond relative to the auto-detected direction.
 * @returns Bracket layout parameters for SVG path construction.
 */
export function bookendBracketGeometry(
  p0: DrawPoint,
  p1: DrawPoint,
  isOpen: boolean,
  openingTowardAtom: number | null,
  atom0: number,
  atom1: number,
  openingFlip = false,
): BookendBracketGeometry {
  const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
  let tx = p1.x - p0.x;
  let ty = p1.y - p0.y;
  const len = Math.hypot(tx, ty) || 1;
  tx /= len;
  ty /= len;
  const bondLengthPx = len;
  const heightPx = Math.min(Math.max(bondLengthPx * 1.35, 22), 44);
  const hookPx = Math.min(Math.max(bondLengthPx * 0.22, 5), 9);
  const barOffsetPx = hookPx * 0.55;
  const openTowardSecond =
    openingTowardAtom === null ? true : openingTowardAtom === atom1;
  let tangent = openTowardSecond ? { x: tx, y: ty } : { x: -tx, y: -ty };
  if (openingFlip) {
    tangent = { x: -tangent.x, y: -tangent.y };
  }
  const normal = { x: -ty, y: tx };
  return {
    mid,
    tangent,
    normal,
    heightPx,
    hookPx,
    barOffsetPx,
    isOpen,
  };
}

/**
 * Reports whether the bracket vertical bar in {@link BookendBracketGeometry} is
 * perpendicular to the bond axis within floating-point tolerance.
 */
export function bookendBracketBarIsPerpendicularToBond(
  geom: BookendBracketGeometry,
): boolean {
  const barDx = geom.normal.x;
  const barDy = geom.normal.y;
  const bondDx = geom.mid.x + geom.tangent.x - geom.mid.x;
  const bondDy = geom.mid.y + geom.tangent.y - geom.mid.y;
  const dot = barDx * bondDx + barDy * bondDy;
  return Math.abs(dot) < 1e-6;
}

/**
 * SVG path for a square polymer bookend bracket (`[` or `]`) from
 * {@link BookendBracketGeometry}.
 */
export function bookendBracketPath(geom: BookendBracketGeometry): string {
  const { mid, tangent, normal, heightPx, hookPx, barOffsetPx, isOpen } = geom;
  const halfH = heightPx / 2;
  const barSign = isOpen ? -1 : 1;
  const hookSign = isOpen ? 1 : -1;
  const barCenter = {
    x: mid.x + tangent.x * barOffsetPx * barSign,
    y: mid.y + tangent.y * barOffsetPx * barSign,
  };
  const top = {
    x: barCenter.x + normal.x * halfH,
    y: barCenter.y + normal.y * halfH,
  };
  const bottom = {
    x: barCenter.x - normal.x * halfH,
    y: barCenter.y - normal.y * halfH,
  };
  const topHook = {
    x: top.x + tangent.x * hookPx * hookSign,
    y: top.y + tangent.y * hookPx * hookSign,
  };
  const bottomHook = {
    x: bottom.x + tangent.x * hookPx * hookSign,
    y: bottom.y + tangent.y * hookPx * hookSign,
  };
  return `M ${topHook.x} ${topHook.y} L ${top.x} ${top.y} L ${bottom.x} ${bottom.y} L ${bottomHook.x} ${bottomHook.y}`;
}

/**
 * Distance from a point to a finite segment, all in the same coordinate space.
 * Degenerate (zero-length) segments fall back to point distance.
 */
export function distancePointToSegment(
  p: DrawPoint,
  a: DrawPoint,
  b: DrawPoint,
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 <= 1e-12) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Computes the molecule-space position for an atom sprouted from `fromAtom`
 * toward a pointer target, snapping the direction to 30-degree increments at
 * the standard bond length. When the pointer sits on the source atom, the new
 * atom is placed to the right.
 *
 * @param from - Source atom position in molecule space.
 * @param toward - Pointer target in molecule space.
 * @param bondLength - Distance from `from` for the new atom.
 * @returns Snapped molecule-space position for the new atom.
 */
/**
 * Picks a molecule-space position for sprouting a bond from `fromAtom` into the
 * widest angular gap between existing neighbors. When the atom is isolated, the
 * new position lies to the right at `bondLength`.
 *
 * @param mol - Molecule containing `fromAtom`; not mutated.
 * @param fromAtom - Atom index to sprout from.
 * @param bondLength - Distance for the new atom in molecule units.
 * @returns Coordinates for a sprouted atom in the least obstructed direction.
 */
export function pickDefaultSproutPosition(
  mol: Molecule,
  fromAtom: number,
  bondLength: number = DRAW_STANDARD_BOND_LENGTH,
): DrawPoint {
  const fromX = mol.getAtomX(fromAtom);
  const fromY = mol.getAtomY(fromAtom);
  const nc = mol.getConnAtoms(fromAtom);
  if (nc === 0) {
    return { x: fromX + bondLength, y: fromY };
  }
  const angles: number[] = [];
  for (let i = 0; i < nc; i += 1) {
    const nb = mol.getConnAtom(fromAtom, i);
    angles.push(Math.atan2(mol.getAtomY(nb) - fromY, mol.getAtomX(nb) - fromX));
  }
  angles.sort((a, b) => a - b);
  let bestMid = angles[0]! + Math.PI;
  let bestGap = -1;
  for (let i = 0; i < angles.length; i += 1) {
    const a0 = angles[i]!;
    const a1 = i + 1 < angles.length ? angles[i + 1]! : angles[0]! + 2 * Math.PI;
    const gap = a1 - a0;
    if (gap > bestGap) {
      bestGap = gap;
      bestMid = (a0 + a1) / 2;
    }
  }
  return {
    x: fromX + bondLength * Math.cos(bestMid),
    y: fromY + bondLength * Math.sin(bestMid),
  };
}

export function snapSproutPosition(
  from: DrawPoint,
  toward: DrawPoint,
  bondLength: number,
): DrawPoint {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  const angle =
    Math.hypot(dx, dy) <= 1e-9 ? 0 : Math.atan2(dy, dx);
  const step = Math.PI / 6;
  const snapped = Math.round(angle / step) * step;
  return {
    x: from.x + bondLength * Math.cos(snapped),
    y: from.y + bondLength * Math.sin(snapped),
  };
}

/**
 * Offsets both endpoints of a bond segment along the bond normal.
 *
 * @param p0 - Segment start in screen space.
 * @param p1 - Segment end in screen space.
 * @param normalOffsetPx - Signed offset along the unit normal (pixels).
 * @returns Parallel segment with the same length as the input segment.
 */
function offsetBondSegment(
  p0: DrawPoint,
  p1: DrawPoint,
  normalOffsetPx: number,
): [DrawPoint, DrawPoint] {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy);
  if (len <= 1e-9 || Math.abs(normalOffsetPx) <= 1e-9) {
    return [p0, p1];
  }
  const nx = (-dy / len) * normalOffsetPx;
  const ny = (dx / len) * normalOffsetPx;
  return [
    { x: p0.x + nx, y: p0.y + ny },
    { x: p1.x + nx, y: p1.y + ny },
  ];
}

/**
 * Computes the parallel line segments used to render a bond of the given
 * order in screen space. Order 1 yields one center line. Order 2 yields two
 * equal-length tracks offset symmetrically about the bond axis. Order 3
 * yields three equal-length tracks spaced evenly (center plus two outers).
 *
 * @param p0 - Screen position of the first bond atom.
 * @param p1 - Screen position of the second bond atom.
 * @param order - Bond order (1, 2, or 3); other values render as order 1.
 * @param offsetPx - Perpendicular spacing between adjacent parallel lines in
 *   pixels (double bonds use half on each side; triple bonds use full steps).
 * @returns One to three line segments as `[start, end]` pairs.
 */
/** Fraction trimmed from each end of the inner line on ring double bonds (OCL style). */
const RING_INNER_DOUBLE_BOND_END_TRIM_FRACTION = 0.16;

function bondRingAtomIndices(mol: Molecule, bondIndex: number): number[] | null {
  if (!mol.isRingBond(bondIndex)) {
    return null;
  }
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  const ringSet = mol.getRingSet();
  for (let ring = 0; ring < ringSet.getSize(); ring += 1) {
    const ringBonds = ringSet.getRingBonds(ring);
    let member = false;
    for (const ringBond of ringBonds) {
      if (ringBond === bondIndex) {
        member = true;
        break;
      }
    }
    if (!member) {
      continue;
    }
    const ringSize = ringSet.getRingSize(ring);
    const ringAtoms = ringSet.getRingAtoms(ring);
    const atoms: number[] = [];
    for (let i = 0; i < ringSize; i += 1) {
      atoms.push(ringAtoms[i]!);
    }
    return atoms;
  }
  return null;
}

/**
 * For a ring bond, returns +1 when the positive bond normal (left of p0 to p1)
 * points toward the ring centroid in molecule space, or -1 when it points away.
 * Returns null for acyclic bonds.
 *
 * @param mol - Molecule with ring helpers prepared.
 * @param bondIndex - Bond index in `[0, mol.getBonds())`.
 */
export function ringBondInteriorNormalSign(
  mol: Molecule,
  bondIndex: number,
): number | null {
  const ringAtoms = bondRingAtomIndices(mol, bondIndex);
  if (ringAtoms === null || ringAtoms.length === 0) {
    return null;
  }
  const atom0 = mol.getBondAtom(0, bondIndex);
  const atom1 = mol.getBondAtom(1, bondIndex);
  let centroidX = 0;
  let centroidY = 0;
  for (const atom of ringAtoms) {
    centroidX += mol.getAtomX(atom);
    centroidY += mol.getAtomY(atom);
  }
  centroidX /= ringAtoms.length;
  centroidY /= ringAtoms.length;
  const midX = (mol.getAtomX(atom0) + mol.getAtomX(atom1)) / 2;
  const midY = (mol.getAtomY(atom0) + mol.getAtomY(atom1)) / 2;
  const dx = mol.getAtomX(atom1) - mol.getAtomX(atom0);
  const dy = mol.getAtomY(atom1) - mol.getAtomY(atom0);
  const len = Math.hypot(dx, dy);
  if (len <= 1e-9) {
    return null;
  }
  const normalX = -dy / len;
  const normalY = dx / len;
  const towardCenter =
    (centroidX - midX) * normalX + (centroidY - midY) * normalY;
  return towardCenter >= 0 ? 1 : -1;
}

export function bondRenderSegments(
  p0: DrawPoint,
  p1: DrawPoint,
  order: number,
  offsetPx: number,
): Array<[DrawPoint, DrawPoint]> {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy);
  if (len <= 1e-9 || order <= 1 || order > 3) {
    return [[p0, p1]];
  }
  if (order === 2) {
    const half = offsetPx / 2;
    return [
      offsetBondSegment(p0, p1, half),
      offsetBondSegment(p0, p1, -half),
    ];
  }
  return [
    offsetBondSegment(p0, p1, -offsetPx),
    offsetBondSegment(p0, p1, 0),
    offsetBondSegment(p0, p1, offsetPx),
  ];
}

/**
 * Computes bond render segments with ring-aware double-bond placement: ring
 * doubles keep the primary line on the perimeter and draw a shorter inner
 * parallel line toward the ring centroid (ChemDraw / OpenChemLib style).
 *
 * @param mol - Molecule used for ring membership; not mutated.
 * @param bondIndex - Bond index aligned with `p0` / `p1` atom order.
 * @param p0 - Screen position of the first bond atom.
 * @param p1 - Screen position of the second bond atom.
 * @param order - Bond order (1, 2, or 3).
 * @param offsetPx - Perpendicular spacing between parallel lines in pixels.
 * @param offsetMode - Manual double-bond placement override; `auto` keeps the
 *   ring-interior heuristic on ring bonds and symmetric doubles on chains.
 */
export function bondRenderSegmentsWithRingAwareness(
  mol: Molecule,
  bondIndex: number,
  p0: DrawPoint,
  p1: DrawPoint,
  order: number,
  offsetPx: number,
  offsetMode: DoubleBondOffsetMode = "auto",
): Array<[DrawPoint, DrawPoint]> {
  if (order !== 2) {
    return bondRenderSegments(p0, p1, order, offsetPx);
  }
  if (offsetMode === "center") {
    return bondRenderSegments(p0, p1, order, offsetPx);
  }
  const ringInteriorSign = ringBondInteriorNormalSign(mol, bondIndex);
  let interiorSign: number;
  if (offsetMode === "auto") {
    if (ringInteriorSign === null) {
      return bondRenderSegments(p0, p1, order, offsetPx);
    }
    interiorSign = ringInteriorSign;
  } else if (offsetMode === "inside") {
    interiorSign = ringInteriorSign ?? 1;
  } else {
    interiorSign = -(ringInteriorSign ?? 1);
  }
  const bondLen = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  const trimPx =
    ringInteriorSign === null ? 0 : bondLen * RING_INNER_DOUBLE_BOND_END_TRIM_FRACTION;
  const inner = offsetBondSegment(p0, p1, interiorSign * (offsetPx / 2));
  const shortenedInner =
    trimPx > 0 ? trimSegmentEnds(inner[0], inner[1], trimPx, trimPx) : inner;
  if (offsetMode === "outside" && ringInteriorSign === null) {
    return [
      offsetBondSegment(p0, p1, interiorSign * (offsetPx / 2)),
      offsetBondSegment(p0, p1, -interiorSign * (offsetPx / 2)),
    ];
  }
  if (offsetMode === "inside" && ringInteriorSign === null) {
    return bondRenderSegments(p0, p1, order, offsetPx);
  }
  return [
    [p0, p1],
    shortenedInner,
  ];
}

/** Cycles manual double-bond offset modes for draw-tool toggling. */
export function cycleDoubleBondOffsetMode(
  mode: DoubleBondOffsetMode,
): DoubleBondOffsetMode {
  switch (mode) {
    case "auto":
      return "inside";
    case "inside":
      return "outside";
    case "outside":
      return "center";
    case "center":
      return "auto";
    default: {
      const exhaustive: never = mode;
      return exhaustive;
    }
  }
}

/**
 * Shortens a screen-space segment by a fixed number of pixels at each end so
 * bond lines do not overlap atom labels. The segment collapses to its center
 * when shorter than the total trim.
 */
export function trimSegmentEnds(
  p0: DrawPoint,
  p1: DrawPoint,
  trimStartPx: number,
  trimEndPx: number,
): [DrawPoint, DrawPoint] {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy);
  if (len <= trimStartPx + trimEndPx + 1e-9) {
    const cx = (p0.x + p1.x) / 2;
    const cy = (p0.y + p1.y) / 2;
    return [
      { x: cx, y: cy },
      { x: cx, y: cy },
    ];
  }
  const ux = dx / len;
  const uy = dy / len;
  return [
    { x: p0.x + ux * trimStartPx, y: p0.y + uy * trimStartPx },
    { x: p1.x - ux * trimEndPx, y: p1.y - uy * trimEndPx },
  ];
}
