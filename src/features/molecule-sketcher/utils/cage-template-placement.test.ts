import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";

import { CAGE_TEMPLATE_PRESETS } from "../molecule-draw-types";
import {
  buildCageTemplateLayout,
  cageBondDepthTierIndicesToMarks,
  cloneDrawCanvasMolecule,
  configureOclDepictionForCage,
  stripCageDepictionLabelsFromSvgMarkup,
} from "./cage-template-placement";
import { countVisibleOclBondLines } from "./molecule-2d-ocl-depiction";
import { ensureOclResourcesNode } from "./ocl-resources.node";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeGreaterThanOrEqual: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("cage-template-placement MVP", () => {
  ensureOclResourcesNode();

  it("2D orthographic snapshot keeps all bonds and assigns depth tiers", () => {
    const c60 = CAGE_TEMPLATE_PRESETS.find((preset) => preset.id === "c60")!;
    const layout = buildCageTemplateLayout(c60.smiles, "2d");
    expect("ok" in layout).toBe(false);
    if ("ok" in layout) {
      return;
    }
    expect(layout.bondDepthTierByIndex.size).toBe(90);
    const tiers = [...layout.bondDepthTierByIndex.values()];
    expect(tiers.includes("front")).toBe(true);
    expect(tiers.includes("back")).toBe(true);

    const depthMarks = cageBondDepthTierIndicesToMarks(
      layout.molecule,
      layout.bondDepthTierByIndex,
    );
    const clone = cloneDrawCanvasMolecule(layout.molecule);
    const svg = stripCageDepictionLabelsFromSvgMarkup(
      clone.toSVG(400, 400, "cage-2d-all-bonds", configureOclDepictionForCage(400, 400)),
    );
    expect(Object.keys(depthMarks).length).toBe(90);
    expect(countVisibleOclBondLines(svg)).toBeGreaterThanOrEqual(70);
  });
});
