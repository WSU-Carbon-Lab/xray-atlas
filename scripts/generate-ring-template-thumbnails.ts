import { writeFileSync } from "node:fs";
import { Molecule } from "openchemlib";

import {
  buildCageTemplateLayout,
  cageBondDepthTierIndicesToMarks,
  cloneDrawCanvasMolecule,
  configureOclDepictionForCage,
  stripCageDepictionLabelsFromSvgMarkup,
} from "../src/features/molecule-sketcher/utils/cage-template-placement";
import { cageBondDepthTierMapFromMarks } from "../src/features/molecule-sketcher/utils/cage-template-placement";
import { ensureOclResourcesNode } from "../src/features/molecule-sketcher/utils/ocl-resources.node";
import { RING_TEMPLATE_PRESETS } from "../src/features/molecule-sketcher/molecule-draw-types";
import { applyMoleculeSvg3dBondDepthTiers } from "../src/lib/molecule-svg-3d-perspective";
import { applyMoleculeSvgTypography } from "../src/lib/molecule-svg-typography";

ensureOclResourcesNode();

function normalizeRingTemplateThumbnailSvg(raw: string, stripLabels: boolean): string {
  let normalized = raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, "")
    .replace(/\sid="[^"]+"/g, "")
    .replace(/width="40px"/g, 'width="100%"')
    .replace(/height="40px"/g, 'height="100%"')
    .replace(/stroke="rgb\(0,0,0\)"/g, 'stroke="currentColor"')
    .replace(/fill="rgb\(0,0,0\)"/g, 'fill="currentColor"')
    .replace(/fill="rgb\(48,80,248\)"/g, 'fill="currentColor" class="ring-thumb-hetero ring-thumb-hetero-n"')
    .replace(/fill="rgb\(255,13,13\)"/g, 'fill="currentColor" class="ring-thumb-hetero ring-thumb-hetero-o"')
    .replace(/fill="rgb\(205,205,38\)"/g, 'fill="currentColor" class="ring-thumb-hetero ring-thumb-hetero-s"')
    .replace(/<line class="event"[^/]*\/>\n/g, "")
    .replace(/<circle class="event"[^/]*\/>\n/g, "")
    .replace(/\n\s+<\/svg>/g, "\n</svg>")
    .trim();
  if (stripLabels) {
    normalized = stripCageDepictionLabelsFromSvgMarkup(normalized);
  }
  return applyMoleculeSvgTypography(normalized);
}

const entries: Record<string, string> = {};

for (const preset of RING_TEMPLATE_PRESETS) {
  let mol: Molecule;
  const isCage = preset.category === "cage";
  if (isCage) {
    const layout = buildCageTemplateLayout(preset.smiles);
    if ("ok" in layout) {
      throw new Error(`Cage thumbnail failed for ${preset.id}: ${layout.message}`);
    }
    mol = cloneDrawCanvasMolecule(layout.molecule);
    const depthMarks = cageBondDepthTierIndicesToMarks(
      layout.molecule,
      layout.bondDepthTierByIndex,
    );
    const depthTierMap = cageBondDepthTierMapFromMarks(mol, depthMarks);
    const thumbSize = 40;
    let rawSvg = mol.toSVG(
      thumbSize,
      thumbSize,
      `ring-thumb-${preset.id}`,
      configureOclDepictionForCage(thumbSize, thumbSize),
    );
    if (depthTierMap.size > 0) {
      rawSvg = applyMoleculeSvg3dBondDepthTiers(rawSvg, mol, depthTierMap, false);
    }
    entries[preset.id] = normalizeRingTemplateThumbnailSvg(rawSvg, true);
    continue;
  }
  mol = Molecule.fromSmiles(preset.smiles);
  mol.inventCoordinates();
  const thumbSize = 40;
  entries[preset.id] = normalizeRingTemplateThumbnailSvg(
    mol.toSVG(
      thumbSize,
      thumbSize,
      `ring-thumb-${preset.id}`,
      { autoCrop: true, autoCropMargin: 4, noImplicitHydrogen: true },
    ),
    false,
  );
}

const lines = [
  "/**",
  " * Pre-baked OpenChemLib SVG thumbnails for ring template menu items.",
  " * Regenerate with `bun scripts/generate-ring-template-thumbnails.ts` after",
  " * changing template SMILES or cage projection behavior.",
  " */",
  "",
  "export const RING_TEMPLATE_THUMBNAIL_SVG: Readonly<Record<string, string>> = {",
  ...Object.entries(entries).map(
    ([id, svg]) => `  "${id}": ${JSON.stringify(svg)},`,
  ),
  "};",
  "",
];

writeFileSync(
  "src/features/molecule-sketcher/utils/ring-template-thumbnails.ts",
  lines.join("\n"),
);
console.log("Wrote ring-template-thumbnails.ts");
