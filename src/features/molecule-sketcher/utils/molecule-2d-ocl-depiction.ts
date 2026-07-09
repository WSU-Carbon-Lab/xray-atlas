/**
 * OpenChemLib `toSVG` depiction for the interactive molecule draw canvas.
 *
 * Generates themed SVG markup aligned with the structure editor and ring
 * template thumbnails, and derives a view transform from OCL atom hit circles so
 * pointer hit-testing matches the rendered bond geometry.
 */

import type { Molecule } from "openchemlib";

import { applyMoleculeSvgCpkThemeToElement } from "~/lib/molecule-svg-cpk-theme";
import { applyMoleculeSvg3dBondDepthTiers, type BondDepthTier } from "~/lib/molecule-svg-3d-perspective";
import type { CageDepictionMode } from "../molecule-draw-types";
import type { CageBondDepthTierByMark } from "./cage-template-placement";
import {
  cageBondDepthTierMapFromMarks,
  cloneDrawCanvasMolecule,
  configureOclDepictionForCage,
  resolveCageDepictionOptions,
  stripCageDepictionLabelsFromSvgRoot,
} from "./cage-template-placement";
import { DEFAULT_OCL_DEPICTION_TO_SVG_OPTIONS } from "./molecule-3d-depth-wireframe";
import {
  applyDativeBondStrokesToSvgRoot,
  applyMolecule2dBondStrokeWidthToSvgRoot,
  MOLECULE_2D_FIT_PADDING_PX,
} from "./molecule-2d-depiction-style";
import type { DrawPoint, DrawViewTransform } from "./molecule-draw-geometry";
import { standardizeDepictionStereo } from "./molfile-depiction-standardize";

/** Cropped viewport OpenChemLib uses for auto-fit `toSVG` output. */
export interface OclSvgViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Atom hit circle parsed from OpenChemLib `toSVG` markup. */
export interface OclAtomCircle {
  /** Circle center in OCL depiction viewBox user units. */
  center: DrawPoint;
  /** Circle radius in the same user units (typically 8). */
  radius: number;
}

/** Result of building an OCL-backed draw-canvas depiction. */
export interface DrawCanvasOclDepiction {
  /** Serialized children of the OCL SVG root for embedding under the canvas `<svg>`. */
  innerMarkup: string;
  /** View transform matching OCL atom circle positions (`flipY: false`). */
  transform: DrawViewTransform;
  /** View box from the OCL SVG root; set on the canvas so depiction and overlays share user units. */
  viewBox: OclSvgViewBox;
  /** Atom centers and radii from OCL `:Atom:N` hit circles keyed by atom index. */
  atomCircles: ReadonlyMap<number, OclAtomCircle>;
}

function readSvgTagAttribute(tag: string, name: string): string | null {
  const pattern = new RegExp(`\\b${name}="([^"]+)"`);
  const match = pattern.exec(tag);
  return match?.[1] ?? null;
}

const OCL_ATOM_CIRCLE_TAG_RE = /<circle\b[^>]*\bid="[^"]+:Atom:(\d+)"[^>]*\/?>/gi;

/**
 * Parses the `viewBox` attribute from an OpenChemLib `toSVG` string.
 *
 * @param svgText - Raw SVG from `Molecule.toSVG`.
 * @returns Parsed view box components, or `null` when the attribute is missing or invalid.
 */
export function parseOclSvgViewBox(svgText: string): OclSvgViewBox | null {
  const viewBoxPattern = /viewBox="([^"]+)"/;
  const match = viewBoxPattern.exec(svgText);
  if (match === null) {
    return null;
  }
  const parts = (match[1] ?? "").trim().split(/\s+/).map((value) => Number.parseFloat(value));
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) {
    return null;
  }
  const x = parts[0]!;
  const y = parts[1]!;
  const width = parts[2]!;
  const height = parts[3]!;
  if (width <= 0 || height <= 0) {
    return null;
  }
  return { x, y, width, height };
}

/**
 * Parses OCL SVG `:Atom:N` hit circles regardless of attribute ordering.
 *
 * @param svgText - Raw or themed SVG string from OpenChemLib `toSVG`.
 * @returns Atom index to circle center and radius in depiction viewBox units.
 */
export function parseOclAtomCircles(svgText: string): Map<number, OclAtomCircle> {
  const circles = new Map<number, OclAtomCircle>();
  for (const match of svgText.matchAll(OCL_ATOM_CIRCLE_TAG_RE)) {
    const tag = match[0] ?? "";
    const atom = Number.parseInt(match[1] ?? "", 10);
    const cx = Number.parseFloat(readSvgTagAttribute(tag, "cx") ?? "");
    const cy = Number.parseFloat(readSvgTagAttribute(tag, "cy") ?? "");
    const radiusRaw = readSvgTagAttribute(tag, "r");
    const radius =
      radiusRaw === null ? 8 : Number.parseFloat(radiusRaw);
    if (
      !Number.isFinite(atom) ||
      !Number.isFinite(cx) ||
      !Number.isFinite(cy) ||
      !Number.isFinite(radius)
    ) {
      continue;
    }
    circles.set(atom, { center: { x: cx, y: cy }, radius });
  }
  return circles;
}

