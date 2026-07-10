import {
  describe as bunDescribe,
  it as bunIt,
  expect as bunExpect,
} from "bun:test";
import { scaleLinear } from "d3-scale";
import { resolveNormalizationBandRect } from "./normalization-region-band-geometry";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeNull: () => void;
  toBeGreaterThan: (expected: number) => void;
  toBeGreaterThanOrEqual: (expected: number) => void;
  toBeLessThanOrEqual: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("resolveNormalizationBandRect", () => {
  const xScale = scaleLinear().domain([280, 300]).range([0, 400]);

  it("returns null when the window lies entirely left of the plot", () => {
    const rect = resolveNormalizationBandRect(
      [270, 275],
      xScale,
      0,
      0,
      200,
      400,
    );
    expect(rect).toBeNull();
  });

  it("clips a window that starts before the plot domain", () => {
    const rect = resolveNormalizationBandRect(
      [275, 285],
      xScale,
      0,
      0,
      200,
      400,
    );
    if (!rect) {
      throw new Error("expected clipped rect");
    }
    expect(rect.x).toBe(0);
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(400);
  });

  it("clips a window that extends past the plot right edge", () => {
    const rect = resolveNormalizationBandRect(
      [295, 310],
      xScale,
      0,
      0,
      200,
      400,
    );
    if (!rect) {
      throw new Error("expected clipped rect");
    }
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBe(400);
  });
});
