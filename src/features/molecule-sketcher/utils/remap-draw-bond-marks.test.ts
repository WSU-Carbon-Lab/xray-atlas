import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { Molecule } from "openchemlib";

import {
  remapBookendMarksAfterMolEdit,
  remapDrawBondMarkAfterMolEdit,
} from "./remap-draw-bond-marks";

const expect = bunExpect as (value: unknown) => {
  toBe: (expected: unknown) => void;
  toBeNull: () => void;
  not: { toBeNull: () => void };
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe;
const it = bunIt;

describe("remapDrawBondMarkAfterMolEdit", () => {
  it("returns the same mark when coordinates are unchanged", () => {
    const mol = Molecule.fromSmiles("CCCO");
    const mark = { atomA: 0, atomB: 1 };
    expect(remapDrawBondMarkAfterMolEdit(mol, mol, mark)).toEqual(mark);
  });

  it("returns null when a bookend endpoint is removed", () => {
    const before = Molecule.fromSmiles("CC");
    const mark = { atomA: 0, atomB: 1 };
    const after = new Molecule(1, 0);
    after.setAtomX(0, before.getAtomX(0));
    after.setAtomY(0, before.getAtomY(0));
    after.setAtomZ(0, before.getAtomZ(0));
    expect(remapDrawBondMarkAfterMolEdit(before, after, mark)).toBeNull();
  });
});

describe("remapBookendMarksAfterMolEdit", () => {
  it("remaps open and close marks on unchanged molfile clones", () => {
    const mol = Molecule.fromSmiles("CCCC");
    const remapped = remapBookendMarksAfterMolEdit(mol, mol, {
      open: { atomA: 0, atomB: 1 },
      close: { atomA: 2, atomB: 3 },
    });
    expect(remapped.open).not.toBeNull();
    expect(remapped.close).not.toBeNull();
  });
});
