import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { Molecule } from "openchemlib";
import { smilesForRegistryExport } from "./polymer-export-smiles";
import { canonicalSmilesOf } from "./molecule-graph-editing";

type ExpectAssertions = {
  toContain: (expected: unknown) => void;
  not: { toContain: (expected: unknown) => void };
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("smilesForRegistryExport", () => {
  it("returns repeat-unit SMILES with attachment descriptors when bookends are set", () => {
    const mol = Molecule.fromSmiles("CC(c1ccccc1)CC");
    mol.ensureHelperArrays(Molecule.cHelperRings);
    let openBond = -1;
    let closeBond = -1;
    for (let b = 0; b < mol.getBonds(); b += 1) {
      if (mol.isRingBond(b)) {
        continue;
      }
      if (openBond < 0) {
        openBond = b;
        continue;
      }
      closeBond = b;
      break;
    }
    if (openBond < 0 || closeBond < 0) {
      return;
    }
    const openMark = {
      atomA: mol.getBondAtom(0, openBond),
      atomB: mol.getBondAtom(1, openBond),
    };
    const closeMark = {
      atomA: mol.getBondAtom(0, closeBond),
      atomB: mol.getBondAtom(1, closeBond),
    };
    const exported = smilesForRegistryExport(mol, {
      open: openMark,
      close: closeMark,
    });
    expect(exported).toContain("[<]");
    expect(exported).toContain("[>]");
    const full = canonicalSmilesOf(mol);
    expect(full).not.toContain("[<]");
  });
});
