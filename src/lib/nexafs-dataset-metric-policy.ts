/**
 * Browse-facing scoring policy for persisted experiment/channel spectroscopy metrics.
 *
 * Maps raw floats stored on `experiment_metrics` / `experiment_metrics_channel` to comparable 0–100
 * subscores and four qualitative tiers suitable for compact badges on grouped browse cards.
 *
 * Deliberately excludes DB access, spectrum ingestion repair, and channel-imputation logic. Callers
 * coerce non-finite measurements to null before invoking the exported scoring helpers.
 *
 * Invariant: tier thresholds partition `[0, 100]` into half-open bands aligned with `tierFromPercent`.
 */

export const DATASET_METRIC_POLICY_SCHEMA_VERSION = 1 as const;

/** Canonical ascending spacing checkpoints (eV). Values below earlier checkpoints score higher. */
export const POINT_SPACING_SCORE_EV = [
  0.028, 0.065, 0.135, 0.28, 0.52,
] as const satisfies readonly number[];

/** Matching composite percents at `POINT_SPACING_SCORE_EV` knots before clamping to `[6, 100]`. */
export const POINT_SPACING_SCORE_PERCENT = [
  100, 86, 68, 44, 22, 8,
] as const satisfies readonly number[];

/**
 * Converts median/adjacent point spacing (eV) into a 0–100 score using monotone breakpoints.
 *
 * @param spacingEv Finite median spacing between sorted energies after restricting to strictly positive gaps.
 * @returns Percent-like score in `[6, 100]`; callers surface literal spacing gaps `< ~5e-4 eV` as measurement quirks rather than forcing extreme highs beyond calibration intent.
 */
export function spacingEvToPercent(spacingEv: number): number {
  return monotoneBreakpointsDescending(spacingEv, POINT_SPACING_SCORE_EV, POINT_SPACING_SCORE_PERCENT);
}

/** Canonical ascending SNR checkpoints (`mean(|y|)/std(y)` over populated finite samples). */
export const SNR_SCORE_KNOTS = [2.2, 5.5, 11, 22, 40] as const satisfies readonly number[];

/** Matching percents at `SNR_SCORE_KNOTS` knots before clamping to `[8, 100]`. */
export const SNR_SCORE_PERCENT = [14, 36, 58, 78, 92, 100] as const satisfies readonly number[];

/**
 * Converts an amplitude-domain SNR into a 0–100 score using monotone breakpoints (larger is better).
 *
 * @param snr Ratio produced upstream (`mean(|y|)/std(y)`), excluding degenerate zero-variance sets upstream as null.
 */
export function snrToPercent(snr: number): number {
  return monotoneBreakpointsAscending(snr, SNR_SCORE_KNOTS, SNR_SCORE_PERCENT);
}

/** Knot mean deviation checkpoints for per-channel normalization anchor distance (`experiment_metrics_channel.normalization_target_distance`). */
export const NORM_DISTANCE_SCORE_KNOTS = [
  0.012, 0.035, 0.085, 0.18, 0.32,
] as const satisfies readonly number[];

export const NORM_DISTANCE_SCORE_PERCENT = [
  100, 84, 62, 40, 20, 6,
] as const satisfies readonly number[];

/**
 * Converts pooled mean absolute deviation from nominal pre-edge (0) and post-edge (1) anchors into a 0–100 score (smaller deviation scores higher).
 *
 * Callers supply one scalar per channel assembled upstream when normalization ranges exist and finite samples lie in those windows.
 */
export function normalizationMeanDeviationToPercent(meanDeviation: number): number {
  return monotoneBreakpointsDescending(
    meanDeviation,
    NORM_DISTANCE_SCORE_KNOTS,
    NORM_DISTANCE_SCORE_PERCENT,
  );
}

export type DatasetMetricTier = "excellent" | "good" | "fair" | "poor";

export const DATASET_METRIC_TIER_ORDER = [
  "excellent",
  "good",
  "fair",
  "poor",
] as const satisfies readonly DatasetMetricTier[];

/** Percent thresholds partitioning tiers (`tierFromPercent` uses `[EXCELLENT, ∞)`, `[GOOD, EXCELLENT)`, ... ). */
export const DATASET_METRIC_TIER_PERCENT_CUTOFFS = {
  excellentMinPercent: 86,
  goodMinPercent: 66,
  fairMinPercent: 38,
} as const;

/**
 * Assigns a four-band qualitative tier from an aggregate percent derived via {@link combinePercentsMean}.
 *
 * @param percent Value on `[0, 100]`; non-finite values collapse to `"poor"` when surfaced—prefer guarding callers with `"missing"` UI states instead of feeding NaNs here.
 */
