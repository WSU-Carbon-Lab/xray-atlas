import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  formatOrcidExpandedSearchDisplayName,
  parseOrcidExpandedSearchResponse,
} from "./orcidExpandedSearch";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = (value: unknown): ExpectAssertions =>
  bunExpect(value) as ExpectAssertions;

describe("formatOrcidExpandedSearchDisplayName", () => {
  it("prefers credit name when present", () => {
    expect(
      formatOrcidExpandedSearchDisplayName({
        "credit-name": "Obaid Alqahtani",
        "given-names": "Obaid",
        "family-names": "Alqahtani",
      }),
    ).toBe("Obaid Alqahtani");
  });

  it("joins given and family names", () => {
    expect(
      formatOrcidExpandedSearchDisplayName({
        "given-names": "Obaid",
        "family-names": "Alqahtani",
      }),
    ).toBe("Obaid Alqahtani");
  });
});

describe("parseOrcidExpandedSearchResponse", () => {
  it("returns validated ORCID hits with affiliation", () => {
    const hits = parseOrcidExpandedSearchResponse(
      {
        "expanded-result": [
          {
            "orcid-id": "0000-0002-3844-784X",
            "given-names": "Obaid",
            "family-names": "Alqahtani",
            "institution-name": ["Washington State University"],
          },
          {
            "orcid-id": "not-an-orcid",
            "given-names": "Bad",
            "family-names": "Row",
          },
        ],
      },
      10,
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]?.orcid).toBe("0000-0002-3844-784X");
    expect(hits[0]?.displayName).toBe("Obaid Alqahtani");
    expect(hits[0]?.affiliation).toBe("Washington State University");
  });
});
