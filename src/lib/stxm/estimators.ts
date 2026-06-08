/** Recorded region-sum weighting policy aligned with Python `stxm.estimators.WeightingMode`. */
export type StxmWeightingMode =
  | "inverse_count"
  | "poisson_mle"
  | "empirical";

export interface RegionSumSigmaResult {
  sum: Float64Array;
  sigma: Float64Array;
  n: number;
}

/** @deprecated Use `RegionSumSigmaResult`. */
export type RegionMeanSigmaResult = RegionSumSigmaResult & { mean: Float64Array };

/**
 * Computes per-energy column sums and standard errors over masked spatial rows.
 *
 * Poisson MLE uses `sqrt(sum)` counting uncertainty on the summed detector signal.
 * Empirical propagates sample standard deviation to the sum via `std * sqrt(n)`.
 * Inverse count scales harmonic-mean error to the summed intensity.
 */
export function regionSumAndSigma(
  values2d: Float64Array[],
  mask: boolean[],
  mode: StxmWeightingMode = "poisson_mle",
  eps = 1e-10,
): RegionSumSigmaResult {
  if (values2d.length === 0) {
    throw new Error("values2d must contain at least one spatial row");
  }
  const nEnergy = values2d[0]?.length ?? 0;
  if (mask.length !== values2d.length) {
    throw new Error("mask length must match values2d row count");
  }

  const n = mask.reduce((count, value) => count + (value ? 1 : 0), 0);
  const nanColumn = () => new Float64Array(nEnergy).fill(Number.NaN);

  if (n === 0) {
    return { sum: nanColumn(), sigma: nanColumn(), n: 0 };
  }

  const sum = new Float64Array(nEnergy);
  const sigma = new Float64Array(nEnergy);

  for (let col = 0; col < nEnergy; col += 1) {
    if (mode === "inverse_count") {
      let weightSum = 0;
      let colSum = 0;
      for (let row = 0; row < values2d.length; row += 1) {
        if (!mask[row]) {
          continue;
        }
        const value = Math.max(values2d[row]?.[col] ?? 0, eps);
        const weight = 1 / value;
        weightSum += weight;
        colSum += value;
      }
      sum[col] = colSum;
      sigma[col] = n / Math.sqrt(weightSum);
      continue;
    }

    let colSum = 0;
    const samples: number[] = [];
    for (let row = 0; row < values2d.length; row += 1) {
      if (!mask[row]) {
        continue;
      }
      const value = values2d[row]?.[col] ?? Number.NaN;
      colSum += value;
      samples.push(value);
    }
    sum[col] = colSum;

    if (mode === "poisson_mle") {
      sigma[col] = Math.sqrt(Math.max(colSum, 0));
    } else {
      if (samples.length < 2) {
        sigma[col] = Number.NaN;
      } else {
        const colMean = colSum / n;
        const variance =
          samples.reduce((acc, value) => acc + (value - colMean) ** 2, 0) /
          (samples.length - 1);
        sigma[col] = Math.sqrt(variance) * Math.sqrt(n);
      }
    }
  }

  return { sum, sigma, n };
}

/**
 * Computes per-energy column means and standard errors over masked spatial rows.
 *
 * Poisson MLE uses `sqrt(mean / n)` on the per-pixel mean; empirical and inverse-count
 * modes derive mean uncertainties from the same masked row block as the standalone STXM app.
 */
export function regionMeanAndSigma(
  values2d: Float64Array[],
  mask: boolean[],
  mode: StxmWeightingMode = "poisson_mle",
  eps = 1e-10,
): RegionMeanSigmaResult {
  const result = regionSumAndSigma(values2d, mask, mode, eps);
  const mean = new Float64Array(result.sum.length);
  const sigma = new Float64Array(result.sigma.length);
  const divisor = result.n > 0 ? result.n : 1;
  for (let index = 0; index < result.sum.length; index += 1) {
    mean[index] = result.sum[index]! / divisor;
    sigma[index] = result.sigma[index]! / Math.sqrt(divisor);
  }
  return { ...result, mean, sigma };
}
