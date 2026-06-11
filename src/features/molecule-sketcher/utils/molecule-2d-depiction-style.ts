/**
 * Shared 2D structure depiction constants and label helpers for the molecule
 * draw canvas and OpenChemLib SVG post-processing in the structure editor.
 *
 * Keeps bond stroke weight, atom label typography, implicit-hydrogen display
 * rules, and hit-target sizes aligned between custom SVG rendering and themed
 * OCL output.
 */

import type { Molecule } from "openchemlib";

import { cpkHexForElementSymbol } from "~/lib/molecule-svg-cpk-theme";
import { isAbbreviatedAlkylLabel } from "./alkyl-label-expand";

/** Visible bond stroke width in SVG user units (draw canvas and themed OCL lines). */
export const MOLECULE_2D_BOND_STROKE_WIDTH = 1.6;

/** Parallel offset between double/triple bond lines in screen pixels. */
export const MOLECULE_2D_MULTI_BOND_OFFSET_PX = 4.5;

/** Bond line cap for plain (non-dative) bonds on the draw canvas. */
export const MOLECULE_2D_BOND_LINE_CAP = "butt" as const;

/** Dashed dative bond pattern on the draw canvas. */
export const MOLECULE_2D_DATIVE_DASHARRAY = "5 4";

/** Atom label font size in SVG user units. */
export const MOLECULE_2D_ATOM_LABEL_FONT_SIZE = 13;

/** Subscript scale relative to {@link MOLECULE_2D_ATOM_LABEL_FONT_SIZE}. */
export const MOLECULE_2D_SUBSCRIPT_FONT_SCALE = 0.72;

/** Subscript baseline shift in em units (negative raises subscripts). */
export const MOLECULE_2D_SUBSCRIPT_BASELINE_SHIFT_EM = -0.28;

/** Atom label font weight. */
export const MOLECULE_2D_ATOM_LABEL_FONT_WEIGHT = 600;

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
