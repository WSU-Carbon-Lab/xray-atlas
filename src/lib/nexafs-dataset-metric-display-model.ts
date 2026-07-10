/**
 * Serializes persisted experiment metric payloads into compact browse-card UI models.
 *
 * Owns JSON parsing for grouped browse SQL aggregates and applies `nexafs-dataset-metric-policy` breakpoints
 * consistently with metric persistence. Browse-card resolution subscores use a decade-relative ΔE mapping via
 * {@link resolutionSpacingDecadeScorePercent} rather than `(0.1/ΔE)×100`. Headline dataset quality averages
 * resolution and SNR only; OD and mass-absorption normalization fit scores are not listed in `bars` until they ship.
 */

import type { DatasetMetricTier } from "~/lib/nexafs-dataset-metric-policy";
import { combinePercentsMean, snrToPercent, tierFromPercent } from "~/lib/nexafs-dataset-metric-policy";

export const NEXAFS_DATASET_METRIC_CHANNEL_ORDER = ["rawabs", "od", "massabsorption", "beta"] as const;

export type NexafsDatasetMetricChannelKey =
  (typeof NEXAFS_DATASET_METRIC_CHANNEL_ORDER)[number];

export type NexafsBrowseDatasetMetricBarModel = {
  key: "resolution_distribution" | "snr";
  label: string;
  percent: number | null;
  tier: DatasetMetricTier | "unknown";
  /** Short human-readable measurement for large-type display (not the 0–100 score). */
  quantityValue: string;
  /** Unit or suffix rendered muted beside {@link quantityValue} (may be empty). */
  quantityUnit: string;
  /** Caption below the gauge (context, raw detail, or unavailable reason). */
  summary: string;
  distribution?: {
    hyperfinePercent: number;
    goodPercent: number;
    fairPercent: number;
    poorPercent: number;
    p75MarkerPercent: number | null;
    p75MarkerLabel: string;
    averageMarkerPercent: number | null;
    averageMarkerLabel: string;
    p75DeltaEv: number | null;
    averageDeltaEv: number | null;
  };
};

export type NexafsBrowseDatasetMetricsCardModel = {
  aggregatePercent: number | null;
  aggregateTier: DatasetMetricTier | "unknown";
  missing: boolean;
  normalizationRangesPresent: boolean;
  hasErrorBars: boolean;
  bars: NexafsBrowseDatasetMetricBarModel[];
};

function isChannelKey(value: string): value is NexafsDatasetMetricChannelKey {
  return (NEXAFS_DATASET_METRIC_CHANNEL_ORDER as readonly string[]).includes(
    value,
  );
}

function tierFromPercentOrUnknown(
  percent: number | null,
): DatasetMetricTier | "unknown" {
  if (percent == null || !Number.isFinite(percent)) return "unknown";
  return tierFromPercent(percent);
}

function finiteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function densityContributionPercent(pointDensityPercent: number | null): number | null {
  if (pointDensityPercent == null || !Number.isFinite(pointDensityPercent)) return null;
  if (pointDensityPercent <= 100) return pointDensityPercent;
  const surplus = pointDensityPercent - 100;
  const maxBonus = 18;
  const decayScale = 40;
  const bonus = maxBonus * (1 - Math.exp(-surplus / decayScale));
  return 100 + bonus;
}

/** Reference ΔE (eV): score is 100 at this spacing on the decade scale. */
const RESOLUTION_SCORE_REF_EV = 0.1;
/** Score drop per factor-of-10 coarser spacing (larger ΔE); finer than {@link RESOLUTION_SCORE_REF_EV} can exceed 100. */
const RESOLUTION_SCORE_POINTS_PER_DECADE = 50;

/** Points subtracted from the browse headline aggregate when SNR cannot be scored (for example, no uploaded error bars or non-finite SNR). */
export const DATASET_QUALITY_MISSING_STATISTIC_PENALTY = 5;

/**
 * Maps finite adjacent-spacing ΔE (in eV) to a percent-like score from decade distance to {@link RESOLUTION_SCORE_REF_EV}.
 * Coarser spacing (larger ΔE) lowers the score by {@link RESOLUTION_SCORE_POINTS_PER_DECADE} per factor-of-10 step; finer spacing can exceed 100 until callers apply diminishing returns.
 *
 * @param deltaEv Strictly positive finite spacing in eV; non-finite or non-positive values yield null.
 * @returns Score in `[0, ∞)`, anchored at 100 when `deltaEv` equals `RESOLUTION_SCORE_REF_EV`; null when unusable.
 */
