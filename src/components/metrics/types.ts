/**
 * Shared props contracts for population-backed metric summaries used by wiki demos and future dataset-quality views.
 *
 * Numeric populations are plain finite-sample arrays; callers may later swap in persisted aggregates without changing
 * these surface types.
 */

import type { PopulationQuantileSpec } from "~/lib/population-statistics";

export type MetricPopulationInput = {
  readonly values: readonly number[];
};

export type MetricPopulationStatisticsConfig = {
  /** When omitted or `true`, summaries include the median; set `false` to omit median computation for the headline/bar. */
  readonly median?: boolean;
  /** Additional normalized quantiles in `[0, 1]` (for example `0.25` / `0.75` for quartiles). */
  readonly quantiles?: readonly PopulationQuantileSpec[];
  /** When true, renders thin vertical ticks at the min and max finite samples on the bar track. */
  readonly showMinMaxTicks?: boolean;
};

export type MetricDistributionBandMode =
  | {
      readonly kind: "iqr";
      /** Lower quantile for the shaded band (defaults to `0.25`). */
      readonly lowerQ?: number;
      /** Upper quantile for the shaded band (defaults to `0.75`). */
      readonly upperQ?: number;
    }
  | {
      readonly kind: "medianToQuantile";
      /** Upper quantile anchor for the band endpoint (defaults to `0.75`); the opposite endpoint is the median. */
      readonly upperQ?: number;
    };

export type MetricHeroNumericConfig = {
  readonly kind: "numeric";
  readonly value: number;
  readonly decimals?: number;
  readonly prefix?: string;
  readonly suffix?: string;
  /**
   * Tailwind classes applied to the headline span that wraps prefix, formatted value, and suffix (for example
   * {@link tierValueTextClass} from `~/lib/nexafs-dataset-metric-policy`). When omitted, the headline uses
   * `text-foreground`.
   */
  readonly valueClassName?: string;
};

export type MetricHeroPercentGaugeConfig = {
  readonly kind: "percentGauge";
  /** Value on `[0, 100]` controlling arc fill amount. */
  readonly percent: number;
  readonly strokeClassName?: string;
  readonly trackClassName?: string;
  readonly sizePx?: number;
  readonly strokePx?: number;
  /** Optional screen-reader label; defaults to rounded percent. */
  readonly ariaLabel?: string;
};

export type MetricHeroConfig = MetricHeroNumericConfig | MetricHeroPercentGaugeConfig;
