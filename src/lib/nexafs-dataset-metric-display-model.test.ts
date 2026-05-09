import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { resolutionSpacingDecadeScorePercent } from "./nexafs-dataset-metric-display-model";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeCloseTo: (expected: number, precision?: number) => void;
  toBeNull: () => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("resolutionSpacingDecadeScorePercent", () => {
  it("returns null for non-positive or non-finite spacing", () => {
    expect(resolutionSpacingDecadeScorePercent(null)).toBeNull();
    expect(resolutionSpacingDecadeScorePercent(0)).toBeNull();
    expect(resolutionSpacingDecadeScorePercent(Number.NaN)).toBeNull();
  });

  it("anchors 100 at 0.1 eV reference", () => {
    expect(resolutionSpacingDecadeScorePercent(0.1)).toBe(100);
  });

  it("drops 50 points per decade coarser spacing", () => {
    expect(resolutionSpacingDecadeScorePercent(1)).toBe(50);
    expect(resolutionSpacingDecadeScorePercent(10)).toBe(0);
  });

  it("raises score for sub-reference spacing", () => {
    expect(resolutionSpacingDecadeScorePercent(0.01)).toBe(150);
  });

  it("uses equal ratio steps between 0.5 and 0.1 eV vs 5 and 1 eV", () => {
    const a =
      resolutionSpacingDecadeScorePercent(0.5)! -
      resolutionSpacingDecadeScorePercent(0.1)!;
    const b =
      resolutionSpacingDecadeScorePercent(5)! -
      resolutionSpacingDecadeScorePercent(1)!;
    expect(a).toBeCloseTo(b, 5);
  });

  it("scores 0.5 eV near mid-good on decade scale", () => {
    expect(resolutionSpacingDecadeScorePercent(0.5)).toBeCloseTo(
      100 - 50 * Math.log10(5),
      5,
    );
  });

  it("floors at zero for very coarse spacing", () => {
    expect(resolutionSpacingDecadeScorePercent(100)).toBe(0);
  });
});
