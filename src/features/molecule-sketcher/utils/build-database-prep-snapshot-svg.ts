import type { Molecule } from "openchemlib";

import { bondStrokeHexForMoleculeSvgTheme } from "~/lib/molecule-svg-cpk-theme";
import {
  applyMoleculeSvgTypography,
  moleculeSvgFontFamilyXmlAttribute,
} from "~/lib/molecule-svg-typography";
import type { CageDepictionMode } from "../molecule-draw-types";
import type { CageBondDepthTierByMark } from "./cage-template-placement";
import {
  buildBookendBracketSvgPaths,
  serializeBookendBracketSvgMarkup,
} from "./bookend-svg-overlay";
import { buildDrawCanvasOclDepiction } from "./molecule-2d-ocl-depiction";
import type { RemapBookendMarksInput } from "./remap-draw-bond-marks";

/** Inputs for {@link buildDatabasePrepSnapshotSvg}. */
export interface BuildDatabasePrepSnapshotSvgParams {
  /** Prepared molecule with preserved 2D coordinates; mutated only by OCL clone internally. */
  mol: Molecule;
  /** SVG width in user units. */
  width: number;
  /** SVG height in user units. */
  height: number;
  /** Unique id prefix for OCL element ids. */
  svgId: string;
  /** When true, apply the dark CPK palette. */
  isDark: boolean;
  /** Optional polymer repeat-unit bookends to overlay on the depiction. */
  bookends?: RemapBookendMarksInput;
  /** Cage depth-tier marks for muted rear-bond styling. */
  cageBondDepthTierByMark?: CageBondDepthTierByMark;
  /** Cage depiction mode; defaults to `2d`. */
  cageDepictionMode?: CageDepictionMode;
}

/**
 * Renders a full themed SVG document for registry upload using the same OCL
 * depiction path as the interactive draw canvas (preserves orientation and
 * alkyl abbreviations) and optional polymer bookend brackets.
 *
 * @param params - Molecule, dimensions, theme, and optional bookend marks.
 * @returns Serialized SVG document, or `null` when rendering fails.
 */
export function buildDatabasePrepSnapshotSvg(
  params: BuildDatabasePrepSnapshotSvgParams,
): string | null {
  const {
    mol,
    width,
    height,
    svgId,
    isDark,
    bookends,
    cageBondDepthTierByMark = {},
    cageDepictionMode = "2d",
  } = params;

  const depiction = buildDrawCanvasOclDepiction(
    mol,
    width,
    height,
    svgId,
    isDark,
    cageDepictionMode,
    cageBondDepthTierByMark,
  );
  if (depiction === null) {
    return null;
  }

  const bondStroke = bondStrokeHexForMoleculeSvgTheme(isDark);
  const bracketPaths = buildBookendBracketSvgPaths(
    mol,
    depiction,
    bookends?.open ?? null,
    bookends?.close ?? null,
  );
  const bracketMarkup = serializeBookendBracketSvgMarkup(bracketPaths, bondStroke);
  const { x, y, width: viewWidth, height: viewHeight } = depiction.viewBox;

  const fontFamilyAttr = moleculeSvgFontFamilyXmlAttribute();
  const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${viewWidth} ${viewHeight}" width="${width}" height="${height}" font-family="${fontFamilyAttr}"><g>${depiction.innerMarkup}</g>${bracketMarkup}</svg>`;
  return applyMoleculeSvgTypography(raw);
}
