import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  legacyBoundsToMultiRegion,
  multiRegionToLegacyBounds,
} from "~/lib/stxm/multi-region-state";
import { resolvePureRegionIndex, setPureRegionRole } from "~/lib/stxm/region-editor-utils";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("multiRegionToLegacyBounds", () => {
  it("uses pure region for sample bounds", () => {
    const regions = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        sampleLo: 2,
        sampleHi: 4,
        spotLabel: "edge",
        role: "edge" as const,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        sampleLo: 5,
        sampleHi: 8,
        spotLabel: "pure",
        role: "pure" as const,
      },
    ];
    const izero = { izeroLo: 0.5, izeroHi: 1.5 };
    const bounds = multiRegionToLegacyBounds(
      regions,
      izero,
      "22222222-2222-4222-8222-222222222222",
    );
    expect(bounds.sampleLo).toBe(5);
    expect(bounds.sampleHi).toBe(8);
    expect(bounds.izeroLo).toBe(0.5);
    expect(bounds.izeroHi).toBe(1.5);
  });
});

describe("legacyBoundsToMultiRegion", () => {
  it("creates one pure region from legacy bounds", () => {
    const state = legacyBoundsToMultiRegion({
      sampleLo: 3,
      sampleHi: 7,
      izeroLo: 1,
      izeroHi: 2,
    });
    expect(state.regions).toHaveLength(1);
    expect(state.regions[0]?.role).toBe("pure");
    expect(state.regions[0]?.sampleLo).toBe(3);
    expect(state.izero.izeroLo).toBe(1);
  });
});

describe("resolvePureRegionIndex", () => {
  it("prefers explicit pure role", () => {
    const regions = [
      {
        id: "a",
        sampleLo: 0,
        sampleHi: 1,
        spotLabel: "edge",
        role: "edge" as const,
      },
      {
        id: "b",
        sampleLo: 2,
        sampleHi: 3,
        spotLabel: "film",
        role: "pure" as const,
      },
    ];
    expect(resolvePureRegionIndex(regions)).toBe(1);
  });

  it("setPureRegionRole updates roles", () => {
    const regions = [
      {
        id: "a",
        sampleLo: 0,
        sampleHi: 1,
        spotLabel: "pure",
        role: "pure" as const,
      },
      {
        id: "b",
        sampleLo: 2,
        sampleHi: 3,
        spotLabel: "edge",
        role: "custom" as const,
      },
    ];
    const next = setPureRegionRole(regions, "b");
    expect(next[0]?.role).toBe("custom");
    expect(next[1]?.role).toBe("pure");
  });
});
