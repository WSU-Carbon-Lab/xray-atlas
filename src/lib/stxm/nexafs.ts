import { regionSumAndSigma, type StxmWeightingMode } from "./estimators";

export interface NexafsBeerLambertResult {
  od: Float64Array;
  sigmaOd: Float64Array;
  i0: Float64Array;
  sigmaI0: Float64Array;
  iSample: Float64Array;
  sigmaI: Float64Array;
  nSample: number;
  nIzero: number;
}

/**
 * Computes NEXAFS optical density via Beer-Lambert (`OD = ln(I0/I)`) with per-energy uncertainties.
 *
 * @param image - Oriented scan `(nSpatial, nEnergy)`.
 * @param sampleMask - Boolean mask selecting sample rows.
 * @param izeroMask - Boolean mask selecting izero rows.
 * @param mode - Region sum weighting mode forwarded to `regionSumAndSigma`.
 * @param eps - Minimum intensity before logarithms.
 */
export function nexafsBeerLambert(
  image: Float64Array[],
  sampleMask: boolean[],
  izeroMask: boolean[],
  mode: StxmWeightingMode = "poisson_mle",
  eps = 1e-10,
): NexafsBeerLambertResult {
  const i0Result = regionSumAndSigma(image, izeroMask, mode, eps);
  const sampleResult = regionSumAndSigma(image, sampleMask, mode, eps);
  const nEnergy = image[0]?.length ?? 0;
  const od = new Float64Array(nEnergy);
  const sigmaOd = new Float64Array(nEnergy);

  for (let col = 0; col < nEnergy; col += 1) {
    const i0 = Math.max(i0Result.sum[col] ?? eps, eps);
    const iSample = Math.max(sampleResult.sum[col] ?? eps, eps);
    od[col] = Math.log(i0 / iSample);
    const sigmaI0 = i0Result.sigma[col] ?? 0;
    const sigmaI = sampleResult.sigma[col] ?? 0;
    sigmaOd[col] = Math.sqrt((sigmaI0 / i0) ** 2 + (sigmaI / iSample) ** 2);
  }

  return {
    od,
    sigmaOd,
    i0: i0Result.sum,
    sigmaI0: i0Result.sigma,
    iSample: sampleResult.sum,
    sigmaI: sampleResult.sigma,
    nSample: sampleResult.n,
    nIzero: i0Result.n,
  };
}
