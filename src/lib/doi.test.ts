import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  classifyPublicationLookupQuery,
  isCanonicalDoiShape,
  isPublicationLookupQueryReady,
  normalizeDoi,
} from "./doi";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("normalizeDoi", () => {
  it("strips doi.org prefix and lowercases", () => {
    expect(
      normalizeDoi("https://doi.org/10.1038/nphys1234"),
    ).toBe("10.1038/nphys1234");
  });

  it("returns null for empty input", () => {
    expect(normalizeDoi("   ")).toBe(null);
  });
});

describe("isCanonicalDoiShape", () => {
  it("accepts standard registry DOI bodies", () => {
    expect(isCanonicalDoiShape("10.1021/acs.chemmater.9b00001")).toBe(true);
  });

  it("rejects bare text", () => {
    expect(isCanonicalDoiShape("polymer nexafs review")).toBe(false);
  });
});

describe("classifyPublicationLookupQuery", () => {
  it("classifies DOI-shaped input", () => {
    expect(
      classifyPublicationLookupQuery("10.1038/s41586-020-1234-5"),
    ).toEqual({
      mode: "doi",
      normalizedDoi: "10.1038/s41586-020-1234-5",
    });
  });

  it("classifies title-like input as text", () => {
    expect(classifyPublicationLookupQuery("NEXAFS of P3HT")).toEqual({
      mode: "text",
      normalizedDoi: null,
    });
  });
});

describe("isPublicationLookupQueryReady", () => {
  it("requires three characters for text search", () => {
    expect(isPublicationLookupQueryReady("text", "ab")).toBe(false);
    expect(isPublicationLookupQueryReady("text", "abc")).toBe(true);
  });
});
