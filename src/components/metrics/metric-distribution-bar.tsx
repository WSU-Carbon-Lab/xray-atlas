/**
 * Horizontal distribution bar with shaded quantile band and median marker.
 */

import { cn } from "@heroui/styles";
import {
  finitePopulationSorted,
  paddedPopulationDomain,
  populationValueToBarPercent,
  quantileLinearSorted,
  summarizeFinitePopulation,
} from "~/lib/population-statistics";
import type {
  MetricDistributionBandMode,
  MetricPopulationInput,
  MetricPopulationStatisticsConfig,
} from "./types";

export type MetricDistributionBarProps = {
  readonly population: MetricPopulationInput;
  readonly statistics?: MetricPopulationStatisticsConfig;
  readonly band: MetricDistributionBandMode;
  readonly domain?: { readonly min: number; readonly max: number };
  readonly barHeightClassName?: string;
  readonly className?: string;
  readonly "aria-label"?: string;
};

function quantileFromPopulation(
  population: MetricPopulationInput,
  q: number,
): number | null {
  const base = finitePopulationSorted(population.values);
  if (!base) return null;
  return quantileLinearSorted(base.sorted, q);
}

function bandEndpoints(
  population: MetricPopulationInput,
  band: MetricDistributionBandMode,
): { readonly low: number | null; readonly high: number | null } {
  if (band.kind === "iqr") {
    const loQ = band.lowerQ ?? 0.25;
    const hiQ = band.upperQ ?? 0.75;
    return {
      low: quantileFromPopulation(population, loQ),
      high: quantileFromPopulation(population, hiQ),
    };
  }
  const hiQ = band.upperQ ?? 0.75;
  const med = quantileFromPopulation(population, 0.5);
  const hi = quantileFromPopulation(population, hiQ);
  if (med == null || hi == null) return { low: null, high: null };
  return { low: Math.min(med, hi), high: Math.max(med, hi) };
}

/**
 * Visualizes a finite sample distribution: shaded band (IQR or median-to-quantile span), median tick, optional extrema ticks.
 *
 * @param population Raw numeric draws; non-finite values are ignored per {@link summarizeFinitePopulation}.
 * @param band Controls whether shading follows quartiles or spreads from the median to an upper quantile.
 * @param domain Optional fixed mapping domain; when omitted, expands observed min/max with light padding.
 */
export function MetricDistributionBar({
  population,
  statistics,
  band,
  domain: domainOverride,
  barHeightClassName = "h-2",
  className,
  "aria-label": ariaLabelProp,
}: MetricDistributionBarProps) {
  const statsConfig: MetricPopulationStatisticsConfig = statistics ?? {
    median: true,
    quantiles: [
      { q: 0.25, label: "P25" },
      { q: 0.75, label: "P75" },
    ],
  };
  const summary = summarizeFinitePopulation(population.values, {
    median: statsConfig.median !== false,
    quantiles: statsConfig.quantiles,
  });

  if (!summary || summary.count === 0) {
    return (
      <div
        className={cn(
          "border-border bg-muted/40 w-full rounded-full border",
          barHeightClassName,
          className,
        )}
        role="img"
        aria-label={ariaLabelProp ?? "No finite samples available for distribution bar"}
      />
    );
  }

  const { low: bandLowRaw, high: bandHighRaw } = bandEndpoints(population, band);
  const sortedBase = finitePopulationSorted(population.values);
  const median =
    summary.median ??
    (sortedBase ? quantileLinearSorted(sortedBase.sorted, 0.5) : null);

  const dataMin = summary.min;
  const dataMax = summary.max;
  const domain = domainOverride ?? paddedPopulationDomain(dataMin, dataMax);

  const bandLow =
    bandLowRaw != null
      ? populationValueToBarPercent(bandLowRaw, domain.min, domain.max)
      : null;
  const bandHigh =
    bandHighRaw != null
      ? populationValueToBarPercent(bandHighRaw, domain.min, domain.max)
      : null;
  const medianPct =
    median != null
      ? populationValueToBarPercent(median, domain.min, domain.max)
      : null;

  const left =
    bandLow != null && bandHigh != null ? Math.min(bandLow, bandHigh) : null;
  const right =
    bandLow != null && bandHigh != null ? Math.max(bandLow, bandHigh) : null;
  const width =
    left != null && right != null ? Math.max(right - left, 0.5) : null;

  const minPct = populationValueToBarPercent(summary.min, domain.min, domain.max);
  const maxPct = populationValueToBarPercent(summary.max, domain.min, domain.max);

  const defaultAria = `Distribution of ${summary.count} samples from ${summary.min.toFixed(3)} to ${summary.max.toFixed(3)}`;

  return (
    <div className={cn("relative w-full", className)}>
      <div
        className={cn(
          "border-border bg-muted/50 relative w-full overflow-hidden rounded-full border",
          barHeightClassName,
        )}
        role="img"
        aria-label={ariaLabelProp ?? defaultAria}
      >
        {left != null && width != null ? (
          <div
            className="bg-accent/35 absolute top-0 bottom-0 rounded-full"
            style={{ left: `${left}%`, width: `${width}%` }}
          />
        ) : null}
        {statsConfig.showMinMaxTicks ? (
          <>
            <div
              className="bg-foreground/35 absolute top-0 bottom-0 w-px -translate-x-1/2"
              style={{ left: `${minPct}%` }}
              aria-hidden
            />
            <div
              className="bg-foreground/35 absolute top-0 bottom-0 w-px -translate-x-1/2"
              style={{ left: `${maxPct}%` }}
              aria-hidden
            />
          </>
        ) : null}
        {medianPct != null ? (
          <div
            className="border-foreground bg-background absolute top-1/2 z-[2] h-[140%] w-0.5 -translate-x-1/2 -translate-y-1/2 border-l shadow-sm"
            style={{ left: `${medianPct}%` }}
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );
}