export function tierFromPercent(percent: number): DatasetMetricTier {
  if (!Number.isFinite(percent)) return "poor";
  if (percent >= DATASET_METRIC_TIER_PERCENT_CUTOFFS.excellentMinPercent) return "excellent";
  if (percent >= DATASET_METRIC_TIER_PERCENT_CUTOFFS.goodMinPercent) return "good";
  if (percent >= DATASET_METRIC_TIER_PERCENT_CUTOFFS.fairMinPercent) return "fair";
  return "poor";
}

/**
 * Computes a simple arithmetic mean over finite percents; returns null when no usable inputs remain.
 *
 * Used both server-side when storing aggregates and client-side when recombining breakdown bars already constrained to `[0, 100]`.
 */
export function combinePercentsMean(parts: readonly (number | null | undefined)[]): number | null {
  let sum = 0;
  let count = 0;
  for (const value of parts) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    sum += value;
    count += 1;
  }
  if (count === 0) return null;
  return sum / count;
}

/** Stable Tailwind-friendly accents keyed by tier (browse-card-safe contrast assumed). */
export function tierSurfaceClasses(tier: DatasetMetricTier): string {
  switch (tier) {
    case "excellent":
      return "from-emerald-400 via-teal-400 to-cyan-400";
    case "good":
      return "from-lime-400 via-emerald-500 to-green-500";
    case "fair":
      return "from-amber-400 via-orange-400 to-orange-500";
    case "poor":
      return "from-rose-500 via-red-500 to-red-600";
  }
}

/** Stroke/text accents for horizontal gauge fills keyed by tier. */
export function tierGaugeFgClass(tier: DatasetMetricTier): string {
  switch (tier) {
    case "excellent":
      return "bg-emerald-400";
    case "good":
      return "bg-lime-400";
    case "fair":
      return "bg-amber-400";
    case "poor":
      return "bg-rose-500";
  }
}

/** SVG stroke accents for circular score rings keyed by tier (pairs with {@link tierGaugeFgClass}). */
export function tierRingStrokeClass(tier: DatasetMetricTier | "unknown"): string {
  switch (tier) {
    case "excellent":
      return "stroke-emerald-400";
    case "good":
      return "stroke-lime-400";
    case "fair":
      return "stroke-amber-400";
    case "poor":
      return "stroke-rose-500";
    case "unknown":
      return "stroke-zinc-500";
  }
}

/** Primary numeric label color classes for large measurement displays keyed by tier. */
export function tierValueTextClass(tier: DatasetMetricTier | "unknown"): string {
  switch (tier) {
    case "excellent":
      return "text-emerald-400";
    case "good":
      return "text-lime-400";
    case "fair":
      return "text-amber-400";
    case "poor":
      return "text-rose-400";
    case "unknown":
      return "text-zinc-400";
  }
}

function monotoneBreakpointsDescending(
  value: number,
  knotsExclusiveAscending: readonly number[],
  percentsOnePastLength: readonly number[],
): number {
  const knots = knotsExclusiveAscending;
  const percents = percentsOnePastLength;
  if (!Number.isFinite(value)) return percents[0]!;
  if (value <= knots[0]!) return percents[0]!;
  const lastKnotIndex = knots.length - 1;
  if (value >= knots[lastKnotIndex]!) return percents[lastKnotIndex + 1]!;
  for (let i = 1; i < knots.length; i += 1) {
    const prev = knots[i - 1]!;
    const next = knots[i]!;
    if (value <= next) {
      const pPrev = percents[i - 1]!;
      const pNext = percents[i]!;
      const t = (value - prev) / (next - prev);
      return blendPercents(pPrev, pNext, t);
    }
  }
  return percents[lastKnotIndex + 1]!;
}

function monotoneBreakpointsAscending(
  value: number,
  knotsExclusiveAscending: readonly number[],
  percentsOnePastLength: readonly number[],
): number {
  const knots = knotsExclusiveAscending;
  const percents = percentsOnePastLength;
  if (!Number.isFinite(value)) return percents[0]!;
  if (value <= knots[0]!) return percents[0]!;
  const lastKnotIndex = knots.length - 1;
  if (value >= knots[lastKnotIndex]!) return percents[lastKnotIndex + 1]!;
  for (let i = 1; i < knots.length; i += 1) {
    const prev = knots[i - 1]!;
    const next = knots[i]!;
    if (value <= next) {
      const pPrev = percents[i - 1]!;
      const pNext = percents[i]!;
      const t = (value - prev) / (next - prev);
      return blendPercents(pPrev, pNext, t);
    }
  }
  return percents[lastKnotIndex + 1]!;
}

function blendPercents(leftPercent: number, rightPercent: number, t: number): number {
  const blended = leftPercent + t * (rightPercent - leftPercent);
  return Math.min(100, Math.max(0, blended));
}
