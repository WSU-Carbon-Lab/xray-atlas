import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  assertValidCreateAttributions,
  ensureUploaderOwnerAttribution,
  normalizeAttributionInputs,
} from "./experimentAttributions";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toThrow: (fn: () => void) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const UPLOADER = "0000-0002-6371-2123";
const COLLECTOR = "0000-0001-2345-6789";

describe("normalizeAttributionInputs", () => {
  it("rejects legacy user UUID segments", () => {
    let threw = false;
    try {
      normalizeAttributionInputs([
        {
          orcid: "05f4c269-2d65-41f1-a8e1-db19fbb87e4b",
          role: "DataCollector",
        },
      ]);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it("deduplicates identical orcid and role pairs", () => {
    const rows = normalizeAttributionInputs([
      { orcid: COLLECTOR, role: "DataCollector" },
      { orcid: COLLECTOR, role: "DataCollector" },
    ]);
    expect(rows.length).toBe(1);
    expect(rows[0]?.orcid).toBe(COLLECTOR);
  });

  it("accepts legacy owner and collector slugs", () => {
    const rows = normalizeAttributionInputs([
      { orcid: UPLOADER, role: "owner" },
      { orcid: COLLECTOR, role: "collector" },
    ]);
    expect(rows.length).toBe(2);
    expect(rows[0]?.role).toBe("DataCurator");
    expect(rows[1]?.role).toBe("DataCollector");
  });

  it("allows same orcid with two DataCite contributor types", () => {
    const rows = normalizeAttributionInputs([
      { orcid: COLLECTOR, role: "DataCollector" },
      { orcid: COLLECTOR, role: "Researcher" },
    ]);
    expect(rows.length).toBe(2);
  });
});

describe("ensureUploaderOwnerAttribution", () => {
  it("prepends DataCurator row for the uploader when missing", () => {
    const rows = ensureUploaderOwnerAttribution(
      [{ orcid: COLLECTOR, role: "DataCollector" }],
      UPLOADER,
    );
    expect(rows[0]).toEqual({ orcid: UPLOADER, role: "DataCurator" });
  });
});

describe("assertValidCreateAttributions", () => {
  it("requires at least one DataCurator", () => {
    let threw = false;
    try {
      assertValidCreateAttributions([
        { orcid: COLLECTOR, role: "DataCollector" },
      ]);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});
