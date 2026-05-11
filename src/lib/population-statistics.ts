/**
 * Ordered statistics for finite numeric populations used by dataset-quality and performance-style summaries.
 *
 * Filters non-finite values, sorts a copy of the finite samples, and evaluates quantiles with **linear interpolation
 * between adjacent sorted values** using positions `(n - 1) * q` for sample size `n` (Hyndman type 7). This matches
 * common spreadsheet defaults and stays stable for single-point populations (all quantiles coincide with the sole value).
 *
 * Deliberately excludes weighting, censored estimators, and streaming algorithms.
 */

export type FinitePopulationSorted = {
  readonly sorted: readonly number[];
  readonly count: number;
  readonly min: number;
  readonly max: number;
};

export type PopulationQuantileSpec = {
  readonly q: number;
  readonly label?: string;
};

export type PopulationMetricQuantileResult = {
  readonly q: number;
  readonly label?: string;
  readonly value: number;
};

export type PopulationMetricsSummary = {
  readonly count: number;
  readonly min: number;
  readonly max: number;
  readonly median: number | null;
  readonly quantiles: readonly PopulationMetricQuantileResult[];
};

/**
 * Retains finite numbers from `values` and returns ascending sorted samples with basic extrema.
 *
 * @param values Raw measurements that may include NaN or infinities.
 * @returns Sorted finite samples plus count and extrema, or `null` when no finite numbers remain.
 */
export function finitePopulationSorted(
  values: readonly number[],
): FinitePopulationSorted | null {
  const sorted = values
    .filter((v) => typeof v === "number" && Number.isFinite(v))
    .slice()
    .sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  return {
    sorted,
    count: sorted.length,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
  };
}

/**
 * Evaluates a normalized quantile `q` in `[0, 1]` using linear interpolation on `sorted` ascending data.
 *
 * @param sorted Strictly finite ascending samples (`sorted[i] <= sorted[i+1]`).
 * @param q Probability mass to the left of the returned value; values outside `[0, 1]` clamp.
 * @returns Interpolated quantile, or `null` when `sorted` is empty.
 */
export function quantileLinearSorted(
  sorted: readonly number[],
  q: number,
): number | null {
  if (sorted.length === 0) return null;
  const qc = Math.min(1, Math.max(0, q));
  if (sorted.length === 1) return sorted[0]!;
  const pos = qc * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo]!;
  const frac = pos - lo;
  return sorted[lo]! * (1 - frac) + sorted[hi]! * frac;
}

/**
 * Computes the median as {@link quantileLinearSorted} at `q = 0.5`.
 *
 * @param sorted Ascending finite samples.
 */
export function medianSorted(sorted: readonly number[]): number | null {
  return quantileLinearSorted(sorted, 0.5);
}

/**
 * Builds median plus labeled quantiles for UI surfaces (bars, tables, hero captions).
 *
 * @param values Raw measurements; non-finite entries are dropped before sorting.
 * @param options Toggle median output and request arbitrary quantile levels with optional labels.
 */
export function summarizeFinitePopulation(
  values: readonly number[],
  options: {
    readonly median?: boolean;
    readonly quantiles?: readonly PopulationQuantileSpec[];
  },
): PopulationMetricsSummary | null {
  const base = finitePopulationSorted(values);
  if (!base) return null;
  const wantMedian = options.median !== false;
  const median = wantMedian ? medianSorted(base.sorted) : null;
  const specs = options.quantiles ?? [];
  const quantiles: PopulationMetricQuantileResult[] = [];
  for (const spec of specs) {
    const v = quantileLinearSorted(base.sorted, spec.q);
    if (v == null) continue;
    quantiles.push({ q: spec.q, label: spec.label, value: v });
  }
  return {
    count: base.count,
    min: base.min,
    max: base.max,
    median,
    quantiles,
  };
}

/**
 * Maps `value` linearly into `[0, 100]` against `[domainMin, domainMax]`, clamping when outside the interval.
 *
 * @param value Sample coordinate to position on a bar track.
 * @param domainMin Left edge of the visual domain (inclusive).
 * @param domainMax Right edge of the visual domain (inclusive); must exceed `domainMin`.
 */
export function populationValueToBarPercent(
  value: number,
  domainMin: number,
  domainMax: number,
): number {
  if (!Number.isFinite(value)) return 0;
  if (!(domainMax > domainMin)) return 50;
  const t = (value - domainMin) / (domainMax - domainMin);
  return Math.min(100, Math.max(0, t * 100));
}

/**
 * Expands `[dataMin, dataMax]` by relative padding `paddingFraction` of the span (minimum absolute pad when degenerate).
 *
 * @param dataMin Smallest finite observation driving the bar domain.
 * @param dataMax Largest finite observation driving the bar domain.
 * @param paddingFraction Non-negative fraction of `(dataMax - dataMin)` applied symmetrically (defaults to `0.08`).
 */
export function paddedPopulationDomain(
  dataMin: number,
  dataMax: number,
  paddingFraction = 0.08,
): { readonly min: number; readonly max: number } {
  if (!Number.isFinite(dataMin) || !Number.isFinite(dataMax)) {
    return { min: -1, max: 1 };
  }
  if (dataMin === dataMax) {
    const pad = Math.max(Math.abs(dataMin) * 0.05, 1e-6);
    return { min: dataMin - pad, max: dataMax + pad };
  }
  const span = dataMax - dataMin;
  const pad = span * Math.max(0, paddingFraction);
  return { min: dataMin - pad, max: dataMax + pad };
}
