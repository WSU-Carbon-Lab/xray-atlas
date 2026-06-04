import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  emptyFacetSelection,
  emptyNexafsCatalogFilters,
  readFacetParams,
  readNexafsCatalogFilterParams,
  writeFacetParams,
  writeNexafsCatalogFilterParams,
} from "./url-state";
import type { FacetSelection, NexafsCatalogFilters } from "./types";
import { ExperimentType } from "~/prisma/browser";
import {
  catalogFiltersFromVerificationChoice,
  verificationFilterChoiceFromCatalog,
} from "../nexafs-filter-options";

type Matchers = {
  toEqual: (expected: unknown) => void;
  toBe: (expected: unknown) => void;
  toContain: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => Matchers;

const UUID_A = "11111111-1111-1111-1111-111111111111";
const UUID_B = "22222222-2222-2222-2222-222222222222";
const UUID_C = "33333333-3333-3333-3333-333333333333";

describe("emptyFacetSelection", () => {
  it("returns all four fields as empty arrays", () => {
    const sel = emptyFacetSelection();
    expect(sel.edge).toEqual([]);
    expect(sel.mol).toEqual([]);
    expect(sel.instrument).toEqual([]);
    expect(sel.contributor).toEqual([]);
  });
});

describe("writeFacetParams", () => {
  it("sets comma-joined values for non-empty fields", () => {
    const sp = new URLSearchParams();
    const sel: FacetSelection = {
      edge: [UUID_A, UUID_B],
      mol: [UUID_C],
      instrument: [],
      contributor: [],
    };
    writeFacetParams(sp, sel);
    expect(sp.get("edge")).toBe(`${UUID_A},${UUID_B}`);
    expect(sp.get("mol")).toBe(UUID_C);
    expect(sp.has("instrument")).toBe(false);
    expect(sp.has("contributor")).toBe(false);
  });

  it("deletes existing keys when a field becomes empty", () => {
    const sp = new URLSearchParams("edge=abc&mol=def&instrument=ghi&contributor=jkl");
    writeFacetParams(sp, emptyFacetSelection());
    expect(sp.has("edge")).toBe(false);
    expect(sp.has("mol")).toBe(false);
    expect(sp.has("instrument")).toBe(false);
    expect(sp.has("contributor")).toBe(false);
  });

  it("overwrites a previously set key when the field shrinks to one value", () => {
    const sp = new URLSearchParams(`edge=${UUID_A},${UUID_B}`);
    writeFacetParams(sp, { ...emptyFacetSelection(), edge: [UUID_C] });
    expect(sp.get("edge")).toBe(UUID_C);
  });

  it("preserves non-facet keys already in URLSearchParams", () => {
    const sp = new URLSearchParams("q=benzene&sort=favorites");
    writeFacetParams(sp, { ...emptyFacetSelection(), edge: [UUID_A] });
    expect(sp.get("q")).toBe("benzene");
    expect(sp.get("sort")).toBe("favorites");
    expect(sp.get("edge")).toBe(UUID_A);
  });

  it("round-trips through readFacetParams", () => {
    const original: FacetSelection = {
      edge: [UUID_A, UUID_B],
      mol: [],
      instrument: [UUID_C],
      contributor: [],
    };
    const sp = new URLSearchParams();
    writeFacetParams(sp, original);
    const parsed = readFacetParams(sp);
    expect(parsed.edge).toEqual(original.edge);
    expect(parsed.mol).toEqual(original.mol);
    expect(parsed.instrument).toEqual(original.instrument);
    expect(parsed.contributor).toEqual(original.contributor);
  });
});

describe("readFacetParams", () => {
  it("parses multi-value comma-joined fields", () => {
    const sp = new URLSearchParams(`edge=${UUID_A},${UUID_B}`);
    const sel = readFacetParams(sp);
    expect(sel.edge).toEqual([UUID_A, UUID_B]);
  });

  it("returns empty arrays for all absent keys", () => {
    const sp = new URLSearchParams();
    const sel = readFacetParams(sp);
    expect(sel.edge).toEqual([]);
    expect(sel.mol).toEqual([]);
    expect(sel.instrument).toEqual([]);
    expect(sel.contributor).toEqual([]);
  });

  it("normalizes a legacy single-value key to a one-element array", () => {
    const sp = new URLSearchParams(`edge=${UUID_A}`);
    const sel = readFacetParams(sp);
    expect(sel.edge).toEqual([UUID_A]);
  });

  it("filters out empty string entries from malformed comma sequences", () => {
    const sp = new URLSearchParams(`edge=${UUID_A},,${UUID_B},`);
    const sel = readFacetParams(sp);
    expect(sel.edge).toEqual([UUID_A, UUID_B]);
  });

  it("parses all four fields simultaneously when all are present", () => {
    const sp = new URLSearchParams(
      `edge=${UUID_A}&mol=${UUID_B}&instrument=${UUID_C}&contributor=0000-0001-2345-6789`,
    );
    const sel = readFacetParams(sp);
    expect(sel.edge).toEqual([UUID_A]);
    expect(sel.mol).toEqual([UUID_B]);
    expect(sel.instrument).toEqual([UUID_C]);
    expect(sel.contributor).toEqual(["0000-0001-2345-6789"]);
  });

  it("ignores unrelated query parameters", () => {
    const sp = new URLSearchParams(`q=carbon&sort=favorites&edge=${UUID_A}`);
    const sel = readFacetParams(sp);
    expect(sel.edge).toEqual([UUID_A]);
    expect(sel.mol).toEqual([]);
  });
});

describe("readNexafsCatalogFilterParams / writeNexafsCatalogFilterParams", () => {
  it("round-trips acquisition and verification filters", () => {
    const original: NexafsCatalogFilters = {
      experimentType: ExperimentType.TOTAL_ELECTRON_YIELD,
      verifiedOnly: true,
      verificationSource: "publication",
    };
    const sp = new URLSearchParams();
    writeNexafsCatalogFilterParams(sp, original);
    expect(sp.get("experimentType")).toBe(ExperimentType.TOTAL_ELECTRON_YIELD);
    expect(sp.get("verified")).toBe("1");
    expect(sp.get("verificationSource")).toBe("publication");
    expect(readNexafsCatalogFilterParams(sp)).toEqual(original);
  });

  it("omits verificationSource when verified with either source", () => {
    const sp = new URLSearchParams();
    writeNexafsCatalogFilterParams(sp, {
      verifiedOnly: true,
      verificationSource: "either",
    });
    expect(sp.get("verified")).toBe("1");
    expect(sp.has("verificationSource")).toBe(false);
  });

  it("clears catalog keys when filters are empty", () => {
    const sp = new URLSearchParams(
      "experimentType=TRANSMISSION&verified=1&verificationSource=atlas",
    );
    writeNexafsCatalogFilterParams(sp, emptyNexafsCatalogFilters());
    expect(sp.has("experimentType")).toBe(false);
    expect(sp.has("verified")).toBe(false);
    expect(sp.has("verificationSource")).toBe(false);
  });

  it("treats verificationSource without verified as verified-only (legacy)", () => {
    const sp = new URLSearchParams("verificationSource=atlas");
    const filters = readNexafsCatalogFilterParams(sp);
    expect(filters.verifiedOnly).toBe(true);
    expect(filters.verificationSource).toBe("atlas");
  });

  it("maps verification chip any to cleared catalog filters", () => {
    expect(catalogFiltersFromVerificationChoice("any")).toEqual({
      verifiedOnly: false,
      verificationSource: "either",
    });
    expect(
      verificationFilterChoiceFromCatalog({
        verifiedOnly: false,
        verificationSource: "either",
      }),
    ).toBe("any");
  });

  it("maps verified tiers to verifiedOnly and verificationSource", () => {
    expect(catalogFiltersFromVerificationChoice("publication")).toEqual({
      verifiedOnly: true,
      verificationSource: "publication",
    });
    expect(
      verificationFilterChoiceFromCatalog({
        verifiedOnly: true,
        verificationSource: "atlas",
      }),
    ).toBe("atlas");
  });

  it("returns empty filters when params absent", () => {
    const filters = readNexafsCatalogFilterParams(new URLSearchParams());
    expect(filters).toEqual(emptyNexafsCatalogFilters());
  });
});
