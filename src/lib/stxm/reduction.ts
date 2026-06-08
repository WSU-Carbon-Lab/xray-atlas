import { orientScan } from "./orientScan";
import { nexafsBeerLambert } from "./nexafs";
import { sampleIzeroMasks } from "./regions";
import type { StxmHdrMetadata } from "./types";
import type { StxmWeightingMode } from "./estimators";

export type StxmReductionMethod = "two_region" | "thickness_regression";

export interface RegionSpectrum {
  energyEv: Float64Array;
  od: Float64Array;
  odErr: Float64Array;
  regionLabel: string;
  weightingMode: StxmWeightingMode;
  reductionMethod: StxmReductionMethod;
  nPixels: number;
  diagnostics: Record<string, number>;
}

/**
 * Reduces an oriented scan with the two-region Beer-Lambert ratio.
 */
export function reduceTwoRegion(
  image: Float64Array[],
  sampleMask: boolean[],
  izeroMask: boolean[],
  energy: Float64Array,
  regionLabel = "sample",
  mode: StxmWeightingMode = "poisson_mle",
  eps = 1e-10,
): RegionSpectrum {
  const result = nexafsBeerLambert(image, sampleMask, izeroMask, mode, eps);
  return {
    energyEv: energy,
    od: result.od,
    odErr: result.sigmaOd,
    regionLabel,
    weightingMode: mode,
    reductionMethod: "two_region",
    nPixels: result.nSample,
    diagnostics: {},
  };
}

/**
 * Regresses `-ln(I)` against a thickness proxy at each energy column.
 *
 * @throws {Error} When fewer than two film pixels are selected or the proxy is constant.
 */
export function reduceByRegression(
  image: Float64Array[],
  filmMask: boolean[],
  thicknessProxy: Float64Array,
  energy: Float64Array,
  regionLabel = "film",
  mode: StxmWeightingMode = "poisson_mle",
  eps = 1e-10,
): RegionSpectrum {
  const filmIndices: number[] = [];
  for (let row = 0; row < filmMask.length; row += 1) {
    if (filmMask[row]) {
      filmIndices.push(row);
    }
  }
  if (filmIndices.length < 2) {
    throw new Error("film_mask must select at least two spatial rows");
  }

  const nEnergy = energy.length;
  const slopes = new Float64Array(nEnergy);
  const odErr = new Float64Array(nEnergy);

  const tValues = filmIndices.map((row) => thicknessProxy[row] ?? 0);
  const tMin = Math.min(...tValues);
  const tMax = Math.max(...tValues);
  if (Math.abs(tMax - tMin) < 1e-12) {
    throw new Error("thickness_proxy must vary across film pixels");
  }

  for (let col = 0; col < nEnergy; col += 1) {
    const y: number[] = [];
    const t: number[] = [];
    for (const row of filmIndices) {
      const intensity = Math.max(image[row]?.[col] ?? eps, eps);
      y.push(-Math.log(intensity));
      t.push(thicknessProxy[row] ?? 0);
    }
    const n = y.length;
    let sumT = 0;
    let sumY = 0;
    let sumTT = 0;
    let sumTY = 0;
    for (let i = 0; i < n; i += 1) {
      sumT += t[i] ?? 0;
      sumY += y[i] ?? 0;
      sumTT += (t[i] ?? 0) ** 2;
      sumTY += (t[i] ?? 0) * (y[i] ?? 0);
    }
    const denom = n * sumTT - sumT * sumT;
    const slope = denom === 0 ? Number.NaN : (n * sumTY - sumT * sumY) / denom;
    const intercept = (sumY - slope * sumT) / n;
    slopes[col] = slope;
    let residualSum = 0;
    for (let i = 0; i < n; i += 1) {
      const fitted = slope * (t[i] ?? 0) + intercept;
      residualSum += ((y[i] ?? 0) - fitted) ** 2;
    }
    odErr[col] = Math.sqrt(residualSum / Math.max(n - 2, 1)) / Math.sqrt(n);
  }

  return {
    energyEv: energy,
    od: slopes,
    odErr,
    regionLabel,
    weightingMode: mode,
    reductionMethod: "thickness_regression",
    nPixels: filmIndices.length,
    diagnostics: {
      thicknessProxyMin: tMin,
      thicknessProxyMax: tMax,
    },
  };
}

/**
 * Builds a per-row thickness surrogate from OD at one reference energy.
 */
export function thicknessProxyFromReferenceOd(
  image: Float64Array[],
  energy: Float64Array,
  referenceEnergyEv: number,
  eps = 1e-10,
): Float64Array {
  let bestIdx = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < energy.length; i += 1) {
    const dist = Math.abs((energy[i] ?? 0) - referenceEnergyEv);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  const proxy = new Float64Array(image.length);
  for (let row = 0; row < image.length; row += 1) {
    const intensity = Math.max(image[row]?.[bestIdx] ?? eps, eps);
    proxy[row] = -Math.log(intensity);
  }
  return proxy;
}

/**
 * Orients a loaded scan and applies two-region Beer-Lambert reduction using spatial bounds.
 */
export function reduceLoadedScanTwoRegion(
  meta: StxmHdrMetadata,
  image: Float64Array[],
  sampleLo: number,
  sampleHi: number,
  izeroLo: number,
  izeroHi: number,
  regionLabel = "sample",
  mode: StxmWeightingMode = "poisson_mle",
  eps = 1e-10,
): RegionSpectrum {
  const { energyEv, spatial, image: oriented } = orientScan(meta, image);
  const { sampleMask, izeroMask } = sampleIzeroMasks(
    spatial,
    sampleLo,
    sampleHi,
    izeroLo,
    izeroHi,
  );
  return reduceTwoRegion(
    oriented,
    sampleMask,
    izeroMask,
    energyEv,
    regionLabel,
    mode,
    eps,
  );
}

/** Serializes a region spectrum to JSON-safe number arrays for session persistence. */
export function regionSpectrumToRecord(spectrum: RegionSpectrum): {
  regionLabel: string;
  reductionMethod: StxmReductionMethod;
  weightingMode: StxmWeightingMode;
  energyEv: number[];
  od: number[];
  odErr: number[];
  nPixels: number;
  diagnostics: Record<string, number>;
} {
  return {
    regionLabel: spectrum.regionLabel,
    reductionMethod: spectrum.reductionMethod,
    weightingMode: spectrum.weightingMode,
    energyEv: Array.from(spectrum.energyEv),
    od: Array.from(spectrum.od),
    odErr: Array.from(spectrum.odErr),
    nPixels: spectrum.nPixels,
    diagnostics: spectrum.diagnostics,
  };
}
