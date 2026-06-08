import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  applySampleRegionBoundaryDrag,
  resolveSampleRegionsAfterIzeroChange,
} from "~/lib/stxm/region-drag-constraints";
import { sampleRangeOverlapsIzeroInterior } from "~/lib/stxm/region-izero-constraints";
import {
  buildLineScanRowSumProfile,
  detectIzeroRowsFromProfile,
} from "~/lib/stxm/regions";
import type { StxmSampleRegion } from "~/lib/stxm/stxm-region-types";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeGreaterThan: (expected: number) => void;
  toBeLessThan: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const izero = { izeroLo: 2, izeroHi: 4 };

function region(
  id: string,
  sampleLo: number,
  sampleHi: number,
): StxmSampleRegion {
  return {
    id,
    sampleLo,
    sampleHi,
    spotLabel: id,
    role: "custom",
  };
}

describe("detectIzeroRowsFromProfile", () => {
  it("selects brightest stable row band on synthetic line scan", () => {
    const profile = new Float64Array([
      110, 112, 108, 109, 111, 45, 44, 43, 42, 41, 40, 39,
    ]);
    const detected = detectIzeroRowsFromProfile(profile);
    if (!detected) {
      throw new Error("expected izero rows");
    }
    expect(detected.startRow).toBe(0);
    expect(detected.endRow).toBeLessThan(5);
  });
});

describe("buildLineScanRowSumProfile", () => {
  it("sums trailing energy columns per row", () => {
    const image = [
      Float64Array.from([1, 10, 100]),
      Float64Array.from([2, 20, 200]),
    ];
    const profile = buildLineScanRowSumProfile(image, 2);
    expect(profile[0]).toBe(55);
    expect(profile[1]).toBe(110);
  });
});

describe("applySampleRegionBoundaryDrag", () => {
  it("reorders regions when a boundary crosses a neighbor", () => {
    const regions = [
      region("a", 0, 2),
      region("b", 6, 8),
    ];
    const result = applySampleRegionBoundaryDrag(
      regions,
      izero,
      { regionIndex: 0, edge: "hi" },
      7,
      0,
      10,
      0.5,
    );
    const a = result.regions.find((entry) => entry.id === "a");
    const b = result.regions.find((entry) => entry.id === "b");
    if (!a || !b) {
      throw new Error("expected both regions");
    }
    expect(a.sampleHi).toBeGreaterThan(6);
    expect(
      sampleRangeOverlapsIzeroInterior(a.sampleLo, a.sampleHi, izero),
    ).toBe(false);
    expect(
      sampleRangeOverlapsIzeroInterior(b.sampleLo, b.sampleHi, izero),
    ).toBe(false);
  });

  it("clamps sample drag that would nest inside izero", () => {
    const regions = [region("a", 5, 8)];
    const result = applySampleRegionBoundaryDrag(
      regions,
      izero,
      { regionIndex: 0, edge: "lo" },
      3,
      0,
      10,
      0.5,
    );
    expect(result.clampedToIzero).toBe(true);
    expect(
      sampleRangeOverlapsIzeroInterior(
        result.regions[0]!.sampleLo,
        result.regions[0]!.sampleHi,
        izero,
      ),
    ).toBe(false);
  });
});

describe("resolveSampleRegionsAfterIzeroChange", () => {
  it("pushes regions out when izero expands", () => {
    const regions = [region("a", 4.5, 8)];
    const expanded = { izeroLo: 1, izeroHi: 5.5 };
    const resolved = resolveSampleRegionsAfterIzeroChange(
      regions,
      expanded,
      0,
      10,
      0.5,
    );
    expect(resolved.clampedToIzero).toBe(true);
    expect(
      sampleRangeOverlapsIzeroInterior(
        resolved.regions[0]!.sampleLo,
        resolved.regions[0]!.sampleHi,
        expanded,
      ),
    ).toBe(false);
  });
});
