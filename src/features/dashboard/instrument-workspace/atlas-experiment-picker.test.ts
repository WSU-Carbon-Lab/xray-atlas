import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { atlasEntryFromBrowseGroup } from "./atlas-experiment-picker";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("atlasEntryFromBrowseGroup", () => {
  it("maps browse group metadata into a preview atlas entry", () => {
    const entry = atlasEntryFromBrowseGroup({
      experimentId: "exp-1",
      polarizationCount: 2,
      molecule: {
        id: "mol-1",
        displayName: "Test molecule",
        iupacname: "styrene",
        chemicalformula: "C8H8",
        imageurl: null,
        inchi: "",
        smiles: "",
        casNumber: null,
        pubChemCid: null,
        favoriteCount: 0,
      },
      edge: { targetatom: "C", corestate: "K" },
      instrument: { name: "STXM", facilityName: "ALS" },
    } as Parameters<typeof atlasEntryFromBrowseGroup>[0]);

    expect(entry.experimentId).toBe("exp-1");
    expect(entry.moleculeName).toEqual("Test molecule");
    expect(entry.edgeLabel).toEqual("C K");
    expect(entry.instrumentName).toEqual("STXM");
    expect(entry.facilityName).toEqual("ALS");
  });
});
