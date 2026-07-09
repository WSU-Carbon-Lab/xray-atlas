/**
 * Shared 2D structure depiction constants and label helpers for the molecule
 * draw canvas and OpenChemLib SVG post-processing in the structure editor.
 *
 * Keeps bond stroke weight, atom label typography, implicit-hydrogen display
 * rules, and hit-target sizes aligned between custom SVG rendering and themed
 * OCL output.
 */

import type { Molecule } from "openchemlib";
import { Molecule as MoleculeCtor } from "openchemlib";

import {
  bondStrokeHexForMoleculeSvgTheme,
  cpkHexForElementSymbol,
} from "~/lib/molecule-svg-cpk-theme";
import { MOLECULE_SVG_LABEL_FONT_WEIGHT } from "~/lib/molecule-svg-typography";
import { isAbbreviatedAlkylLabel } from "./alkyl-label-expand";

/** Visible bond stroke width in SVG user units (draw canvas and themed OCL lines). */
export const MOLECULE_2D_BOND_STROKE_WIDTH = 1.6;

/** Parallel offset between double/triple bond lines in screen pixels. */
export const MOLECULE_2D_MULTI_BOND_OFFSET_PX = 4.5;

/** Bond line cap for plain (non-dative) bonds on the draw canvas. */
export const MOLECULE_2D_BOND_LINE_CAP = "butt" as const;

/** Dashed dative bond pattern on the draw canvas. */
export const MOLECULE_2D_DATIVE_DASHARRAY = "5 4";

/** Formal charge limits enforced by the draw-canvas atom editor. */
export const MOLECULE_DRAW_CHARGE_MIN = -4;

/** Formal charge limits enforced by the draw-canvas atom editor. */
export const MOLECULE_DRAW_CHARGE_MAX = 4;

/**
 * Clamps an integer formal charge to the draw-canvas editor range.
 *
 * @param charge - Requested formal charge.
 */
export function clampMoleculeDrawCharge(charge: number): number {
  if (!Number.isFinite(charge)) {
    return 0;
  }
  const rounded = Math.round(charge);
  return Math.min(
    MOLECULE_DRAW_CHARGE_MAX,
    Math.max(MOLECULE_DRAW_CHARGE_MIN, rounded),
  );
}

/** Shorten a segment by fixed distances at each end (SVG user units). */
function trimLineSegmentEnds(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  trimStart: number,
  trimEnd: number,
): { x0: number; y0: number; x1: number; y1: number } {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len <= trimStart + trimEnd + 1e-9) {
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    return { x0: cx, y0: cy, x1: cx, y1: cy };
  }
  const ux = dx / len;
  const uy = dy / len;
  return {
    x0: x0 + ux * trimStart,
    y0: y0 + uy * trimStart,
    x1: x1 - ux * trimEnd,
    y1: y1 - uy * trimEnd,
  };
}

/**
 * Endpoint trim for a dative-bond segment at an atom label so the stroke stays
 * in the gap between symbols instead of painting through charge superscripts.
 *
 * @param mol - Molecule containing `atom`.
 * @param atom - Atom index at the bond endpoint.
 */
export function dativeBondEndpointTrimPx(mol: Molecule, atom: number): number {
  const atomicNo = mol.getAtomicNo(atom);
  const symbol = MoleculeCtor.cAtomLabel[atomicNo] ?? "C";
  const charge = mol.getAtomCharge(atom);
  const hasCustomLabel = (mol.getAtomCustomLabel(atom) ?? "").trim().length > 0;
  let trim = MOLECULE_2D_LABEL_TRIM_PX;
  if (symbol !== "C" || charge !== 0 || hasCustomLabel) {
    trim += 4;
  }
  if (charge !== 0) {
    trim += 6;
  }
  if (symbol.length >= 2) {
    trim += 2;
  }
  return trim;
}

function dativeBondStrokeInsertAnchor(svgRoot: Element): Element | null {
  const firstText = svgRoot.querySelector("text");
  if (firstText !== null) {
    return firstText;
  }
  const firstVisibleLine = [...svgRoot.querySelectorAll("line")].find(
    (line) => line.getAttribute("opacity") !== "0",
  );
  return firstVisibleLine ?? svgRoot.firstElementChild;
}

/** Atom label font size in SVG user units. */
export const MOLECULE_2D_ATOM_LABEL_FONT_SIZE = 13;

/** Subscript scale relative to {@link MOLECULE_2D_ATOM_LABEL_FONT_SIZE}. */
export const MOLECULE_2D_SUBSCRIPT_FONT_SCALE = 0.72;

/** Subscript baseline shift in em units (negative raises subscripts). */
export const MOLECULE_2D_SUBSCRIPT_BASELINE_SHIFT_EM = -0.28;

