import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  computeRegionGaps,
  findRegionDragTarget,
} from "~/lib/stxm/region-editor-utils";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("computeRegionGaps", () => {
  it("finds gap between izero and sample region", () => {
    const regions = [
      {
        id: "r1",
        sampleLo: 6,
        sampleHi: 9,
        spotLabel: "pure",
        role: "pure" as const,
      },
    ];
    const izero = { izeroLo: 1, izeroHi: 3 };
    const gaps = computeRegionGaps(regions, izero, 0, 10, 0.2);
    expect(gaps.some((gap) => gap.lo >= 3 && gap.hi <= 6)).toBe(true);
  });
});

describe("findRegionDragTarget", () => {
  it("returns nearest boundary within hit margin", () => {
    const izero = { izeroLo: 1, izeroHi: 2 };
    const regions = [
      {
        id: "r1",
        sampleLo: 5,
        sampleHi: 7,
        spotLabel: "pure",
        role: "pure" as const,
      },
    ];
    const target = findRegionDragTarget(5.05, 0.2, izero, regions);
    expect(target?.kind).toBe("region");
    if (target?.kind === "region") {
      expect(target.edge).toBe("lo");
      expect(target.index).toBe(0);
    }
  });
});