/**
 * Parses OCL SVG atom hit-circle centers and fits a uniform scale plus offset
 * that maps molecule coordinates into the same pixel space as `toSVG` output.
 *
 * @param mol - Molecule whose atom indices match the SVG id suffixes.
 * @param svgText - Raw or themed SVG string from OpenChemLib `toSVG`.
 * @returns An OCL-aligned transform, or `null` when no atom circles are present.
 */
export function parseOclDepictionViewTransform(
  mol: Molecule,
  svgText: string,
): DrawViewTransform | null {
  const oclByAtom = new Map<number, DrawPoint>();
  for (const [atom, circle] of parseOclAtomCircles(svgText)) {
    oclByAtom.set(atom, circle.center);
  }
  if (oclByAtom.size === 0) {
    return null;
  }

  let scaleSum = 0;
  let scaleCount = 0;
  const atomCount = mol.getAllAtoms();
  for (let a = 0; a < atomCount; a += 1) {
    const oclA = oclByAtom.get(a);
    if (oclA === undefined) {
      continue;
    }
    for (let b = a + 1; b < atomCount; b += 1) {
      const oclB = oclByAtom.get(b);
      if (oclB === undefined) {
        continue;
      }
      const molDx = mol.getAtomX(b) - mol.getAtomX(a);
      const molDy = mol.getAtomY(b) - mol.getAtomY(a);
      const molDist = Math.hypot(molDx, molDy);
      if (molDist <= 1e-9) {
        continue;
      }
      const oclDist = Math.hypot(oclB.x - oclA.x, oclB.y - oclA.y);
      scaleSum += oclDist / molDist;
      scaleCount += 1;
    }
  }
  if (scaleCount === 0) {
    return null;
  }

  const scale = scaleSum / scaleCount;
  let anchorAtom = 0;
  for (let a = 0; a < atomCount; a += 1) {
    if (oclByAtom.has(a)) {
      anchorAtom = a;
      break;
    }
  }
  const anchorOcl = oclByAtom.get(anchorAtom);
  if (anchorOcl === undefined) {
    return null;
  }
  return {
    scale,
    offsetX: anchorOcl.x - scale * mol.getAtomX(anchorAtom),
    offsetY: anchorOcl.y - scale * mol.getAtomY(anchorAtom),
    flipY: false,
  };
}

/**
 * Builds themed OpenChemLib SVG for the draw canvas and the view transform that
 * maps molecule coordinates into the same pixel space as the rendered structure.
 *
 * @param mol - Live editor molecule; cloned before stereo standardization.
 * @param width - Canvas width in CSS pixels.
 * @param height - Canvas height in CSS pixels.
 * @param svgId - Unique id prefix for OCL SVG element ids.
 * @param isDark - When true, apply the dark CPK palette.
 * @param cageDepictionMode - Cage view mode; both modes apply depth-tier rear styling.
 * @param cageBondDepthTierByMark - Stored cage depth-tier marks from placement or mode switch.
 * @returns Depiction payload, or `null` when the molecule is empty or parsing fails.
 */
export function buildDrawCanvasOclDepiction(
  mol: Molecule,
  width: number,
  height: number,
  svgId: string,
  isDark: boolean,
  cageDepictionMode: CageDepictionMode = "2d",
  cageBondDepthTierByMark: CageBondDepthTierByMark = {},
): DrawCanvasOclDepiction | null {
  if (mol.getAllAtoms() === 0) {
    return null;
  }

  void cageDepictionMode;
  const resolved = resolveCageDepictionOptions(cageBondDepthTierByMark);
  const hasCageDepth = Object.keys(resolved.depthMarks).length > 0;
  const clone = cloneDrawCanvasMolecule(mol);
  standardizeDepictionStereo(clone);

  const cageOclOptions = hasCageDepth
    ? configureOclDepictionForCage(width, height)
    : {
        ...DEFAULT_OCL_DEPICTION_TO_SVG_OPTIONS,
        autoCrop: true,
        autoCropMargin: MOLECULE_2D_FIT_PADDING_PX,
      };

  let rawSvg = clone.toSVG(width, height, svgId, cageOclOptions);

  const depthTierMap =
    Object.keys(resolved.depthMarks).length > 0
      ? cageBondDepthTierMapFromMarks(clone, resolved.depthMarks)
      : new Map<number, BondDepthTier>();
  if (depthTierMap.size > 0) {
    rawSvg = applyMoleculeSvg3dBondDepthTiers(rawSvg, clone, depthTierMap, isDark);
  }

  const transform = parseOclDepictionViewTransform(clone, rawSvg);
  const viewBox = parseOclSvgViewBox(rawSvg);
  if (transform === null || viewBox === null) {
    return null;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawSvg, "image/svg+xml");
  if (doc.querySelector("parsererror") !== null) {
    return null;
  }
  const svgRoot = doc.documentElement;
  svgRoot.setAttribute("style", "pointer-events: none;");
  svgRoot.querySelectorAll("style").forEach((styleEl) => {
    const raw = styleEl.textContent ?? "";
    styleEl.textContent = raw.replace(
      /pointer-events\s*:\s*all/gi,
      "pointer-events: none",
    );
  });
  svgRoot.querySelectorAll(".event").forEach((el) => {
    el.classList.remove("event");
  });
  applyMoleculeSvgCpkThemeToElement(svgRoot, isDark);
  applyMolecule2dBondStrokeWidthToSvgRoot(svgRoot);
  applyDativeBondStrokesToSvgRoot(svgRoot, clone, isDark);
  if (hasCageDepth) {
    stripCageDepictionLabelsFromSvgRoot(svgRoot);
  }

  const innerMarkup = [...svgRoot.childNodes]
    .map((node) => new XMLSerializer().serializeToString(node))
    .join("");

  const atomCircles = parseOclAtomCircles(rawSvg);

  return { innerMarkup, transform, viewBox, atomCircles };
}

