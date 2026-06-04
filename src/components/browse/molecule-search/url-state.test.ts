import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  emptyMoleculeFacetSelection,
  readMoleculeFacetParams,
  writeMoleculeFacetParams,
  moleculeFacetSelectionToBrowseFilters,
} from "./url-state";

type Matchers = {
  toEqual: (expected: unknown) => void;
  toBe: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => Matchers;

const TAG_A = "11111111-1111-1111-1111-111111111111";
const TAG_B = "22222222-2222-2222-2222-222222222222";

describe("emptyMoleculeFacetSelection", () => {
  it("returns all fields cleared", () => {
    const sel = emptyMoleculeFacetSelection();
    expect(sel.tagIds).toEqual([]);
    expect(sel.hasExperimentData).toBe(false);
    expect(sel.hasCas).toBe(false);
    expect(sel.hasPubchem).toBe(false);
  });
});

describe("writeMoleculeFacetParams", () => {
  it("serializes tags and boolean facets", () => {
    const sp = new URLSearchParams();
    writeMoleculeFacetParams(sp, {
      tagIds: [TAG_B, TAG_A],
      hasExperimentData: true,
      hasCas: true,
      hasPubchem: false,
    });
    expect(sp.get("tags")).toBe(`${TAG_A},${TAG_B}`);
    expect(sp.get("hasData")).toBe("1");
    expect(sp.get("hasCas")).toBe("1");
    expect(sp.has("hasPubchem")).toBe(false);
  });

  it("preserves unrelated query keys", () => {
    const sp = new URLSearchParams("q=benzene&page=2");
    writeMoleculeFacetParams(sp, {
      tagIds: [TAG_A],
      hasExperimentData: false,
      hasCas: false,
      hasPubchem: false,
    });
    expect(sp.get("q")).toBe("benzene");
    expect(sp.get("page")).toBe("2");
  });

  it("round-trips through readMoleculeFacetParams", () => {
    const original = {
      tagIds: [TAG_A, TAG_B],
      hasExperimentData: true,
      hasCas: false,
      hasPubchem: true,
    };
    const sp = new URLSearchParams();
    writeMoleculeFacetParams(sp, original);
    expect(readMoleculeFacetParams(sp)).toEqual(original);
  });
});

describe("readMoleculeFacetParams", () => {
  it("accepts legacy true string for booleans", () => {
    const sp = new URLSearchParams("hasData=true&hasPubchem=1");
    const sel = readMoleculeFacetParams(sp);
    expect(sel.hasExperimentData).toBe(true);
    expect(sel.hasPubchem).toBe(true);
  });
});

describe("moleculeFacetSelectionToBrowseFilters", () => {
  it("omits false boolean facets from API payload", () => {
    const payload = moleculeFacetSelectionToBrowseFilters({
      tagIds: [TAG_A],
      hasExperimentData: true,
      hasCas: false,
      hasPubchem: false,
    });
    expect(payload.tagIds).toEqual([TAG_A]);
    expect(payload.hasExperimentData).toBe(true);
    expect(payload.hasCas).toBe(undefined);
  });
});