export function resolutionSpacingDecadeScorePercent(deltaEv: number | null): number | null {
  if (deltaEv == null || !Number.isFinite(deltaEv) || deltaEv <= 0) return null;
  const decadesFromRef = Math.log10(deltaEv / RESOLUTION_SCORE_REF_EV);
  const raw = 100 - RESOLUTION_SCORE_POINTS_PER_DECADE * decadesFromRef;
  return Math.max(0, raw);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function clampDatasetAggregatePercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function p75MarkerFromDistribution(
  p75DeltaEv: number | null,
  p75BucketProgressPct: number | null,
  distribution: {
    hyperfinePercent: number;
    goodPercent: number;
    fairPercent: number;
    poorPercent: number;
  },
): number | null {
  if (p75DeltaEv == null || !Number.isFinite(p75DeltaEv) || p75DeltaEv <= 0) {
    return null;
  }
  const h = clampPercent(distribution.hyperfinePercent);
  const g = clampPercent(distribution.goodPercent);
  const f = clampPercent(distribution.fairPercent);
  const p = clampPercent(distribution.poorPercent);
  const total = h + g + f + p;
  if (total <= 0) return null;
  const hn = (h / total) * 100;
  const gn = (g / total) * 100;
  const fn = (f / total) * 100;
  const pn = (p / total) * 100;
  const progressFraction =
    p75BucketProgressPct != null && Number.isFinite(p75BucketProgressPct)
      ? clampPercent(p75BucketProgressPct) / 100
      : null;

  if (p75DeltaEv < 0.1) {
    const frac =
      progressFraction ?? clampPercent((p75DeltaEv / 0.1) * 100) / 100;
    return hn * frac;
  }
  if (p75DeltaEv < 1) {
    const frac =
      progressFraction ??
      clampPercent(((p75DeltaEv - 0.1) / 0.9) * 100) / 100;
    return hn + gn * frac;
  }
  if (p75DeltaEv <= 5) {
    const frac =
      progressFraction ??
      clampPercent(((p75DeltaEv - 1) / 4) * 100) / 100;
    return hn + gn + fn * frac;
  }
  const tailFrac = progressFraction ?? Math.min(1, (p75DeltaEv - 5) / 20);
  return hn + gn + fn + pn * tailFrac;
}

export type NexafsBrowseExperimentMetricHeaderPayload = {
  quality_aggregate_score?: unknown;
  normalization_ranges_present?: unknown;
  has_error_bars?: unknown;
  minimum_spacing_ev?: unknown;
  spacing_distribution_hyperfine_pct?: unknown;
  spacing_distribution_good_pct?: unknown;
  spacing_distribution_fair_pct?: unknown;
  spacing_distribution_poor_pct?: unknown;
  spacing_distribution_mean_ev?: unknown;
  spacing_distribution_p75_ev?: unknown;
  spacing_distribution_p75_bucket_progress_pct?: unknown;
};

export type NexafsBrowseExperimentMetricChannelPayload = {
  channel?: unknown;
  point_spacing_ev?: unknown;
  snr?: unknown;
  normalization_target_distance?: unknown;
  channel_contribution_score?: unknown;
};

/**
 * Parses grouped-browse JSON aggregates into a single dataset score plus detailed hover breakdown.
 *
 * Uses `rawabs` for mean spacing and SNR. Dataset-level energy resolution scoring prefers the persisted P75 adjacent-spacing
 * quantile when the spacing distribution is available. The headline aggregate mean uses resolution (with diminishing returns
 * above 100) and SNR for finite parts only, then subtracts {@link DATASET_QUALITY_MISSING_STATISTIC_PENALTY} when SNR is
 * unscored (clamped to `[0, 100]`). OD and mass-absorption normalization fit subscores do not enter the aggregate
 * and are not materialized as `bars` rows until implemented.
 *
 * @param headerPayload Experiment-level metrics header row or null when no `experiment_metrics` row exists.
 * @param channelsPayload JSON array from `experiment_metrics_channel` or empty array when uncomputed.
 */
export function buildNexafsBrowseDatasetMetricsCardModel(
  headerPayload: unknown,
  channelsPayload: unknown,
): NexafsBrowseDatasetMetricsCardModel {
  const header =
    headerPayload && typeof headerPayload === "object"
      ? (headerPayload as NexafsBrowseExperimentMetricHeaderPayload)
      : null;
  const normalizationRangesPresent =
    typeof header?.normalization_ranges_present === "boolean"
      ? header.normalization_ranges_present
      : false;
  const hasErrorBars =
    typeof header?.has_error_bars === "boolean" ? header.has_error_bars : false;
  const meanSpacingEv = finiteNumber(header?.spacing_distribution_mean_ev);
  const p75SpacingEv = finiteNumber(header?.spacing_distribution_p75_ev);
  const p75BucketProgressPct = finiteNumber(
    header?.spacing_distribution_p75_bucket_progress_pct,
  );
  const hyperfinePct = clampPercent(
    finiteNumber(header?.spacing_distribution_hyperfine_pct) ?? 0,
  );
  const goodPct = clampPercent(
    finiteNumber(header?.spacing_distribution_good_pct) ?? 0,
  );
  const fairPct = clampPercent(
    finiteNumber(header?.spacing_distribution_fair_pct) ?? 0,
  );
  const poorPct = clampPercent(
    finiteNumber(header?.spacing_distribution_poor_pct) ?? 0,
  );

  const rowsRaw = Array.isArray(channelsPayload) ? channelsPayload : [];
  const byChannel = new Map<NexafsDatasetMetricChannelKey, NexafsBrowseExperimentMetricChannelPayload>();
  for (const row of rowsRaw) {
    if (!row || typeof row !== "object") continue;
    const r = row as NexafsBrowseExperimentMetricChannelPayload;
    const ch = typeof r.channel === "string" ? r.channel : "";
    if (!isChannelKey(ch)) continue;
    byChannel.set(ch, r);
  }

  const rawChannel = byChannel.get("rawabs");
  const spacingEv = finiteNumber(rawChannel?.point_spacing_ev);
  const snr = hasErrorBars ? finiteNumber(rawChannel?.snr) : null;
  const spacingPct = resolutionSpacingDecadeScorePercent(spacingEv);
  const snrPct = snr != null ? snrToPercent(snr) : null;
  const weightedResolutionPopulationScore =
    hyperfinePct * 1.2 + goodPct + fairPct * 0.65 + poorPct * 0.25;
  const hasDistribution = hyperfinePct + goodPct + fairPct + poorPct > 0;
  const p75ResolutionPct = resolutionSpacingDecadeScorePercent(p75SpacingEv);
  const resolutionDistributionFallback = hasDistribution
    ? weightedResolutionPopulationScore
    : spacingPct;
  const resolvedResolutionPercent =
    p75ResolutionPct ?? resolutionDistributionFallback;
  const averageResolutionPercent =
    meanSpacingEv != null
      ? resolutionSpacingDecadeScorePercent(meanSpacingEv)
      : spacingPct;

  const bars: NexafsBrowseDatasetMetricBarModel[] = [
    {
      key: "resolution_distribution",
      label: "Energy resolution distribution",
      percent: hasDistribution ? resolvedResolutionPercent : null,
      tier: tierFromPercentOrUnknown(
        hasDistribution ? resolvedResolutionPercent : null,
      ),
      quantityValue:
        p75SpacingEv != null
          ? p75SpacingEv.toFixed(3)
          : spacingEv != null
            ? spacingEv.toFixed(3)
            : "—",
      quantityUnit:
        p75SpacingEv != null || spacingEv != null ? "eV P75 ΔE" : "",
      summary:
        hasDistribution
          ? "Population share by spacing tier: great (< 0.1 eV), good (0.1-1 eV), ok (1-5 eV), and bad (> 5 eV)."
          : "Need enough uploaded points to resolve adjacent-spacing distribution.",
      distribution: {
        hyperfinePercent: hyperfinePct,
        goodPercent: goodPct,
        fairPercent: fairPct,
        poorPercent: poorPct,
        p75MarkerPercent: p75MarkerFromDistribution(
          p75SpacingEv,
          p75BucketProgressPct,
          {
            hyperfinePercent: hyperfinePct,
            goodPercent: goodPct,
            fairPercent: fairPct,
            poorPercent: poorPct,
          },
        ),
        p75MarkerLabel:
          p75SpacingEv != null
            ? `P75 ΔE ${p75SpacingEv.toFixed(3)} eV`
            : "P75 ΔE unavailable",
        averageMarkerPercent:
          averageResolutionPercent != null
            ? clampPercent((averageResolutionPercent / 120) * 100)
            : null,
        averageMarkerLabel:
          meanSpacingEv != null
            ? `avg ΔE ${meanSpacingEv.toFixed(3)} eV`
            : spacingEv != null
              ? `avg ΔE ${spacingEv.toFixed(3)} eV`
              : "avg ΔE unavailable",
        p75DeltaEv: p75SpacingEv,
        averageDeltaEv: meanSpacingEv ?? spacingEv,
      },
    },
    {
      key: "snr",
      label: "Signal-to-noise ratio",
      percent: snrPct,
      tier: tierFromPercentOrUnknown(snrPct),
      quantityValue: snr != null ? snr.toFixed(2) : "—",
      quantityUnit: "",
      summary: hasErrorBars
        ? snr != null
          ? "Computed from uploaded absorption and uploaded error bars."
          : "Error bars exist but no finite SNR could be computed."
        : "Uploaded data has no error bars",
    },
  ];

  const resolutionContribution = densityContributionPercent(
    resolvedResolutionPercent ?? spacingPct,
  );
  const baseAggregateMean = combinePercentsMean([
    resolutionContribution,
    snrPct,
  ]);
  let missingStatisticCount = 0;
  if (snrPct == null) missingStatisticCount += 1;

  const aggregatePercent =
    baseAggregateMean == null
      ? null
      : clampDatasetAggregatePercent(
          baseAggregateMean -
            DATASET_QUALITY_MISSING_STATISTIC_PENALTY * missingStatisticCount,
        );
  const missing = aggregatePercent == null;

  return {
    aggregatePercent,
    aggregateTier: tierFromPercentOrUnknown(aggregatePercent),
    missing,
    normalizationRangesPresent,
    hasErrorBars,
    bars,
  };
}

function spectrumHasUploadedErrorBars(points: readonly { rawabsError?: number; odError?: number; massabsorptionError?: number; betaError?: number }[]): boolean {
  for (const point of points) {
    if (
      (typeof point.rawabsError === "number" &&
        Number.isFinite(point.rawabsError) &&
        point.rawabsError > 0) ||
      (typeof point.odError === "number" &&
        Number.isFinite(point.odError) &&
        point.odError > 0) ||
      (typeof point.massabsorptionError === "number" &&
        Number.isFinite(point.massabsorptionError) &&
        point.massabsorptionError > 0) ||
      (typeof point.betaError === "number" &&
        Number.isFinite(point.betaError) &&
        point.betaError > 0)
    ) {
      return true;
    }
  }
  return false;
}

type UploadQualityScoresLike = {
  normalizationRangesPresent: boolean;
  perChannel: Record<
    NexafsDatasetMetricChannelKey,
    {
      pointSpacing: number | null;
      snr: number | null;
      normalizationTargetDistance: number | null;
    }
  >;
};

/**
 * Builds the browse-card metrics model from live upload diagnostics so contribute previews match persisted browse scoring.
 *
 * @param qualityScores Client-computed quality subscores from {@link computeUploadDatasetDiagnostics}.
 * @param derivedPoints Upload spectrum rows after normalization and bare-atom derivation used for SNR detection.
 */
export function buildUploadDatasetMetricsCardModel(
  qualityScores: UploadQualityScoresLike,
  derivedPoints: readonly {
    rawabsError?: number;
    odError?: number;
    massabsorptionError?: number;
    betaError?: number;
  }[],
): NexafsBrowseDatasetMetricsCardModel {
  const headerPayload: NexafsBrowseExperimentMetricHeaderPayload = {
    normalization_ranges_present: qualityScores.normalizationRangesPresent,
    has_error_bars: spectrumHasUploadedErrorBars(derivedPoints),
  };
  const channelsPayload = NEXAFS_DATASET_METRIC_CHANNEL_ORDER.map((channel) => {
    const qc = qualityScores.perChannel[channel];
    return {
      channel,
      point_spacing_ev: qc.pointSpacing,
      snr: qc.snr,
      normalization_target_distance: qc.normalizationTargetDistance,
    };
  });
  return buildNexafsBrowseDatasetMetricsCardModel(
    headerPayload,
    channelsPayload,
  );
}