/**
 * Builds an SVG `matrix(...)` transform that maps live OpenChemLib depiction
 * coordinates into a frozen orbit-drag viewport so auto-crop rescaling does not
 * stack nested structures during cage globe drags.
 *
 * @param frozen - View transform captured at orbit drag pointerdown.
 * @param live - Transform parsed from the current live `toSVG` output.
 * @returns SVG transform attribute value for wrapping live inner markup.
 */
export function oclDepictionOrbitCompensationTransform(
  frozen: DrawViewTransform,
  live: DrawViewTransform,
): string {
  const ratio = frozen.scale / live.scale;
  const tx = frozen.offsetX - ratio * live.offsetX;
  const ty = frozen.offsetY - ratio * live.offsetY;
  return `matrix(${ratio},0,0,${ratio},${tx},${ty})`;
}

/**
 * Builds a full themed SVG document suitable for `molecules.imageurl` storage,
 * using the same OpenChemLib options and CPK palette as the draw canvas and
 * `MoleculeImageSVG`.
 *
 * @param mol - Structure to depict; cloned before stereo standardization.
 * @param width - SVG width in user units.
 * @param height - SVG height in user units.
 * @param svgId - Unique id prefix for OCL element ids.
 * @param isDark - When true, apply the dark CPK palette.
 * @param cageBondDepthTierByMark - Cage depth-tier marks for muted rear-bond styling.
 * @returns Serialized SVG document, or `null` when the molecule is empty or rendering fails.
 */
export function buildDatabaseDepictionSvg(
  mol: Molecule,
  width: number,
  height: number,
  svgId: string,
  isDark: boolean,
  cageBondDepthTierByMark: CageBondDepthTierByMark = {},
): string | null {
  if (mol.getAllAtoms() === 0) {
    return null;
  }

  const resolved = resolveCageDepictionOptions(cageBondDepthTierByMark);
  const hasCageDepth = Object.keys(resolved.depthMarks).length > 0;
  const clone = cloneDrawCanvasMolecule(mol);
  standardizeDepictionStereo(clone);

  const cageOclOptions = hasCageDepth
    ? configureOclDepictionForCage(width, height)
    : {
        ...DEFAULT_OCL_DEPICTION_TO_SVG_OPTIONS,
        autoCrop: true,
        autoCropMargin: MOLECULE_2D_FIT_PADDING_PX,
      };

  let rawSvg: string;
  try {
    rawSvg = clone.toSVG(width, height, svgId, cageOclOptions);
  } catch {
    return null;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawSvg, "image/svg+xml");
  if (doc.querySelector("parsererror") !== null) {
    return null;
  }
  const svgRoot = doc.documentElement;
  applyMoleculeSvgCpkThemeToElement(svgRoot, isDark);
  applyMolecule2dBondStrokeWidthToSvgRoot(svgRoot);
  applyDativeBondStrokesToSvgRoot(svgRoot, clone, isDark);
  if (hasCageDepth) {
    stripCageDepictionLabelsFromSvgRoot(svgRoot);
  }
  return new XMLSerializer().serializeToString(svgRoot);
}

/**
 * Counts visible bond line primitives in an OCL SVG string (each double bond
 * contributes two lines). Useful for regression checks against template thumbnails.
 *
 * @param svgText - SVG markup from OpenChemLib `toSVG`.
 * @returns Number of `<line>` elements whose stroke is visible.
 */
export function countVisibleOclBondLines(svgText: string): number {
  let count = 0;
  const lineRe =
    /<line\b[^>]*\bx1="[^"]+"\s+y1="[^"]+"\s+x2="[^"]+"\s+y2="[^"]+"[^>]*\/?>/g;
  for (const match of svgText.matchAll(lineRe)) {
    const tag = match[0] ?? "";
    if (/stroke="none"/i.test(tag)) {
      continue;
    }
    if (/opacity="0"/i.test(tag)) {
      continue;
    }
    count += 1;
  }
  return count;
}

/**
 * Counts `<text>` elements in an OpenChemLib SVG string.
 *
 * @param svgText - SVG markup from OpenChemLib `toSVG`.
 * @returns Number of text label nodes (zero for label-free cage wireframes).
 */
export function countOclSvgTextElements(svgText: string): number {
  return [...svgText.matchAll(/<text\b/gi)].length;
}
