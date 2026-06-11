import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { Molecule } from "openchemlib";

import type { Molecule3dSession } from "./molecule-3d-depth-wireframe";
import { defaultView3d } from "./molecule-3d-depth-wireframe";
import {
  buildProjectedBonds,
  projectSessionAtoms,
  projectViewSpacePoint,
} from "./molecule-3d-projection";
import { snapshotConformerToFlatSvg } from "./snapshot-conformer-to-flat-svg";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeGreaterThan: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function syntheticSession(
  coords: [number, number, number][],
): Molecule3dSession {
  const mol = Molecule.fromSmiles(`C${"C".repeat(Math.max(0, coords.length - 1))}`);
  for (let i = 0; i < coords.length; i += 1) {
    const [x, y, z] = coords[i]!;
    mol.setAtomX(i, x);
    mol.setAtomY(i, y);
    mol.setAtomZ(i, z);
  }
  const n = mol.getAtoms();
  const centered = new Float64Array(n * 3);
  for (let i = 0; i < n; i += 1) {
    centered[i * 3] = mol.getAtomX(i);
    centered[i * 3 + 1] = mol.getAtomY(i);
    centered[i * 3 + 2] = mol.getAtomZ(i);
  }
  return {
    mol3d: mol,
    centered,
    centroid: [0, 0, 0],
    rPca: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  };
}

describe("molecule-3d-projection", () => {
  it("applies perspective divide so closer points project larger", () => {
    const camera = { focalLength: 400, zReferenceMax: 4 };
    const near = projectViewSpacePoint(2, 0, 4, camera);
    const far = projectViewSpacePoint(2, 0, 1, camera);
    expect(Math.abs(near.x)).toBeGreaterThan(Math.abs(far.x));
  });

  it("projects session atoms with distinct screen x for staggered coords", () => {
    const session = syntheticSession([
      [-1, 0, 0],
      [1, 0, 2],
    ]);
    const atoms = projectSessionAtoms(session, defaultView3d());
    expect(atoms.length).toBe(2);
    expect(atoms[0]!.x === atoms[1]!.x).toBe(false);
  });
});

describe("snapshotConformerToFlatSvg", () => {
  it("returns SVG and metadata for a synthetic session", () => {
    const session = syntheticSession([
      [0, 0, 0],
      [1.5, 0, 0],
      [3, 0, 0],
    ]);
    const molfile = session.mol3d.toMolfileV3();
    const bonds = buildProjectedBonds(session, defaultView3d());
    const result = snapshotConformerToFlatSvg(
      session,
      defaultView3d(),
      molfile,
      {
        width: 320,
        height: 240,
        svgId: "test-snap",
        isDark: false,
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.svg.includes("<svg")).toBe(true);
    expect(result.metadata.totalBondCount).toBe(bonds.length);
    expect(result.metadata.viewMatrix.length).toBe(9);
  });
});
