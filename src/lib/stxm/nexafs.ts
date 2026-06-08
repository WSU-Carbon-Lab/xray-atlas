import { regionMeanAndSigma, type StxmWeightingMode } from "./estimators";

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
 * @param mode - Region mean weighting mode forwarded to `regionMeanAndSigma`.
 * @param eps - Minimum intensity before logarithms.
 */
export function nexafsBeerLambert(
  image: Float64Array[],
  sampleMask: boolean[],
  izeroMask: boolean[],
  mode: StxmWeightingMode = "poisson_mle",
  eps = 1e-10,
): NexafsBeerLambertResult {
  const i0Result = regionMeanAndSigma(image, izeroMask, mode, eps);
  const sampleResult = regionMeanAndSigma(image, sampleMask, mode, eps);
  const nEnergy = image[0]?.length ?? 0;
  const od = new Float64Array(nEnergy);
  const sigmaOd = new Float64Array(nEnergy);

  for (let col = 0; col < nEnergy; col += 1) {
    const i0 = Math.max(i0Result.mean[col] ?? eps, eps);
    const iSample = Math.max(sampleResult.mean[col] ?? eps, eps);
    od[col] = Math.log(i0 / iSample);
    const sigmaI0 = i0Result.sigma[col] ?? 0;
    const sigmaI = sampleResult.sigma[col] ?? 0;
    sigmaOd[col] = Math.sqrt((sigmaI0 / i0) ** 2 + (sigmaI / iSample) ** 2);
  }

  return {
    od,
    sigmaOd,
    i0: i0Result.mean,
    sigmaI0: i0Result.sigma,
    iSample: sampleResult.mean,
    sigmaI: sampleResult.sigma,
    nSample: sampleResult.n,
    nIzero: i0Result.n,
  };
}
