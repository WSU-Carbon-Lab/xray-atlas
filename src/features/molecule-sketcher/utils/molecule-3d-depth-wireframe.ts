import type { Molecule } from "openchemlib";
import {
  ConformerGenerator,
  ForceFieldMMFF94,
  Molecule as MoleculeCtor,
} from "openchemlib";
export const DEFAULT_OCL_DEPICTION_TO_SVG_OPTIONS = {
  autoCrop: true,
  autoCropMargin: 12,
  suppressChiralText: true,
  suppressCIPParity: true,
  suppressESR: true,
  noStereoProblem: true,
  noImplicitHydrogen: true,
} as const;

export interface DepthWireframeOptions {
  width: number;
  height: number;
  svgId: string;
  isDark: boolean;
  margin?: number;
}

export type DepthWireframeResult =
  | { ok: true; svg: string }
  | { ok: false; message: string };

export type View3d = {
  yaw: number;
  pitch: number;
  roll: number;
  panPx: { x: number; y: number };
  zoom: number;
};

export function defaultView3d(): View3d {
  return { yaw: 0, pitch: 0, roll: 0, panPx: { x: 0, y: 0 }, zoom: 1 };
}

export type Molecule3dSession = {
  mol3d: Molecule;
  centered: Float64Array;
  centroid: [number, number, number];
  rPca: number[];
};

export type View3dAxisPreset = "face" | "alongModelX" | "alongModelY";

export function applyView3dAxisPreset(
  view: View3d,
  preset: View3dAxisPreset,
): View3d {
  if (preset === "face") return { ...view, yaw: 0, pitch: 0, roll: 0 };
  if (preset === "alongModelX") {
    return { ...view, yaw: Math.PI / 2, pitch: 0, roll: 0 };
  }
  return { ...view, yaw: 0, pitch: Math.PI / 2, roll: 0 };
}

function matVec3(
  m: number[],
  p: [number, number, number],
): [number, number, number] {
  return [
    m[0]! * p[0] + m[1]! * p[1] + m[2]! * p[2],
    m[3]! * p[0] + m[4]! * p[1] + m[5]! * p[2],
    m[6]! * p[0] + m[7]! * p[1] + m[8]! * p[2],
  ];
}

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

function identityBasisRows(): number[] {
  return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

function combinedViewMatrix(intrinsicRows: number[], view: View3d): number[] {
  const Rz = matRotateZ(view.roll);
  const Ry = matRotateY(view.yaw);
  const Rx = matRotateX(view.pitch);
  const user = matMul3(Rz, matMul3(Ry, Rx));
  return matMul3(user, intrinsicRows);
}

export function getSessionIntrinsicBasis(session: Molecule3dSession): number[] {
  return session.rPca;
}

export function cloneMolecule3dSession(session: Molecule3dSession): Molecule3dSession {
  const mol3d = MoleculeCtor.fromMolfile(session.mol3d.toMolfileV3());
  return {
    mol3d,
    centered: new Float64Array(session.centered),
    centroid: [session.centroid[0], session.centroid[1], session.centroid[2]],
    rPca: [...session.rPca],
  };
}

function pointToSegmentDistance2d(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-18) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx;
  const qy = y1 + t * dy;
  return Math.hypot(px - qx, py - qy);
}

function normalizePlaneCoordsToIdealAverage(
  mol: Molecule,
  x2: number[],
  y2: number[],
): { x: number[]; y: number[] } {
  const n = mol.getAtoms();
  let bondLenSum = 0;
  let bondCount = 0;
  const bonds = mol.getBonds();
  for (let b = 0; b < bonds; b += 1) {
    const a0 = mol.getBondAtom(0, b);
    const a1 = mol.getBondAtom(1, b);
    const dx = x2[a0]! - x2[a1]!;
    const dy = y2[a0]! - y2[a1]!;
    bondLenSum += Math.hypot(dx, dy);
    bondCount += 1;
  }
  const targetAv =
    bondCount > 0
      ? bondLenSum / bondCount
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
  return { x, y };
}

function rawRotatedPlaneXY(
  session: Molecule3dSession,
  view: View3d,
): { x: number[]; y: number[] } {
  const R = combinedViewMatrix(getSessionIntrinsicBasis(session), view);
  const mol3d = session.mol3d;
  const n = mol3d.getAtoms();
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const p: [number, number, number] = [
      session.centered[i * 3]!,
      session.centered[i * 3 + 1]!,
      session.centered[i * 3 + 2]!,
    ];
    const t = matVec3(R, p);
    x.push(t[0]);
    y.push(-t[1]);
  }
  return { x, y };
}

