import { Molecule } from "openchemlib";

import { buildDatabaseDepictionSvg } from "~/features/molecule-sketcher/utils/molecule-2d-ocl-depiction";
import {
  buildBookendBracketSvgPaths,
  serializeBookendBracketSvgMarkup,
} from "~/features/molecule-sketcher/utils/bookend-svg-overlay";
import { bondStrokeHexForMoleculeSvgTheme } from "~/lib/molecule-svg-cpk-theme";
import {
  applyMoleculeSvgTypography,
  moleculeSvgFontFamilyXmlAttribute,
} from "~/lib/molecule-svg-typography";
import { stabilizeLayout } from "~/features/molecule-sketcher/utils/molecule-graph-editing";
import type { RemapBookendMarksInput } from "~/features/molecule-sketcher/utils/remap-draw-bond-marks";
import { buildDrawCanvasOclDepiction } from "~/features/molecule-sketcher/utils/molecule-2d-ocl-depiction";

export const REGISTRY_DEPICTION_WIDTH = 280;
export const REGISTRY_DEPICTION_HEIGHT = 200;
export const REGISTRY_THUMBNAIL_SIZE = 96;

export type RegistryDepictionOptions = {
  width?: number;
  height?: number;
  isDark: boolean;
  svgId: string;
  bookends?: RemapBookendMarksInput;
};

/**
 * Builds a themed SVG string for registry previews and thumbnails from SMILES.
 *
 * Uses the same OCL database depiction path as contribute snapshots: auto-crop,
 * consistent bond stroke, and optional polymer bookend overlays.
 */
export function buildRegistryDepictionFromSmiles(
  smiles: string,
  options: RegistryDepictionOptions,
): string | null {
  const trimmed = smiles.trim();
  if (trimmed.length === 0) {
    return null;
  }
  try {
    const mol = Molecule.fromSmiles(trimmed);
    stabilizeLayout(mol);
    return buildRegistryDepictionFromMolecule(mol, options);
  } catch {
    return null;
  }
}

/**
 * Builds registry SVG from a parsed molecule with optional bookend brackets.
 */
export function buildRegistryDepictionFromMolecule(
  mol: Molecule,
  options: RegistryDepictionOptions,
): string | null {
  const width = options.width ?? REGISTRY_DEPICTION_WIDTH;
  const height = options.height ?? REGISTRY_DEPICTION_HEIGHT;
  const bookends = options.bookends;

  if (bookends?.open && bookends.close) {
    const depiction = buildDrawCanvasOclDepiction(
      mol,
      width,
      height,
      options.svgId,
      options.isDark,
    );
    if (depiction === null) {
      return null;
    }
    const bondStroke = bondStrokeHexForMoleculeSvgTheme(options.isDark);
    const bracketPaths = buildBookendBracketSvgPaths(
      mol,
      depiction,
      bookends.open,
      bookends.close,
    );
    const bracketMarkup = serializeBookendBracketSvgMarkup(
      bracketPaths,
      bondStroke,
    );
    const { x, y, width: viewWidth, height: viewHeight } = depiction.viewBox;
    const fontFamilyAttr = moleculeSvgFontFamilyXmlAttribute();
    const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${viewWidth} ${viewHeight}" width="${width}" height="${height}" font-family="${fontFamilyAttr}"><g>${depiction.innerMarkup}</g>${bracketMarkup}</svg>`;
    return applyMoleculeSvgTypography(raw);
  }

  return buildDatabaseDepictionSvg(
    mol,
    width,
    height,
    options.svgId,
    options.isDark,
  );
}
