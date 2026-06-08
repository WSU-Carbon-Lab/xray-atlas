import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { autoMultiRegionFromImage } from "~/lib/stxm/multi-region-state";
import {
  clampDraggedSampleEdgeOutsideIzero,
  clampSampleEdgeOutsideIzeroInterior,
  enforceAllSampleRegionsOutsideIzero,
  enforceSampleRegionOutsideIzero,
  sampleRangeOverlapsIzeroInterior,
} from "~/lib/stxm/region-izero-constraints";
import {
  barBoundsFromThreeRegions,
  segmentedRegionBoundsFromImage,
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

function sampleRegion(lo: number, hi: number): StxmSampleRegion {
  return {
    id: "test-region",
    sampleLo: lo,
    sampleHi: hi,
    spotLabel: "film",
    role: "custom",
  };
}

function buildSyntheticFilmLineScan(): {
  image: Float64Array[];
  spatial: Float64Array;
} {
  const nRows = 18;
  const spatial = Float64Array.from({ length: nRows }, (_, row) => row);
  const image: Float64Array[] = [];
  for (let row = 0; row < nRows; row += 1) {
    const isIzero = row < 6;
    const filmA = row >= 6 && row < 11;
    const filmB = row >= 11;
    const izeroVal = 120;
    const filmAVal = 55;
    const filmBVal = 35;
    image.push(
      Float64Array.from([
        isIzero ? izeroVal : filmA ? filmAVal : filmBVal,
        isIzero ? izeroVal : filmA ? 28 : filmB ? 18 : 18,
      ]),
    );
  }
  return { image, spatial };
}

describe("sampleRangeOverlapsIzeroInterior", () => {
  it("detects interior overlap and allows edge touch", () => {
    expect(sampleRangeOverlapsIzeroInterior(1, 2, izero)).toBe(false);
    expect(sampleRangeOverlapsIzeroInterior(2, 4, izero)).toBe(true);
    expect(sampleRangeOverlapsIzeroInterior(4, 6, izero)).toBe(false);
    expect(sampleRangeOverlapsIzeroInterior(3, 5, izero)).toBe(true);
  });
});

describe("clampSampleEdgeOutsideIzeroInterior", () => {
  it("snaps edges inside izero to nearest boundary", () => {
    expect(clampSampleEdgeOutsideIzeroInterior(3, izero)).toBe(2);
    expect(clampSampleEdgeOutsideIzeroInterior(3.9, izero)).toBe(4);
    expect(clampSampleEdgeOutsideIzeroInterior(1, izero)).toBe(1);
  });
});

describe("enforceSampleRegionOutsideIzero", () => {
  it("slides a fully enclosed region to the nearer exterior", () => {
    const fixed = enforceSampleRegionOutsideIzero(
      sampleRegion(2.5, 3.5),
      izero,
      0.5,
      0,
      10,
    );
    expect(sampleRangeOverlapsIzeroInterior(fixed.sampleLo, fixed.sampleHi, izero)).toBe(
      false,
    );
  });

  it("trims partial overlap on the low side", () => {
    const fixed = enforceSampleRegionOutsideIzero(
      sampleRegion(1, 3),
      izero,
      0.5,
      0,
      10,
    );
    expect(fixed.sampleHi).toBeLessThan(4);
    expect(sampleRangeOverlapsIzeroInterior(fixed.sampleLo, fixed.sampleHi, izero)).toBe(
      false,
    );
  });
});

describe("clampDraggedSampleEdgeOutsideIzero", () => {
  it("blocks dragging a sample edge into izero interior", () => {
    const lo = clampDraggedSampleEdgeOutsideIzero(
      3,
      7,
      "lo",
      izero,
      0.5,
      0,
      10,
    );
    expect(lo).toBeLessThan(3);
    const enforced = enforceSampleRegionOutsideIzero(
      sampleRegion(lo, 7),
      izero,
      0.5,
      0,
      10,
    );
    expect(
      sampleRangeOverlapsIzeroInterior(enforced.sampleLo, enforced.sampleHi, izero),
    ).toBe(false);
  });
});

describe("enforceAllSampleRegionsOutsideIzero", () => {
  it("fixes every region after izero expansion", () => {
    const regions = [
      sampleRegion(0, 1.5),
      sampleRegion(4.5, 8),
    ];
    const expanded = { izeroLo: 1, izeroHi: 5 };
    const next = enforceAllSampleRegionsOutsideIzero(
      regions,
      expanded,
      0.5,
      0,
      10,
    );
    for (const region of next) {
      expect(
        sampleRangeOverlapsIzeroInterior(region.sampleLo, region.sampleHi, expanded),
      ).toBe(false);
    }
  });
});

describe("segmentedRegionBoundsFromImage", () => {
  it("places izero on brighter rows and splits film stacks", () => {
    const { image, spatial } = buildSyntheticFilmLineScan();
    const segmented = segmentedRegionBoundsFromImage(image, spatial, 3);
    expect(segmented.izeroHi).toBeLessThan(6);
    expect(segmented.sampleBounds.length).toBeGreaterThan(0);
    for (const bounds of segmented.sampleBounds) {
      expect(bounds.sampleLo).toBeGreaterThan(segmented.izeroHi - 0.5);
    }
  });
});

describe("autoMultiRegionFromImage layout", () => {
  it("yields non-overlapping sample regions outside izero", () => {
    const { image, spatial } = buildSyntheticFilmLineScan();
    const state = autoMultiRegionFromImage(image, spatial, 3);
    expect(state.regions.length).toBeGreaterThan(0);
    for (const region of state.regions) {
      expect(
        sampleRangeOverlapsIzeroInterior(
          region.sampleLo,
          region.sampleHi,
          state.izero,
        ),
      ).toBe(false);
    }
    const [sampleLo, sampleHi, izeroLo, izeroHi] = barBoundsFromThreeRegions(
      image,
      spatial,
    );
    expect(izeroHi).toBeLessThan(sampleLo + 1);
    expect(izeroLo).toBeLessThan(izeroHi);
    expect(sampleHi).toBeGreaterThan(sampleLo);
    expect(state.izero.izeroHi).toBeGreaterThan(state.izero.izeroLo);
  });
});