export function computeAtomViewSpaceZ(
  session: Molecule3dSession,
  view: View3d,
): number[] {
  const R = combinedViewMatrix(getSessionIntrinsicBasis(session), view);
  const n = session.mol3d.getAtoms();
  const z: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const p: [number, number, number] = [
      session.centered[i * 3]!,
      session.centered[i * 3 + 1]!,
      session.centered[i * 3 + 2]!,
    ];
    const t = matVec3(R, p);
    z.push(-t[2]);
  }
  return z;
}

function mapAtomDepthAfterStrip(
  molBeforeStrip: Molecule,
  zFull: number[],
  molAfter: Molecule,
): number[] {
  const beforeN = molBeforeStrip.getAtoms();
  const snap: { x: number; y: number }[] = [];
  for (let i = 0; i < beforeN; i += 1) {
    snap.push({
      x: molBeforeStrip.getAtomX(i),
      y: molBeforeStrip.getAtomY(i),
    });
  }
  const afterN = molAfter.getAtoms();
  const out: number[] = [];
  for (let ia = 0; ia < afterN; ia += 1) {
    const xa = molAfter.getAtomX(ia);
    const ya = molAfter.getAtomY(ia);
    let bestIb = 0;
    let bestD = Infinity;
    for (let ib = 0; ib < beforeN; ib += 1) {
      const d = Math.hypot(snap[ib]!.x - xa, snap[ib]!.y - ya);
      if (d < bestD) {
        bestD = d;
        bestIb = ib;
      }
    }
    out.push(zFull[bestIb]!);
  }
  return out;
}

export type OclDepiction3dSvgPack = {
  svg: string;
  atomDepth: number[];
  strippedMolfileV3: string;
};


export function computeMergedNormalizedPlaneCoords(
  session: Molecule3dSession,
  view: View3d,
): { x: number[]; y: number[] } {
  const mol3d = session.mol3d;
  const raw = rawRotatedPlaneXY(session, view);
  return normalizePlaneCoordsToIdealAverage(mol3d, raw.x, raw.y);
}

function planeArraysToScreenMap(
  planeU: number[],
  planeW: number[],
  opts: DepthWireframeOptions,
  view: View3d,
): { toSx: (u: number) => number; toSy: (w: number) => number; scale: number } {
  const margin = opts.margin ?? 16;
  let minU = Infinity;
  let maxU = -Infinity;
  let minW = Infinity;
  let maxW = -Infinity;
  for (let i = 0; i < planeU.length; i += 1) {
    minU = Math.min(minU, planeU[i]!);
    maxU = Math.max(maxU, planeU[i]!);
    minW = Math.min(minW, planeW[i]!);
    maxW = Math.max(maxW, planeW[i]!);
  }
  const spanU = Math.max(maxU - minU, 1e-6);
  const spanW = Math.max(maxW - minW, 1e-6);
  const cw = opts.width - 2 * margin;
  const ch = opts.height - 2 * margin;
  const scale =
    Math.min(cw / spanU, ch / spanW) * Math.max(0.25, Math.min(4, view.zoom));
  const cu = (minU + maxU) / 2;
  const cwp = (minW + maxW) / 2;
  const toSx = (u: number) =>
    opts.width / 2 + (u - cu) * scale + view.panPx.x;
  const toSy = (w: number) =>
    opts.height / 2 - (w - cwp) * scale + view.panPx.y;
  return { toSx, toSy, scale };
}

export type SessionDepictionLayout = {
  planeX: number[];
  planeY: number[];
  toSx: (u: number) => number;
  toSy: (w: number) => number;
  scale: number;
};

