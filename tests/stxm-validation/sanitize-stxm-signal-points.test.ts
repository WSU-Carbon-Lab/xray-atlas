import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  sanitizeStxmSignalSampleForDisplay,
  sanitizeStxmSpectrumPointsForDisplay,
  stxmSpectrumPointsHaveFiniteAbsorption,
} from "~/lib/stxm/sanitize-stxm-signal-points";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeNaN: () => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("sanitizeStxmSignalSampleForDisplay", () => {
  it("maps negative values to NaN", () => {
    expect(sanitizeStxmSignalSampleForDisplay(-1)).toBeNaN();
    expect(sanitizeStxmSignalSampleForDisplay(-0.001)).toBeNaN();
  });

  it("preserves zero and positive finite values", () => {
    expect(sanitizeStxmSignalSampleForDisplay(0)).toBe(0);
    expect(sanitizeStxmSignalSampleForDisplay(42.5)).toBe(42.5);
  });

  it("passes through non-finite inputs unchanged", () => {
    expect(sanitizeStxmSignalSampleForDisplay(Number.NaN)).toBeNaN();
    expect(sanitizeStxmSignalSampleForDisplay(Number.POSITIVE_INFINITY)).toBe(
      Number.POSITIVE_INFINITY,
    );
  });
});

describe("sanitizeStxmSpectrumPointsForDisplay", () => {
  it("replaces negative absorption with NaN while keeping energy samples", () => {
    const sanitized = sanitizeStxmSpectrumPointsForDisplay([
      { energy: 280, absorption: 1.2 },
      { energy: 281, absorption: -0.5, rawabsError: 0.01 },
      { energy: 282, absorption: 0 },
    ]);
    expect(sanitized).toEqual([
      { energy: 280, absorption: 1.2 },
      { energy: 281, absorption: Number.NaN },
      { energy: 282, absorption: 0 },
    ]);
  });
});

describe("stxmSpectrumPointsHaveFiniteAbsorption", () => {
  it("returns false when every absorption is non-finite", () => {
    expect(
      stxmSpectrumPointsHaveFiniteAbsorption([
        { energy: 280, absorption: Number.NaN },
      ]),
    ).toBe(false);
  });

  it("returns true when at least one absorption is finite", () => {
    expect(
      stxmSpectrumPointsHaveFiniteAbsorption([
        { energy: 280, absorption: Number.NaN },
        { energy: 281, absorption: 0.4 },
      ]),
    ).toBe(true);
  });
});
