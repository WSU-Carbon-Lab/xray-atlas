import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { nexafsBeerLambert } from "~/lib/stxm/nexafs";
import { autoMultiRegionFromImage } from "~/lib/stxm/multi-region-state";
import { regionRawSpectraFromScan } from "~/lib/stxm/raw-spectrum";
import {
  autoMultiRegionFromProfile,
  barBoundsFromThreeRegions,
  buildLineScanRowSumProfile,
  detectIzeroRowsFromProfile,
  sampleIzeroMasks,
} from "~/lib/stxm/regions";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeGreaterThan: (expected: number) => void;
  toBeLessThan: (expected: number) => void;
  toBeCloseTo: (expected: number, precision?: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function buildSyntheticFilmLineScan(): {
  image: Float64Array[];
  spatial: Float64Array;
} {
  const nRows = 12;
  const spatial = Float64Array.from({ length: nRows }, (_, row) => row);
  const image: Float64Array[] = [];
  for (let row = 0; row < nRows; row += 1) {
    const isIzero = row < 5;
    const preEdgeSample = 45;
    const edgeSample = 22;
    const izeroVal = 110;
    image.push(
      isIzero
        ? Float64Array.from([izeroVal, izeroVal])
        : Float64Array.from([preEdgeSample, edgeSample]),
    );
  }
  return { image, spatial };
}

function meanMaskIntensity(
  image: Float64Array[],
  mask: boolean[],
  energyIndex: number,
): number {
  let sum = 0;
  let count = 0;
  for (let row = 0; row < image.length; row += 1) {
    if (!mask[row]) {
      continue;
    }
    sum += image[row]?.[energyIndex] ?? 0;
    count += 1;
  }
  return count > 0 ? sum / count : 0;
}

describe("izero vs sample orientation", () => {
  it("barBoundsFromThreeRegions places izero on higher-intensity rows", () => {
    const { image, spatial } = buildSyntheticFilmLineScan();
    const [sampleLo, sampleHi, izeroLo, izeroHi] = barBoundsFromThreeRegions(
      image,
      spatial,
    );
    const { sampleMask, izeroMask } = sampleIzeroMasks(
      spatial,
      sampleLo,
      sampleHi,
      izeroLo,
      izeroHi,
    );
    const izeroMean = meanMaskIntensity(image, izeroMask, 0);
    const sampleMean = meanMaskIntensity(image, sampleMask, 0);
    expect(izeroMean).toBeGreaterThan(sampleMean);
  });

  it("detectIzeroRowsFromProfile picks high-intensity rows on synthetic scan", () => {
    const { image, spatial } = buildSyntheticFilmLineScan();
    const profile = buildLineScanRowSumProfile(image);
    const rows = detectIzeroRowsFromProfile(profile);
    if (!rows) {
      throw new Error("expected izero row band");
    }
    expect(rows.endRow).toBeLessThan(6);
    const inferred = autoMultiRegionFromProfile(image, spatial);
    expect(inferred.izeroHi).toBeGreaterThan(inferred.izeroLo);
    expect(inferred.sampleRegions.length).toBeGreaterThan(0);
  });

  it("autoMultiRegionFromImage yields izero mean above pure sample mean", () => {
    const { image, spatial } = buildSyntheticFilmLineScan();
    const energyEv = Float64Array.from([280, 290]);
    const state = autoMultiRegionFromImage(image, spatial);
    const spectra = regionRawSpectraFromScan(
      image,
      energyEv,
      spatial,
      state.regions,
      state.izero,
      "poisson_mle",
    );
    const izeroSeries = spectra.find((series) => series.isIzero);
    const sampleSeries = spectra.find((series) => !series.isIzero);
    if (!izeroSeries || !sampleSeries) {
      throw new Error("expected izero and sample raw spectra");
    }
    expect(izeroSeries.signal[0]!).toBeGreaterThan(sampleSeries.signal[0]!);
    expect(izeroSeries.signal[1]!).toBeGreaterThan(sampleSeries.signal[1]!);
  });

  it("Beer-Lambert OD is positive and rises through the absorption edge", () => {
    const { image, spatial } = buildSyntheticFilmLineScan();
    const [sampleLo, sampleHi, izeroLo, izeroHi] = barBoundsFromThreeRegions(
      image,
      spatial,
    );
    const { sampleMask, izeroMask } = sampleIzeroMasks(
      spatial,
      sampleLo,
      sampleHi,
      izeroLo,
      izeroHi,
    );
    const result = nexafsBeerLambert(image, sampleMask, izeroMask);
    expect(result.i0[0]!).toBeGreaterThan(result.iSample[0]!);
    expect(result.i0[1]!).toBeGreaterThan(result.iSample[1]!);
    expect(result.od[0]!).toBeGreaterThan(0);
    expect(result.od[1]!).toBeGreaterThan(result.od[0]!);
    expect(result.od[0]!).toBeCloseTo(
      Math.log(result.i0[0]! / result.iSample[0]!),
      6,
    );
    expect(result.od[1]!).toBeCloseTo(
      Math.log(result.i0[1]! / result.iSample[1]!),
      6,
    );
  });
});
