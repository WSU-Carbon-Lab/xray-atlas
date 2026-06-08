import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  canonicalFacilitySlugFromName,
  canonicalFacilitySlugFromView,
  slugifyFacilityName,
} from "./facility-slug";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
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
});
