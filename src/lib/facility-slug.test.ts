import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  canonicalFacilitySlugFromName,
  canonicalFacilitySlugFromView,
  matchFacilitiesBySlug,
  resolveFacilitySlugAlias,
  slugifyFacilityName,
} from "./facility-slug";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("facility slug helpers", () => {
  it("slugifyFacilityName normalizes ALS and NSLS-II names", () => {
    expect(slugifyFacilityName("Advanced Light Source")).toBe(
      "advanced-light-source",
    );
    expect(slugifyFacilityName("National Synchrotron Light Source II")).toBe(
      "national-synchrotron-light-source-ii",
    );
  });

  it("canonicalFacilitySlugFromView matches canonicalFacilitySlugFromName", () => {
    expect(
      canonicalFacilitySlugFromView({ name: "Advanced Light Source" }),
    ).toBe(canonicalFacilitySlugFromName("Advanced Light Source"));
  });

  it("resolveFacilitySlugAlias maps acronym paths to canonical slugs", () => {
    expect(resolveFacilitySlugAlias("als")).toBe("advanced-light-source");
    expect(resolveFacilitySlugAlias("ALS")).toBe("advanced-light-source");
    expect(resolveFacilitySlugAlias("nslsii")).toBe(
      "national-synchrotron-light-source-ii",
    );
    expect(resolveFacilitySlugAlias("NSLSII")).toBe(
      "national-synchrotron-light-source-ii",
    );
    expect(resolveFacilitySlugAlias("ansto")).toBe("the-australian-synchrotron");
    expect(resolveFacilitySlugAlias("unknown-acronym")).toBe(null);
    expect(resolveFacilitySlugAlias("advanced-light-source")).toBe(null);
  });

  it("matchFacilitiesBySlug resolves acronym aliases before slugify matching", () => {
    const facilities = [
      { id: "1", name: "Advanced Light Source" },
      { id: "2", name: "National Synchrotron Light Source II" },
      { id: "3", name: "The Australian Synchrotron" },
    ];
    expect(matchFacilitiesBySlug(facilities, "als")).toEqual([
      { id: "1", name: "Advanced Light Source" },
    ]);
    expect(matchFacilitiesBySlug(facilities, "nslsii")).toEqual([
      { id: "2", name: "National Synchrotron Light Source II" },
    ]);
    expect(matchFacilitiesBySlug(facilities, "ansto")).toEqual([
      { id: "3", name: "The Australian Synchrotron" },
    ]);
    expect(matchFacilitiesBySlug(facilities, "advanced-light-source")).toEqual([
      { id: "1", name: "Advanced Light Source" },
    ]);
    expect(matchFacilitiesBySlug(facilities, "not-an-alias")).toEqual([]);
  });

  it("matchFacilitiesBySlug returns every facility sharing a slug", () => {
    const facilities = [
      { id: "1", name: "Light Source A" },
      { id: "2", name: "Light Source B" },
      { id: "3", name: "Advanced Light Source" },
    ];
    expect(matchFacilitiesBySlug(facilities, "light-source-a")).toEqual([
      { id: "1", name: "Light Source A" },
    ]);
    expect(matchFacilitiesBySlug(facilities, "advanced-light-source")).toEqual([
      { id: "3", name: "Advanced Light Source" },
    ]);
    expect(matchFacilitiesBySlug(facilities, "missing")).toEqual([]);
  });
});
