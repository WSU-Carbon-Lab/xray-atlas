import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  facilityDetailHref,
  facilityDetailHrefFromName,
  isFacilityUuidSegment,
} from "./facility-route";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("facility route helpers", () => {
  it("isFacilityUuidSegment accepts canonical UUID segments", () => {
    expect(
      isFacilityUuidSegment("0e5176bb-ee9f-42f7-b4f6-96fdd208e84c"),
    ).toBe(true);
    expect(isFacilityUuidSegment("advanced-light-source")).toBe(false);
  });

  it("facilityDetailHref builds slug paths with optional instrument anchors", () => {
    expect(facilityDetailHref("advanced-light-source")).toBe(
      "/facilities/advanced-light-source",
    );
    expect(
      facilityDetailHref(
        "advanced-light-source",
        "als-uuid_beamline_5_3_2_2",
      ),
    ).toBe(
      "/facilities/advanced-light-source#instrument-als-uuid_beamline_5_3_2_2",
    );
  });

  it("facilityDetailHrefFromName derives slug from facility name", () => {
    expect(facilityDetailHrefFromName("Advanced Light Source")).toBe(
      "/facilities/advanced-light-source",
    );
  });
});
