import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  classifyAttributionSearchQuery,
  isAttributionSearchQueryReady,
} from "./attribution-researcher-search";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("classifyAttributionSearchQuery", () => {
  it("detects full ORCID iD and URL forms", () => {
    expect(classifyAttributionSearchQuery("0000-0002-6371-2123").mode).toBe(
      "full_orcid",
    );
    expect(
      classifyAttributionSearchQuery("https://orcid.org/0000-0002-6371-2123")
        .normalizedOrcid,
    ).toBe("0000-0002-6371-2123");
  });

  it("detects partial ORCID fragments", () => {
    expect(classifyAttributionSearchQuery("6371-2123").mode).toBe(
      "partial_orcid",
    );
  });

  it("treats names as text search", () => {
    expect(classifyAttributionSearchQuery("Obaid Alqahtani").mode).toBe("text");
  });
});

describe("isAttributionSearchQueryReady", () => {
  it("allows full ORCID immediately", () => {
    expect(
      isAttributionSearchQueryReady("full_orcid", "0000-0002-6371-2123"),
    ).toBe(true);
  });

  it("requires two characters for text", () => {
    expect(isAttributionSearchQueryReady("text", "O")).toBe(false);
    expect(isAttributionSearchQueryReady("text", "Ob")).toBe(true);
  });
});
