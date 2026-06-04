import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  moleculeOverflowSynonyms,
  moleculeSynonymMatchesReference,
} from "./molecule-synonym-overflow";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("moleculeSynonymMatchesReference", () => {
  it("matches case-insensitively", () => {
    expect(moleculeSynonymMatchesReference("Y11", "y11")).toBe(true);
  });

  it("matches slug-equivalent labels", () => {
    expect(moleculeSynonymMatchesReference("Test Name", "test-name")).toBe(true);
  });
});

describe("moleculeOverflowSynonyms", () => {
  it("returns empty when only synonym equals primary", () => {
    expect(
      moleculeOverflowSynonyms(["Y11"], { primaryName: "Y11" }),
    ).toEqual([]);
  });

  it("keeps additional names after primary", () => {
    expect(
      moleculeOverflowSynonyms(["Y11", "Alias A", "alias a"], {
        primaryName: "Y11",
      }),
    ).toEqual(["Alias A"]);
  });

  it("excludes names already shown as chips", () => {
    expect(
      moleculeOverflowSynonyms(["Y11", "Beta", "Gamma"], {
        primaryName: "Y11",
        excludeNames: ["Beta"],
      }),
    ).toEqual(["Gamma"]);
  });
});
