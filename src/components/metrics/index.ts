/**
 * Population-backed metric primitives: ordered-statistic summaries, horizontal distribution bars, and hero gauges.
 */

export type {
  MetricDistributionBandMode,
  MetricHeroConfig,
  MetricHeroNumericConfig,
  MetricHeroPercentGaugeConfig,
  MetricPopulationInput,
  MetricPopulationStatisticsConfig,
} from "./types";
export type { MetricDistributionBarProps } from "./metric-distribution-bar";
export type { MetricHeroSummaryProps } from "./metric-hero";
export type { MetricPercentGaugeRingProps } from "./metric-percent-gauge-ring";
export type { PopulationMetricBlockProps } from "./population-metric-block";
export type {
  MetricTierSegmentedBarMarker,
  MetricTierSegmentedBarProps,
  MetricTierSegmentSpec,
  MetricTierSegmentVariant,
} from "./metric-tier-segmented-bar";
export { MetricDistributionBar } from "./metric-distribution-bar";
export { MetricHeroSummary } from "./metric-hero";
export { MetricPercentGaugeRing } from "./metric-percent-gauge-ring";
export { PopulationMetricBlock } from "./population-metric-block";
export { MetricTierSegmentedBar } from "./metric-tier-segmented-bar";
