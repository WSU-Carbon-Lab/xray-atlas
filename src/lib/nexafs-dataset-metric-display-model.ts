/**
 * Serializes persisted experiment metric payloads into compact browse-card UI models.
 *
 * Owns JSON parsing for grouped browse SQL aggregates and applies `nexafs-dataset-metric-policy` breakpoints
 * consistently with metric persistence.
 */

import type { DatasetMetricTier } from "~/lib/nexafs-dataset-metric-policy";
import {
  combinePercentsMean,
  normalizationMeanDeviationToPercent,
  snrToPercent,
  spacingEvToPercent,
  tierFromPercent,
} from "~/lib/nexafs-dataset-metric-policy";

export const NEXAFS_DATASET_METRIC_CHANNEL_ORDER = [
  "rawabs",
  "od",
  "massabsorption",
  "beta",
] as const;

export type NexafsDatasetMetricChannelKey =
  (typeof NEXAFS_DATASET_METRIC_CHANNEL_ORDER)[number];

export type NexafsBrowseDatasetMetricBarModel = {
  key: "spacing" | "snr" | "norm_distance";
  label: string;
  percent: number | null;
  tier: DatasetMetricTier | "unknown";
  /** Short human-readable measurement for large-type display (not the 0–100 score). */
  quantityValue: string;
  /** Unit or suffix rendered muted beside {@link quantityValue} (may be empty). */
  quantityUnit: string;
  /** Caption below the gauge (context, raw detail, or unavailable reason). */
  summary: string;
};

export type NexafsBrowseDatasetMetricChannelModel = {
  key: NexafsDatasetMetricChannelKey;
  label: string;
  aggregatePercent: number | null;
  aggregateTier: DatasetMetricTier | "unknown";
  missing: boolean;
  bars: NexafsBrowseDatasetMetricBarModel[];
};

export type NexafsBrowseDatasetMetricsCardModel = {
  /**
   * Arithmetic mean of finite channel aggregates; null when every channel lacks usable percents.
   */
  experimentAggregatePercent: number | null;
  experimentAggregateTier: DatasetMetricTier | "unknown";
  normalizationRangesPresent: boolean;
  channels: NexafsBrowseDatasetMetricChannelModel[];
};

const CHANNEL_LABELS: Record<NexafsDatasetMetricChannelKey, string> = {
  rawabs: "Raw μ",
  od: "OD",
  massabsorption: "μ",
  beta: "β",
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

export type NexafsBrowseExperimentMetricHeaderPayload = {
  quality_aggregate_score?: unknown;
  normalization_ranges_present?: unknown;
};

export type NexafsBrowseExperimentMetricChannelPayload = {
  channel?: unknown;
  point_spacing_ev?: unknown;
  snr?: unknown;
  normalization_target_distance?: unknown;
  channel_contribution_score?: unknown;
};

/**
 * Parses grouped-browse JSON aggregates into a stable channel-major UI model with four ordered traces.
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

  const rowsRaw = Array.isArray(channelsPayload) ? channelsPayload : [];
  const byChannel = new Map<NexafsDatasetMetricChannelKey, NexafsBrowseExperimentMetricChannelPayload>();
  for (const row of rowsRaw) {
    if (!row || typeof row !== "object") continue;
    const r = row as NexafsBrowseExperimentMetricChannelPayload;
    const ch = typeof r.channel === "string" ? r.channel : "";
    if (!isChannelKey(ch)) continue;
    byChannel.set(ch, r);
  }

  const channels: NexafsBrowseDatasetMetricChannelModel[] =
    NEXAFS_DATASET_METRIC_CHANNEL_ORDER.map((key) => {
      const row = byChannel.get(key);
      if (!row) {
        return {
          key,
          label: CHANNEL_LABELS[key],
          aggregatePercent: null,
          aggregateTier: "unknown",
          missing: true,
          bars: [
            {
              key: "spacing",
              label: "Point spacing",
              percent: null,
              tier: "unknown",
              quantityValue: "—",
              quantityUnit: "",
              summary: "No persisted metrics",
            },
            {
              key: "snr",
              label: "Signal-to-noise ratio",
              percent: null,
              tier: "unknown",
              quantityValue: "—",
              quantityUnit: "",
              summary: "No persisted metrics",
            },
            {
              key: "norm_distance",
              label: "Normalization fit",
              percent: null,
              tier: "unknown",
              quantityValue: "—",
              quantityUnit: "",
              summary: "No persisted metrics",
            },
          ],
        };
      }

      const spacingEv = finiteNumber(row.point_spacing_ev);
      const snr = finiteNumber(row.snr);
      const normDist = finiteNumber(row.normalization_target_distance);

      const spacingPct =
        spacingEv != null ? spacingEvToPercent(spacingEv) : null;
      const snrPct = snr != null ? snrToPercent(snr) : null;
      const normPct =
        normDist != null ? normalizationMeanDeviationToPercent(normDist) : null;

      const storedContrib = finiteNumber(row.channel_contribution_score);
      const aggregatePercent =
        storedContrib != null && storedContrib >= 0 && storedContrib <= 100
          ? storedContrib
          : combinePercentsMean([spacingPct, snrPct, normPct]);

      const spacingSummary =
        spacingEv != null
          ? "Mean ΔE between consecutive energies where this channel has finite samples."
          : "Need at least two finite samples on distinct energies for this channel.";
      const snrSummary =
        snr != null
          ? "Mean(|y|) / σ(y) over finite samples for this channel."
          : "No finite amplitude samples for this channel.";
      const normSummary =
        normDist != null
          ? "Mean absolute deviation from pre-edge target 0 and post-edge target 1 inside declared ranges."
          : normalizationRangesPresent
            ? "No finite samples in declared ranges for this channel."
            : "Declare normalization ranges to score edge-anchor consistency.";

      const bars: NexafsBrowseDatasetMetricBarModel[] = [
        {
          key: "spacing",
          label: "Point spacing",
          percent: spacingPct,
          tier: tierFromPercentOrUnknown(spacingPct),
          quantityValue:
            spacingEv != null ? spacingEv.toFixed(3) : "—",
          quantityUnit: spacingEv != null ? "eV" : "",
          summary: spacingSummary,
        },
        {
          key: "snr",
          label: "Signal-to-noise ratio",
          percent: snrPct,
          tier: tierFromPercentOrUnknown(snrPct),
          quantityValue: snr != null ? snr.toFixed(2) : "—",
          quantityUnit: "",
          summary: snrSummary,
        },
        {
          key: "norm_distance",
          label: "Normalization fit",
          percent: normPct,
          tier: tierFromPercentOrUnknown(normPct),
          quantityValue: normDist != null ? normDist.toFixed(4) : "—",
          quantityUnit: "",
          summary: normSummary,
        },
      ];

      const usableParts = [spacingPct, snrPct, normPct];
      const missing =
        combinePercentsMean(usableParts) == null &&
        (storedContrib == null ||
          !Number.isFinite(storedContrib));

      return {
        key,
        label: CHANNEL_LABELS[key],
        aggregatePercent,
        aggregateTier: tierFromPercentOrUnknown(aggregatePercent),
        missing,
        bars,
      };
    });

  const experimentAggregatePercent = combinePercentsMean(
    channels.map((c) => c.aggregatePercent),
  );

  return {
    experimentAggregatePercent,
    experimentAggregateTier: tierFromPercentOrUnknown(
      experimentAggregatePercent,
    ),
    normalizationRangesPresent,
    channels,
  };
}
