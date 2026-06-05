import { regionSumAndSigma, type StxmWeightingMode } from "./estimators";
import { stxmIzeroSeriesColor, stxmRegionSeriesColor } from "./region-colors";
import { sampleIzeroMasks } from "./regions";
import type { StxmIzeroBounds, StxmRegionSpectrumSeries, StxmSampleRegion } from "./stxm-region-types";

export type InMemoryScanContext = {
  image: Float64Array[];
  energyEv: Float64Array;
  spatial: Float64Array;
  izeroMask: boolean[];
};

/**
 * Builds an in-memory scan context with a precomputed izero row mask.
 */
export function buildInMemoryScanContext(
  image: Float64Array[],
  energyEv: Float64Array,
  spatial: Float64Array,
  izero: StxmIzeroBounds,
): InMemoryScanContext {
  const { izeroMask } = sampleIzeroMasks(
    spatial,
    0,
    0,
    izero.izeroLo,
    izero.izeroHi,
  );
  if (!izeroMask.some(Boolean)) {
    throw new Error("izero region selects no rows");
  }
  return { image, energyEv, spatial, izeroMask };
}

function toSeries(
  spotLabel: string,
  regionId: string,
  sampleLo: number,
  sampleHi: number,
  energyEv: number[],
  values: Float64Array,
  sigma: Float64Array,
  color: string,
  isIzero = false,
): StxmRegionSpectrumSeries {
  return {
    spotLabel,
    regionId,
    sampleLo,
    sampleHi,
    energyEv,
    signal: Array.from(values),
    signalErr: Array.from(sigma),
    color,
    isIzero,
  };
}

/**
 * Computes izero and per-sample-region raw summed spectra from oriented scan arrays.
 */
export function regionRawSpectraFromScan(
  image: Float64Array[],
  energyEv: Float64Array,
  spatial: Float64Array,
  regions: StxmSampleRegion[],
  izero: StxmIzeroBounds,
  weightingMode: StxmWeightingMode = "poisson_mle",
): StxmRegionSpectrumSeries[] {
  if (!image.length || regions.length === 0) {
    return [];
  }
  const ctx = buildInMemoryScanContext(image, energyEv, spatial, izero);
  const energyList = Array.from(energyEv);
  const spectra: StxmRegionSpectrumSeries[] = [];
  const izeroStats = regionSumAndSigma(ctx.image, ctx.izeroMask, weightingMode);
  spectra.push(
    toSeries(
      "izero",
      "izero",
      izero.izeroLo,
      izero.izeroHi,
      energyList,
      izeroStats.sum,
      izeroStats.sigma,
      stxmIzeroSeriesColor(),
      true,
    ),
  );
  regions.forEach((region, index) => {
    const { sampleMask } = sampleIzeroMasks(
      spatial,
      region.sampleLo,
      region.sampleHi,
      izero.izeroLo,
      izero.izeroHi,
    );
    if (!sampleMask.some(Boolean)) {
      return;
    }
    const stats = regionSumAndSigma(ctx.image, sampleMask, weightingMode);
    spectra.push(
      toSeries(
        region.spotLabel.trim() || `spot${index + 1}`,
        region.id,
        region.sampleLo,
        region.sampleHi,
        energyList,
        stats.sum,
        stats.sigma,
        stxmRegionSeriesColor(index),
      ),
    );
  });
  if (spectra.length === 1) {
    throw new Error("No sample regions overlap the scan axis; adjust region bars.");
  }
  return spectra;
}
