import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { regionMeanAndSigma } from "~/lib/stxm/estimators";
import { nexafsBeerLambert } from "~/lib/stxm/nexafs";
import { reduceTwoRegion } from "~/lib/stxm/reduction";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeCloseTo: (expected: number, precision?: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("regionMeanAndSigma", () => {
  it("matches Poisson MLE error scaling", () => {
    const image = [Float64Array.from([4, 8]), Float64Array.from([4, 8])];
    const mask = [true, true];
    const result = regionMeanAndSigma(image, mask, "poisson_mle");
    expect(result.n).toBe(2);
    expect(result.mean[0]).toBeCloseTo(4, 6);
    expect(result.sigma[0]).toBeCloseTo(Math.sqrt(2), 6);
  });
});

describe("nexafsBeerLambert", () => {
  it("computes OD as ln(I0/I)", () => {
    const image = [
      Float64Array.from([50, 50]),
      Float64Array.from([100, 100]),
    ];
    const sampleMask = [true, false];
    const izeroMask = [false, true];
    const result = nexafsBeerLambert(image, sampleMask, izeroMask);
    expect(result.od[0]).toBeCloseTo(Math.log(2), 6);
    expect(result.nSample).toBe(1);
    expect(result.nIzero).toBe(1);
  });
});

describe("reduceTwoRegion", () => {
  it("returns a spectrum with aligned energy axis", () => {
    const energy = Float64Array.from([280, 290]);
    const image = [
      Float64Array.from([100, 100]),
      Float64Array.from([50, 40]),
    ];
    const sampleMask = [true, false];
    const izeroMask = [false, true];
    const spectrum = reduceTwoRegion(
      image,
      sampleMask,
      izeroMask,
      energy,
      "sample",
    );
    expect(spectrum.energyEv.length).toBe(2);
    expect(spectrum.od.length).toBe(2);
    expect(spectrum.reductionMethod).toBe("two_region");
  });
});
