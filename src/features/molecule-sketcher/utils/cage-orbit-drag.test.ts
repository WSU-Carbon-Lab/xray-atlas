import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";

import { RING_TEMPLATE_PRESETS } from "../molecule-draw-types";
import {
  advanceCageOrbitView,
  calibrateCageOrbitPlaneScaleForMol,
  clampCageOrbitPitch,
  CAGE_ORBIT_PITCH_MAX,
  CAGE_ORBIT_PITCH_MIN,
  projectCageOrbitFastFrame,
} from "./cage-orbit-drag";
import {
  emptyDrawMolfile,
  parseDrawMolfile,
  placeRingTemplate,
} from "./molecule-graph-editing";
import {
  applyView3dAxisPreset,
  createMolecule3dSession,
  defaultView3d,
} from "./molecule-3d-depth-wireframe";
import { reapplyCageDepictionModeOnMolecule } from "./cage-template-placement";
import { ensureOclResourcesNode } from "./ocl-resources.node";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeCloseTo: (expected: number, precision?: number) => void;
  toBeGreaterThan: (expected: number) => void;
  toBeLessThan: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function bondEndpointSpan(frame: {
  bonds: Array<{ x0: number; y0: number; x1: number; y1: number }>;
}): number {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const bond of frame.bonds) {
    minX = Math.min(minX, bond.x0, bond.x1);
    maxX = Math.max(maxX, bond.x0, bond.x1);
    minY = Math.min(minY, bond.y0, bond.y1);
    maxY = Math.max(maxY, bond.y0, bond.y1);
  }
  return Math.max(maxX - minX, maxY - minY);
}

describe("cage-orbit-drag", () => {
  ensureOclResourcesNode();

  it("clampCageOrbitPitch limits pitch to the interactive range", () => {
    expect(clampCageOrbitPitch(CAGE_ORBIT_PITCH_MIN - 0.5)).toBe(CAGE_ORBIT_PITCH_MIN);
    expect(clampCageOrbitPitch(CAGE_ORBIT_PITCH_MAX + 0.5)).toBe(CAGE_ORBIT_PITCH_MAX);
    expect(clampCageOrbitPitch(0.2)).toBe(0.2);
  });

  it("advanceCageOrbitView applies yaw and clamps pitch", () => {
    const view = applyView3dAxisPreset(defaultView3d(), "face");
    const next = advanceCageOrbitView(view, 0.3, 2);
    expect(next.yaw).toBeCloseTo(view.yaw + 0.3);
    expect(next.pitch).toBe(CAGE_ORBIT_PITCH_MAX);
  });

  it("calibrated orbit drag keeps bond span stable for C60", () => {
    const c60 = RING_TEMPLATE_PRESETS.find((preset) => preset.id === "c60")!;
    const view = applyView3dAxisPreset(defaultView3d(), "face");
    const mol = parseDrawMolfile(emptyDrawMolfile());
    const placed = placeRingTemplate(mol, c60.smiles, { x: 0, y: 0 }, {
      templateCategory: "cage",
      cageDepictionMode: "2d",
      cageView3d: view,
    });
    const sessionResult = createMolecule3dSession(mol);
    expect(sessionResult.ok).toBe(true);
    if (!sessionResult.ok) {
      return;
    }
    const depthMarks = placed.cageBondDepthTierByMark ?? {};
    const to3d = reapplyCageDepictionModeOnMolecule(
      mol,
      "3d",
      depthMarks,
      view,
      sessionResult.session,
      { fixedPlaneScale: 1, touchCoordinates: false },
    );
    const planeScale = calibrateCageOrbitPlaneScaleForMol(
      mol,
      sessionResult.session,
      view,
      to3d.depthMarks,
      1,
    );
    expect(planeScale).toBeGreaterThan(1);
    const face = applyView3dAxisPreset(defaultView3d(), "face");
    const spans: number[] = [];
    for (const step of [
      { yaw: 0, pitch: 0 },
      { yaw: 0.4, pitch: 0.2 },
      { yaw: -0.55, pitch: 0.65 },
    ]) {
      const frame = projectCageOrbitFastFrame({
        mol,
        session: sessionResult.session,
        view: { ...face, yaw: step.yaw, pitch: step.pitch },
        depthMarks: to3d.depthMarks,
        planeScale,
      });
      spans.push(bondEndpointSpan(frame));
      expect(frame.bonds.length).toBe(90);
    }
    expect(Math.max(...spans) / Math.min(...spans)).toBeLessThan(1.1);
  });
});
