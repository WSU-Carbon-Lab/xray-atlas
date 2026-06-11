import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { Molecule } from "openchemlib";
import { attachAbbreviatedAlkylTail } from "./molecule-graph-editing";
import {
  buildStructureLookupComponents,
  normalizeComponentSmilesForPubchem,
  structureLookupComponentsFromSmiles,
} from "./structure-lookup-components";
import { smilesForStructureLookup } from "./polymer-export-smiles";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toContain: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
  not: { toBe: (expected: unknown) => void };
  length: number;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("normalizeComponentSmilesForPubchem", () => {
  it("strips polymer attachment tokens", () => {
    const normalized = normalizeComponentSmilesForPubchem("[<]CC(c1ccccc1)[>]");
    expect(normalized).toBe("CC(c1ccccc1)");
  });
});

describe("structureLookupComponentsFromSmiles", () => {
  it("normalizes bracketed repeat-unit SMILES into a searchable fragment", () => {
    const components = structureLookupComponentsFromSmiles("[<]CC(c1ccccc1)[>]");
    expect(components).toHaveLength(1);
    expect(components[0]?.smiles).toBe("CC(c1ccccc1)");
  });
});

describe("smilesForStructureLookup with alkyl abbreviations", () => {
  it("expands abbreviated alkyl tails before SMILES export", () => {
    const mol = Molecule.fromSmiles("c1ccsc1");
    mol.ensureHelperArrays(Molecule.cHelperRings);
    const sulfur = mol.getAtomCustomLabel(0);
    void sulfur;
    let attachAtom = -1;
    for (let a = 0; a < mol.getAtoms(); a += 1) {
      if (mol.getAtomicNo(a) === 16) {
        attachAtom = a;
        break;
      }
    }
    if (attachAtom < 0) {
      return;
    }
    attachAbbreviatedAlkylTail(mol, attachAtom, { carbonCount: 6 });
    const lookupSmiles = smilesForStructureLookup(mol);
    expect(lookupSmiles).toContain("CCCCCC");
    expect(lookupSmiles).not.toBe("Cc1ccsc1");
  });
});

describe("buildStructureLookupComponents", () => {
  it("includes full structure and repeat unit when bookends are set", () => {
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
    const components = buildStructureLookupComponents(mol, {
      open: {
        atomA: mol.getBondAtom(0, openBond),
        atomB: mol.getBondAtom(1, openBond),
      },
      close: {
        atomA: mol.getBondAtom(0, closeBond),
        atomB: mol.getBondAtom(1, closeBond),
      },
    });
    expect(components.length >= 2).toBe(true);
  });
});
