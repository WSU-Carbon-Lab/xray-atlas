import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { beerLambertFromSummedSignals } from "~/features/dashboard/lib/computeStxmIngestion";
import { regionMeanAndSigma, regionSumAndSigma } from "~/lib/stxm/estimators";
import { nexafsBeerLambert } from "~/lib/stxm/nexafs";
import { reduceTwoRegion } from "~/lib/stxm/reduction";
import { sampleIzeroMasks } from "~/lib/stxm/regions";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeCloseTo: (expected: number, precision?: number) => void;
  toBeGreaterThan: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function buildAsymmetricBandLineScan(perPixelRate: number): {
  image: Float64Array[];
  spatial: Float64Array;
  sampleMask: boolean[];
  izeroMask: boolean[];
} {
  const nSampleRows = 10;
  const nIzeroRows = 100;
  const nRows = nSampleRows + nIzeroRows;
  const spatial = Float64Array.from({ length: nRows }, (_, row) => row);
  const image: Float64Array[] = [];
  for (let row = 0; row < nRows; row += 1) {
    image.push(Float64Array.from([perPixelRate, perPixelRate * 0.5]));
  }
  const sampleMask = Array.from({ length: nRows }, (_, row) => row < nSampleRows);
  const izeroMask = Array.from({ length: nRows }, (_, row) => row >= nSampleRows);
  return { image, spatial, sampleMask, izeroMask };
}

describe("regionSumAndSigma", () => {
  it("sums masked rows and applies Poisson counting error on the sum", () => {
    const image = [Float64Array.from([4, 8]), Float64Array.from([4, 8])];
    const mask = [true, true];
    const result = regionSumAndSigma(image, mask, "poisson_mle");
    expect(result.n).toBe(2);
    expect(result.sum[0]).toBeCloseTo(8, 6);
    expect(result.sigma[0]).toBeCloseTo(Math.sqrt(8), 6);
  });
});

describe("regionMeanAndSigma", () => {
  it("returns per-pixel means independent of band height", () => {
    const { image, sampleMask, izeroMask } = buildAsymmetricBandLineScan(50);
    const sampleStats = regionMeanAndSigma(image, sampleMask, "poisson_mle");
    const izeroStats = regionMeanAndSigma(image, izeroMask, "poisson_mle");
    expect(sampleStats.n).toBe(10);
    expect(izeroStats.n).toBe(100);
    expect(sampleStats.mean[0]).toBeCloseTo(50, 6);
    expect(izeroStats.mean[0]).toBeCloseTo(50, 6);
    expect(sampleStats.mean[1]).toBeCloseTo(25, 6);
    expect(izeroStats.mean[1]).toBeCloseTo(25, 6);
  });
});

describe("nexafsBeerLambert", () => {
  it("computes OD as ln(I0/I) from equal per-pixel rates", () => {
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

  it("uses per-pixel means so OD is unchanged when band heights differ", () => {
    const { image, sampleMask, izeroMask } = buildAsymmetricBandLineScan(50);
    const result = nexafsBeerLambert(image, sampleMask, izeroMask);
    expect(result.od[0]).toBeCloseTo(0, 6);
    expect(result.od[1]).toBeCloseTo(0, 6);
    expect(result.nSample).toBe(10);
    expect(result.nIzero).toBe(100);
  });

  it("matches OD from summed totals only when pixel counts are equal", () => {
    const image = [
      Float64Array.from([40, 20]),
      Float64Array.from([40, 20]),
      Float64Array.from([80, 40]),
      Float64Array.from([80, 40]),
    ];
    const sampleMask = [true, true, false, false];
    const izeroMask = [false, false, true, true];
    const meanResult = nexafsBeerLambert(image, sampleMask, izeroMask);
    expect(meanResult.od[0]).toBeCloseTo(Math.log(2), 6);
    expect(meanResult.od[1]).toBeCloseTo(Math.log(2), 6);
  });

  it("does not bias OD when summed totals differ but per-pixel rates match", () => {
    const { image, sampleMask, izeroMask } = buildAsymmetricBandLineScan(40);
    const meanResult = nexafsBeerLambert(image, sampleMask, izeroMask);
    const sampleSum = regionSumAndSigma(image, sampleMask, "poisson_mle");
    const izeroSum = regionSumAndSigma(image, izeroMask, "poisson_mle");
    const biasedOd = Math.log(
      Math.max(izeroSum.sum[0] ?? 1, 1) / Math.max(sampleSum.sum[0] ?? 1, 1),
    );
    expect(biasedOd).toBeCloseTo(Math.log(10), 6);
    expect(meanResult.od[0]).toBeCloseTo(0, 6);
    expect(Math.abs(meanResult.od[0]! - biasedOd)).toBeGreaterThan(1);
  });
});

describe("beerLambertFromSummedSignals", () => {
  it("computes OD from per-pixel mean intensities with matching uncertainties", () => {
    const i0 = [100, 100];
    const iSample = [50, 40];
    const i0Err = [10, 10];
    const iSampleErr = [7, 6];
    const { od, odErr } = beerLambertFromSummedSignals(
      i0,
      i0Err,
      iSample,
      iSampleErr,
    );
    expect(od[0]).toBeCloseTo(Math.log(2), 6);
    expect(od[1]).toBeCloseTo(Math.log(2.5), 6);
    expect(odErr[0]).toBeCloseTo(
      Math.sqrt((10 / 100) ** 2 + (7 / 50) ** 2),
      6,
    );
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

  it("reduces asymmetric sample and izero bands via spatial bounds", () => {
    const { image, spatial, sampleMask, izeroMask } =
      buildAsymmetricBandLineScan(60);
    const energy = Float64Array.from([280, 290]);
    const bounds = sampleIzeroMasks(spatial, 0, 9, 10, 109);
    expect(bounds.sampleMask.filter(Boolean).length).toBe(10);
    expect(bounds.izeroMask.filter(Boolean).length).toBe(100);
    const spectrum = reduceTwoRegion(
      image,
      sampleMask,
      izeroMask,
      energy,
      "sample",
    );
    expect(spectrum.od[0]).toBeCloseTo(0, 6);
    expect(spectrum.nPixels).toBe(10);
  });
});
