import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { validateChemistryConsistency } from "./chemistry-consistency";
import type { MoleculeUploadData } from "~/types/upload";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
  length: number;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const BASE: MoleculeUploadData = {
  iupacName: "Benzene",
  commonName: "Benzene",
  synonyms: [],
  inchi: "InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H",
  smiles: "c1ccccc1",
  chemicalFormula: "C6H6",
  casNumber: null,
  pubchemCid: "241",
  tagIds: [],
  compoundKind: "small_molecule",
  registryStub: false,
};

describe("validateChemistryConsistency", () => {
  it("passes when SMILES, InChI, and formula agree", () => {
    const result = validateChemistryConsistency(BASE);
    expect(result.ok).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("warns when formula diverges from SMILES", () => {
    const result = validateChemistryConsistency({
      ...BASE,
      chemicalFormula: "C7H8",
    });
    expect(result.ok).toBe(false);
    expect(result.warnings.length > 0).toBe(true);
  });
});
