import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  applyPubChemResultToForm,
  promoteSynonymToPreferredName,
} from "./lookup-form-helpers";
import type { MoleculeUploadData } from "~/types/upload";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toContain: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const BASE_FORM: MoleculeUploadData = {
  iupacName: "",
  commonName: "",
  synonyms: [],
  inchi: "",
  smiles: "",
  chemicalFormula: "",
  casNumber: null,
  pubchemCid: null,
  tagIds: [],
  compoundKind: "small_molecule",
  registryStub: false,
};

describe("applyPubChemResultToForm", () => {
  it("preserves drawn SMILES when fillEmptyFieldsOnly is set", () => {
    const updater = applyPubChemResultToForm(
      {
        title: "Benzene",
        smiles: "c1ccccc1",
        chemicalFormula: "C6H6",
        pubChemCid: "241",
      },
      "benzene",
      { preserveDrawnSmiles: "C1=CC=CC=C1", fillEmptyFieldsOnly: true },
    );
    const next = updater({
      ...BASE_FORM,
      smiles: "C1=CC=CC=C1",
      commonName: "manual",
    });
    expect(next.smiles).toBe("C1=CC=CC=C1");
    expect(next.iupacName).toBe("Benzene");
    expect(next.commonName).toBe("manual");
  });

  it("round-trips canonical SMILES when not preserving drawn structure", () => {
    const updater = applyPubChemResultToForm(
      {
        title: "Benzene",
        smiles: "c1ccccc1",
        inchi: "InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H",
        chemicalFormula: "C6H6",
        pubChemCid: "241",
      },
      "benzene",
    );
    const next = updater(BASE_FORM);
    expect(next.smiles).toBe("c1ccccc1");
    expect(next.inchi).toContain("InChI=");
    expect(next.pubchemCid).toBe("241");
  });
});

describe("promoteSynonymToPreferredName", () => {
  it("moves prior preferred name into synonyms", () => {
    const result = promoteSynonymToPreferredName(
      "PhH",
      ["benzene", "PhH", "phenyl"],
      "Toluene",
    );
    expect(result.commonName).toBe("PhH");
    expect(result.synonyms).toContain("benzene");
    expect(result.synonyms).toContain("Toluene");
    expect(result.synonyms).toContain("phenyl");
    expect(result.synonyms.filter((s) => s.toLowerCase() === "phh")).toHaveLength(
      0,
    );
  });
});
