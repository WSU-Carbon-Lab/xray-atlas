import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  isStxmEnergyValidAtIndex,
  isStxmRawSampleValid,
  maskStxmDisplaySample,
  maskStxmSpectrumPointsForDisplay,
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

describe("isStxmRawSampleValid", () => {
  it("rejects non-positive or non-finite I0", () => {
    expect(isStxmRawSampleValid(0)).toBe(false);
    expect(isStxmRawSampleValid(-1)).toBe(false);
    expect(isStxmRawSampleValid(Number.NaN)).toBe(false);
  });

  it("accepts positive finite I0 when It is omitted", () => {
    expect(isStxmRawSampleValid(42.5)).toBe(true);
  });

  it("rejects non-positive It when supplied", () => {
    expect(isStxmRawSampleValid(1000, 0)).toBe(false);
    expect(isStxmRawSampleValid(1000, -5)).toBe(false);
    expect(isStxmRawSampleValid(1000, Number.NaN)).toBe(false);
  });

  it("accepts positive I0 and It together", () => {
    expect(isStxmRawSampleValid(1000, 500)).toBe(true);
  });

  it("rejects non-positive Ie when supplied for TEY", () => {
    expect(isStxmRawSampleValid(1000, 500, 0)).toBe(false);
    expect(isStxmRawSampleValid(1000, 500, -0.1)).toBe(false);
    expect(isStxmRawSampleValid(1000, 500, 12)).toBe(true);
  });
});

describe("maskStxmDisplaySample", () => {
  it("maps invalid energies to NaN regardless of y sign", () => {
    expect(maskStxmDisplaySample(-0.5, false)).toBeNaN();
    expect(maskStxmDisplaySample(1.2, false)).toBeNaN();
  });

  it("preserves y values at valid energies including negative derived values", () => {
    expect(maskStxmDisplaySample(-0.5, true)).toBe(-0.5);
    expect(maskStxmDisplaySample(42.5, true)).toBe(42.5);
  });
});

describe("maskStxmSpectrumPointsForDisplay", () => {
  it("masks invalid indices while keeping energy samples", () => {
    const masked = maskStxmSpectrumPointsForDisplay(
      [
        { energy: 280, absorption: 1.2 },
        { energy: 281, absorption: -0.5, rawabsError: 0.01 },
        { energy: 282, absorption: 0 },
      ],
      [true, false, true],
    );
    expect(masked).toEqual([
      { energy: 280, absorption: 1.2 },
      { energy: 281, absorption: Number.NaN },
      { energy: 282, absorption: 0 },
    ]);
  });
});

describe("isStxmEnergyValidAtIndex", () => {
  it("rejects paired terminal intensity glitch indices", () => {
    const i0 = [1000, 1010, 40];
    const it = [500, 480, 900];
    expect(isStxmEnergyValidAtIndex(0, i0, it)).toBe(true);
    expect(isStxmEnergyValidAtIndex(1, i0, it)).toBe(true);
    expect(isStxmEnergyValidAtIndex(2, i0, it)).toBe(false);
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