/** Atom label font weight; aligned with {@link MOLECULE_SVG_LABEL_FONT_WEIGHT}. */
export const MOLECULE_2D_ATOM_LABEL_FONT_WEIGHT = MOLECULE_SVG_LABEL_FONT_WEIGHT;

/** Vertical offset applied to centered atom labels (baseline tweak). */
export const MOLECULE_2D_ATOM_LABEL_Y_OFFSET = 4.5;

/** Halo stroke width behind atom labels for contrast on bonds. */
export const MOLECULE_2D_ATOM_LABEL_HALO_STROKE_WIDTH = 3;

/** Shorten bond segments at labeled atom ends (screen pixels). */
export const MOLECULE_2D_LABEL_TRIM_PX = 9;

/** Pointer hit radius around atom centers in depiction viewBox user units. */
export const MOLECULE_2D_ATOM_HIT_RADIUS_PX = 12;

/**
 * Tight radius around junction atom centers where pointer hits always resolve to
 * the atom (ChemDraw-style vertex core), not an adjacent bond stem.
 */
export const MOLECULE_2D_JUNCTION_VERTEX_CORE_RADIUS_PX = 9;

/**
 * Endpoint trim applied to bond segments for hit-testing so stems remain
 * clickable near junctions without swallowing the vertex core.
 */
export const MOLECULE_2D_BOND_ENDPOINT_TRIM_RADIUS_PX = 9;

/** Minimum bond count treated as a multi-way junction for vertex-core priority. */
export const MOLECULE_2D_JUNCTION_DEGREE_MIN = 3;

/** Visible hover/selection halo radius in depiction viewBox user units (matches OCL hit circles). */
export const MOLECULE_2D_ATOM_HOVER_RADIUS_PX = 8;

/** Pointer tolerance for bond line hits (screen pixels). */
export const MOLECULE_2D_BOND_HIT_TOLERANCE_PX = 8;

/** Hover highlight width behind bonds (screen pixels). */
export const MOLECULE_2D_BOND_HOVER_STROKE_WIDTH = 8;

/** Polymer bookend bracket stroke width. */
export const MOLECULE_2D_BOOKEND_STROKE_WIDTH = 2;

/** Chunk cut marker index font size (matches atom labels). */
export const MOLECULE_2D_NOTATION_FONT_SIZE = MOLECULE_2D_ATOM_LABEL_FONT_SIZE;

/** Polymer repeat-unit `n` subscript font size. */
export const MOLECULE_2D_BOOKEND_SUBSCRIPT_FONT_SIZE =
  MOLECULE_2D_ATOM_LABEL_FONT_SIZE * MOLECULE_2D_SUBSCRIPT_FONT_SCALE;

/** Fit padding when auto-framing a molecule in the draw viewport (pixels). */
export const MOLECULE_2D_FIT_PADDING_PX = 48;

/** Maximum zoom when fitting a small fragment (pixels per molecule unit). */
export const MOLECULE_2D_MAX_SCALE_PX_PER_UNIT = 56;

/** Label halo color behind atom text for readability. */
export function atomLabelHaloStrokeHex(isDark: boolean): string {
  return isDark ? "#1a1a1a" : "#ffffff";
}

/**
 * Builds the atom label string shown on the draw canvas, including implicit
 * hydrogens and formal charge suffixes.
 */
export function formatMolecule2dAtomLabelText(
  symbol: string,
  implicitH: number,
  charge: number,
): string {
  let text = symbol;
  if (implicitH === 1) {
    text += "H";
  } else if (implicitH > 1) {
    text += `H${implicitH}`;
  }
  if (charge > 0) {
    text += charge === 1 ? "+" : `${charge}+`;
  } else if (charge < 0) {
    text += charge === -1 ? "-" : `${-charge}-`;
  }
  return text;
}

/** Resolves fill color for an atom label on the draw canvas. */
export function molecule2dAtomLabelFill(
  symbol: string,
  isDark: boolean,
  hasCustomLabel: boolean,
): string {
  if (hasCustomLabel) {
    return cpkHexForElementSymbol("C", isDark);
  }
  return cpkHexForElementSymbol(symbol, isDark);
}

/**
 * Reports whether `atom` is a terminal sprouted carbon carrying an abbreviated
 * CnH2n+1 custom label (database-style alkyl tail stub). Depiction hides the
 * stub vertex and renders one bond from the neighbor to the label.
 */
export function isAbbreviatedAlkylTailStub(mol: Molecule, atom: number): boolean {
  if (mol.getAtomicNo(atom) !== 6) {
    return false;
  }
  if (mol.getConnAtoms(atom) !== 1) {
    return false;
  }
  return isAbbreviatedAlkylLabel(mol.getAtomCustomLabel(atom));
}

/**
 * Returns the sole neighbor of an abbreviated alkyl tail stub, or -1 when
 * `atom` is not a stub.
 */
export function abbreviatedAlkylTailNeighbor(mol: Molecule, atom: number): number {
  if (!isAbbreviatedAlkylTailStub(mol, atom)) {
    return -1;
  }
  return mol.getConnAtom(atom, 0);
}