export function computeSessionDepictionLayout(
  session: Molecule3dSession,
  view: View3d,
  opts: DepthWireframeOptions,
): SessionDepictionLayout {
  const { x, y } = computeMergedNormalizedPlaneCoords(session, view);
  const { toSx, toSy, scale } = planeArraysToScreenMap(x, y, opts, view);
  return { planeX: x, planeY: y, toSx, toSy, scale };
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

export function sessionToOclDepictionSvg(
  session: Molecule3dSession,
  view: View3d,
  opts: DepthWireframeOptions,
  molfile2d: string,
): OclDepiction3dSvgPack {
  const { x, y } = computeMergedNormalizedPlaneCoords(session, view);
  const zFull = computeAtomViewSpaceZ(session, view);
  let mol: Molecule;
  try {
    mol = MoleculeCtor.fromMolfile(molfile2d);
  } catch {
    mol = MoleculeCtor.fromMolfile(session.mol3d.toMolfileV3());
  }
  if (mol.getAtoms() !== x.length) {
    mol = MoleculeCtor.fromMolfile(session.mol3d.toMolfileV3());
  }
  applyPlaneCoordsToMolecule(mol, x, y);
  const beforeStrip = MoleculeCtor.fromMolfile(mol.toMolfileV3());
  mol.removeExplicitHydrogens();
  const atomDepth = mapAtomDepthAfterStrip(beforeStrip, zFull, mol);
  const svg = mol.toSVG(opts.width, opts.height, opts.svgId, {
    ...DEFAULT_OCL_DEPICTION_TO_SVG_OPTIONS,
  });
  return {
    svg,
    atomDepth,
    strippedMolfileV3: mol.toMolfileV3(),
  };
}

export function nearestBondIndexAtScreen(
  session: Molecule3dSession,
  view: View3d,
  opts: DepthWireframeOptions,
  clientX: number,
  clientY: number,
  svgEl: SVGSVGElement | null,
  maxDistPx: number,
): number | null {
  if (!svgEl) return null;
  const pt = svgEl.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return null;
  const inv = ctm.inverse();
  const loc = pt.matrixTransform(inv);
  const px = loc.x;
  const py = loc.y;
  const { planeX, planeY, toSx, toSy } = computeSessionDepictionLayout(
    session,
    view,
    opts,
  );
  const mol3d = session.mol3d;
  const bonds = mol3d.getBonds();
  let best: number | null = null;
  let bestD = maxDistPx;
  for (let b = 0; b < bonds; b += 1) {
    const a0 = mol3d.getBondAtom(0, b);
    const a1 = mol3d.getBondAtom(1, b);
    const x1 = toSx(planeX[a0]!);
    const y1 = toSy(planeY[a0]!);
    const x2 = toSx(planeX[a1]!);
    const y2 = toSy(planeY[a1]!);
    const d = pointToSegmentDistance2d(px, py, x1, y1, x2, y2);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

export function nearestAtomIndexAtScreen(
  session: Molecule3dSession,
  view: View3d,
  opts: DepthWireframeOptions,
  clientX: number,
  clientY: number,
  svgEl: SVGSVGElement | null,
  maxDistPx: number,
): number | null {
  if (!svgEl) return null;
  const pt = svgEl.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return null;
  const inv = ctm.inverse();
  const loc = pt.matrixTransform(inv);
  const px = loc.x;
  const py = loc.y;
  const { planeX, planeY, toSx, toSy, scale } = computeSessionDepictionLayout(
    session,
    view,
    opts,
  );
  const n = session.mol3d.getAtoms();
  const r = Math.max(10, Math.min(22, scale * 0.2));
  let best: number | null = null;
  let bestD = maxDistPx;
  for (let i = 0; i < n; i += 1) {
    const ax = toSx(planeX[i]!);
    const ay = toSy(planeY[i]!);
    const d = Math.hypot(px - ax, py - ay);
    if (d < bestD && d <= r) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function isCarbonHeavyCageCandidate(mol: Molecule): boolean {
  try {
    const formula = mol.getMolecularFormula().formula;
    const mc = /^C(\d+)/.exec(formula);
    if (!mc) return false;
    const c = Number.parseInt(mc[1]!, 10);
    if (c < 36) return false;
    const heavy = mol.getAtoms();
    let heteroHeavy = 0;
    for (let i = 0; i < heavy; i += 1) {
      const z = mol.getAtomicNo(i);
      if (z > 1 && z !== 6) heteroHeavy += 1;
    }
    return heteroHeavy <= 28;
  } catch {
    return false;
  }
}

function cloneMolecule(mol: Molecule): Molecule {
  return MoleculeCtor.fromMolfile(mol.toMolfileV3());
}

function relaxWithMmff(mol: Molecule, aggressive: boolean): void {
  const opts = aggressive
    ? { maxIts: 6000, gradTol: 5e-4, funcTol: 1e-6 }
    : { maxIts: 2200, gradTol: 1e-3, funcTol: 1e-5 };
  for (const table of ["MMFF94s", "MMFF94"] as const) {
    try {
      const ff = new ForceFieldMMFF94(mol, table);
      ff.minimise(opts);
      return;
    } catch {
      /* try next table */
    }
  }
}

function mmffEnergy(mol: Molecule): number {
  for (const table of ["MMFF94s", "MMFF94"] as const) {
    try {
      const ff = new ForceFieldMMFF94(mol, table);
      return ff.getTotalEnergy();
    } catch {
      /* continue */
    }
  }
  return Number.POSITIVE_INFINITY;
}

function bestConformer3d(template: Molecule, cageHeavy: boolean): Molecule | null {
  const seeds = cageHeavy ? [0x31d4] : [0x7e57];
  let best: Molecule | null = null;
  let bestE = Number.POSITIVE_INFINITY;
  for (const seed of seeds) {
    const gen = new ConformerGenerator(seed);
    const c = gen.getOneConformerAsMolecule(cloneMolecule(template));
    if (!c) continue;
    relaxWithMmff(c, cageHeavy);
    const e = mmffEnergy(c);
    if (e < bestE) {
      bestE = e;
      best = c;
    }
  }
  return best;
}

export function createMolecule3dSession(
  molfileOrMolecule: string | Molecule,
): { ok: true; session: Molecule3dSession } | { ok: false; message: string } {
  let mol: Molecule;
  try {
    mol =
      typeof molfileOrMolecule === "string"
        ? MoleculeCtor.fromMolfile(molfileOrMolecule)
        : molfileOrMolecule;
  } catch {
    return { ok: false, message: "Could not parse structure for 3D view." };
  }

  const cageHeavy = isCarbonHeavyCageCandidate(mol);
  const mol3d = bestConformer3d(mol, cageHeavy);
  if (!mol3d) {
    return {
      ok: false,
      message:
        "3D layout failed (conformer generation). Try a smaller structure or 2D view.",
    };
  }

  const n = mol3d.getAtoms();
  if (n < 2) {
    return { ok: false, message: "Nothing to draw." };
  }

  let cx = 0;
  let cy = 0;
  let cz = 0;
  const raw: [number, number, number][] = [];
  for (let i = 0; i < n; i += 1) {
    const x = mol3d.getAtomX(i);
    const y = mol3d.getAtomY(i);
    const z = mol3d.getAtomZ(i);
    raw.push([x, y, z]);
    cx += x;
    cy += y;
    cz += z;
  }
  cx /= n;
  cy /= n;
  cz /= n;

  const centeredArr: [number, number, number][] = raw.map(([x, y, z]) => [
    x - cx,
    y - cy,
    z - cz,
  ]);

  const flat = new Float64Array(n * 3);
  for (let i = 0; i < n; i += 1) {
    flat[i * 3] = centeredArr[i]![0];
    flat[i * 3 + 1] = centeredArr[i]![1];
    flat[i * 3 + 2] = centeredArr[i]![2];
  }

  const rPca = identityBasisRows();

  return {
    ok: true,
    session: {
      mol3d,
      centered: flat,
      centroid: [cx, cy, cz],
      rPca,
    },
  };
}

export function collapseSessionTo2DMolfile(
  session: Molecule3dSession,
  view: View3d,
  molfile2d: string | null,
): string {
  const { x, y } = computeMergedNormalizedPlaneCoords(session, view);
  let out: Molecule;
  if (molfile2d) {
    try {
      out = MoleculeCtor.fromMolfile(molfile2d);
    } catch {
      out = MoleculeCtor.fromMolfile(session.mol3d.toMolfileV3());
    }
    if (out.getAtoms() !== x.length) {
      out = MoleculeCtor.fromMolfile(session.mol3d.toMolfileV3());
    }
  } else {
    out = MoleculeCtor.fromMolfile(session.mol3d.toMolfileV3());
  }
  applyPlaneCoordsToMolecule(out, x, y);
  out.removeExplicitHydrogens();
  return out.toMolfileV3();
}

export function build3dDepthWireframeSvg(
  molfileOrMolecule: string | Molecule,
  opts: DepthWireframeOptions,
): DepthWireframeResult {
  const created = createMolecule3dSession(molfileOrMolecule);
  if (!created.ok) return created;
  const molfileStr =
    typeof molfileOrMolecule === "string"
      ? molfileOrMolecule
      : molfileOrMolecule.toMolfileV3();
  return {
    ok: true,
    svg: sessionToOclDepictionSvg(
      created.session,
      defaultView3d(),
      opts,
      molfileStr,
    ).svg,
  };
}
