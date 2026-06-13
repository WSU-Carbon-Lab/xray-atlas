import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { spectrumpointsWhereForPlotGeometryKeys } from "./plotSpectrumGeometryFilter";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toBeNull: () => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("spectrumpointsWhereForPlotGeometryKeys", () => {
  it("returns null for empty keys", () => {
    expect(spectrumpointsWhereForPlotGeometryKeys([])).toBeNull();
  });

  it("builds fixed polarization filter", () => {
    expect(spectrumpointsWhereForPlotGeometryKeys(["fixed"])).toEqual({
      OR: [{ polarizationid: null }],
    });
  });

  it("builds theta/phi geometry filters", () => {
    expect(spectrumpointsWhereForPlotGeometryKeys(["55:0", "20:90"])).toEqual({
      OR: [
        { polarizations: { polardeg: 55, azimuthdeg: 0 } },
        { polarizations: { polardeg: 20, azimuthdeg: 90 } },
      ],
    });
  });

  it("ignores malformed keys", () => {
    expect(spectrumpointsWhereForPlotGeometryKeys(["bad", "nocolon"])).toBeNull();
  });
});