/**
 * Reports whether an atom label should render on the 2D canvas (implicit
 * carbons stay blank unless charged, isolated, or carrying a custom label).
 */
export function shouldShowMolecule2dAtomLabel(options: {
  symbol: string;
  charge: number;
  connectionCount: number;
  hasCustomLabel: boolean;
}): boolean {
  return (
    options.hasCustomLabel ||
    options.symbol !== "C" ||
    options.charge !== 0 ||
    options.connectionCount === 0
  );
}

/**
 * Normalizes bond stroke widths on an OCL-generated SVG root so lines match
 * {@link MOLECULE_2D_BOND_STROKE_WIDTH}. Call after CPK theming.
 */
export function applyMolecule2dBondStrokeWidthToSvgRoot(svgRoot: Element): void {
  svgRoot.querySelectorAll("line").forEach((lineElem) => {
    const stroke = lineElem.getAttribute("stroke");
    const opacity = lineElem.getAttribute("opacity");
    if (stroke && stroke !== "none" && opacity !== "0") {
      lineElem.setAttribute("stroke-width", String(MOLECULE_2D_BOND_STROKE_WIDTH));
    }
  });
  svgRoot.querySelectorAll("path").forEach((pathElem) => {
    const stroke = pathElem.getAttribute("stroke");
    if (stroke && stroke !== "none") {
      pathElem.setAttribute("stroke-width", String(MOLECULE_2D_BOND_STROKE_WIDTH));
    }
  });
}

const OCL_ATOM_CIRCLE_ID_SUFFIX_RE = /:Atom:(\d+)$/;

function oclAtomCentersFromSvgRoot(
  svgRoot: Element,
): Map<number, { x: number; y: number }> {
  const centers = new Map<number, { x: number; y: number }>();
  svgRoot.querySelectorAll("circle[id]").forEach((circleElem) => {
    const id = circleElem.getAttribute("id") ?? "";
    const match = OCL_ATOM_CIRCLE_ID_SUFFIX_RE.exec(id);
    if (match === null) {
      return;
    }
    const atom = Number.parseInt(match[1] ?? "", 10);
    const x = Number.parseFloat(circleElem.getAttribute("cx") ?? "");
    const y = Number.parseFloat(circleElem.getAttribute("cy") ?? "");
    if (!Number.isFinite(atom) || !Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }
    centers.set(atom, { x, y });
  });
  return centers;
}

/**
 * Injects visible dashed bond strokes for OpenChemLib metal-ligand (dative)
 * bonds. OCL `toSVG` emits only invisible hit-target lines for those bonds.
 *
 * @param svgRoot - Parsed OCL SVG root after CPK theming.
 * @param mol - Molecule whose bond types determine which segments are dative.
 * @param isDark - When true, use the dark-theme bond stroke color.
 */
export function applyDativeBondStrokesToSvgRoot(
  svgRoot: Element,
  mol: Molecule,
  isDark: boolean,
): void {
  const atomCenters = oclAtomCentersFromSvgRoot(svgRoot);
  if (atomCenters.size === 0) {
    return;
  }
  const stroke = bondStrokeHexForMoleculeSvgTheme(isDark);
  const document = svgRoot.ownerDocument;
  if (document === null) {
    return;
  }

  for (let bond = 0; bond < mol.getBonds(); bond += 1) {
    if (mol.getBondType(bond) !== MoleculeCtor.cBondTypeMetalLigand) {
      continue;
    }
    const atom0 = mol.getBondAtom(0, bond);
    const atom1 = mol.getBondAtom(1, bond);
    const center0 = atomCenters.get(atom0);
    const center1 = atomCenters.get(atom1);
    if (center0 === undefined || center1 === undefined) {
      continue;
    }

    const trimStart = dativeBondEndpointTrimPx(mol, atom0);
    const trimEnd = dativeBondEndpointTrimPx(mol, atom1);
    const trimmed = trimLineSegmentEnds(
      center0.x,
      center0.y,
      center1.x,
      center1.y,
      trimStart,
      trimEnd,
    );

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(trimmed.x0));
    line.setAttribute("y1", String(trimmed.y0));
    line.setAttribute("x2", String(trimmed.x1));
    line.setAttribute("y2", String(trimmed.y1));
    line.setAttribute("stroke", stroke);
    line.setAttribute("stroke-width", String(MOLECULE_2D_BOND_STROKE_WIDTH));
    line.setAttribute("stroke-dasharray", MOLECULE_2D_DATIVE_DASHARRAY);
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("pointer-events", "none");

    const insertAnchor = dativeBondStrokeInsertAnchor(svgRoot);
    if (insertAnchor !== null) {
      svgRoot.insertBefore(line, insertAnchor);
    } else {
      svgRoot.appendChild(line);
    }
  }
}
