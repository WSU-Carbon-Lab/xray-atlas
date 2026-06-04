/** Recorded region-mean weighting policy aligned with Python `stxm.estimators.WeightingMode`. */
export type StxmWeightingMode =
  | "inverse_count"
  | "poisson_mle"
  | "empirical";

export interface RegionMeanSigmaResult {
  mean: Float64Array;
  sigma: Float64Array;
  n: number;
}

/**
 * Computes per-energy column mean and standard error over masked spatial rows.
 *
 * @param values2d - Intensities with shape `(nSpatial, nEnergy)`.
 * @param mask - Boolean mask along the spatial axis.
 * @param mode - Weighting policy; defaults to Poisson MLE.
 * @param eps - Intensity floor for inverse-count weighting.
 * @returns Column means, standard errors, and masked row count.
 * @throws {Error} When `values2d` is empty or mask length mismatches spatial rows.
 */
export function regionMeanAndSigma(
  values2d: Float64Array[],
  mask: boolean[],
  mode: StxmWeightingMode = "poisson_mle",
  eps = 1e-10,
): RegionMeanSigmaResult {
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
    return { mean: nanColumn(), sigma: nanColumn(), n: 0 };
  }

  const mean = new Float64Array(nEnergy);
  const sigma = new Float64Array(nEnergy);

  for (let col = 0; col < nEnergy; col += 1) {
    if (mode === "inverse_count") {
      let weightSum = 0;
      let weighted = 0;
      for (let row = 0; row < values2d.length; row += 1) {
        if (!mask[row]) {
          continue;
        }
        const value = Math.max(values2d[row]?.[col] ?? 0, eps);
        const weight = 1 / value;
        weightSum += weight;
        weighted += value * weight;
      }
      mean[col] = weighted / weightSum;
      sigma[col] = 1 / Math.sqrt(weightSum);
      continue;
    }

    let sum = 0;
    const samples: number[] = [];
    for (let row = 0; row < values2d.length; row += 1) {
      if (!mask[row]) {
        continue;
      }
      const value = values2d[row]?.[col] ?? Number.NaN;
      sum += value;
      samples.push(value);
    }
    const colMean = sum / n;
    mean[col] = colMean;

    if (mode === "poisson_mle") {
      sigma[col] = Math.sqrt(Math.max(colMean, 0) / n);
    } else {
      if (samples.length < 2) {
        sigma[col] = Number.NaN;
      } else {
        const variance =
          samples.reduce((acc, value) => acc + (value - colMean) ** 2, 0) /
          (samples.length - 1);
        sigma[col] = Math.sqrt(variance / n);
      }
    }
  }

  return { mean, sigma, n };
}
