import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { rankAtlasAutosuggestHits } from "./search-result-ranking";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("rankAtlasAutosuggestHits", () => {
  it("ranks exact name hits above synonym substring matches", () => {
    const ranked = rankAtlasAutosuggestHits(
      [
        {
          matchType: "synonym_fts",
          commonName: "P3HT derivative",
          iupacName: null,
        },
        {
          matchType: "name_exact",
          commonName: "P3HT",
          iupacName: "poly(3-hexylthiophene)",
        },
      ],
      "P3HT",
    );
    expect(ranked[0]?.matchType).toBe("name_exact");
  });
});
