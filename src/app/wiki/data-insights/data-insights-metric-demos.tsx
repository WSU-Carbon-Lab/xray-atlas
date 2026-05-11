/**
 * Deterministic toy samples demonstrating population metric visualization without live Speed Insights API calls.
 */

import type { ReactElement } from "react";
import { PopulationMetricBlock } from "~/components/metrics";
import { summarizeFinitePopulation } from "~/lib/population-statistics";

const TOY_RES_SCORES = [82, 84, 86, 83, 87, 85, 88, 84, 89, 83] as const;

const TOY_LCP_MS = [2100, 1950, 1880, 2200, 2050, 1980, 2140, 1905] as const;

const TOY_INP_MS = [180, 165, 210, 155, 172, 188, 160, 205] as const;

const TOY_CLS = [0.08, 0.05, 0.12, 0.06, 0.09, 0.04, 0.11, 0.07] as const;

function medianOnly(values: readonly number[]): number {
  const summary = summarizeFinitePopulation(values, {
    median: true,
    quantiles: [],
  });
  return summary?.median ?? 0;
}

const TOY_LCP_MEDIAN_MS = medianOnly(TOY_LCP_MS);
const TOY_INP_MEDIAN_MS = medianOnly(TOY_INP_MS);
const TOY_CLS_MEDIAN = medianOnly(TOY_CLS);

/**
 * Renders illustrative RES and Core Web Vitals-style metric cards backed solely by fixed toy populations.
 */
export function DataInsightsMetricDemos(): ReactElement {
  return (
    <div className="space-y-6">
      <PopulationMetricBlock
        headingId="demo-toy-res-population"
        title="Toy RES-style deployment scores"
        description="Fixed pseudo scores mimicking how Speed Insights aggregates partial metrics before blending into a headline RES-style figure."
        population={{ values: [...TOY_RES_SCORES] }}
        statistics={{
          median: true,
          quantiles: [
            { q: 0.25, label: "P25" },
            { q: 0.75, label: "P75" },
          ],
          showMinMaxTicks: true,
        }}
        band={{ kind: "iqr", lowerQ: 0.25, upperQ: 0.75 }}
        hero={{
          kind: "percentGauge",
          percent: 86,
          strokeClassName: "stroke-accent",
          trackClassName: "stroke-muted",
          ariaLabel: "Illustrative composite score 86 out of 100",
        }}
        footerNote="Synthetic data for layout review only. Production RES values remain in the Vercel Speed Insights dashboard."
      />

      <div>
        <h3 className="text-foreground mb-3 text-base font-semibold">
          Toy Core Web Vitals populations (milliseconds or unitless)
        </h3>
        <p className="text-muted mb-4 text-xs leading-snug">
          Each card fixes a deterministic population so percentile bands and medians are reproducible in docs previews.
          These numbers do not read from Speed Insights or Google CrUX.
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          <PopulationMetricBlock
            headingId="demo-toy-lcp"
            title="Largest Contentful Paint (toy ms)"
            population={{ values: [...TOY_LCP_MS] }}
            statistics={{
              median: true,
              quantiles: [
                { q: 0.25, label: "P25" },
                { q: 0.75, label: "P75" },
              ],
              showMinMaxTicks: true,
            }}
            band={{ kind: "medianToQuantile", upperQ: 0.75 }}
            hero={{
              kind: "numeric",
              value: TOY_LCP_MEDIAN_MS,
              decimals: 0,
              suffix: " ms median",
            }}
            footerNote="Median positions the marker; shaded span runs from the median to the toy P75 toward slower sessions."
          />
          <PopulationMetricBlock
            headingId="demo-toy-inp"
            title="Interaction to Next Paint (toy ms)"
            population={{ values: [...TOY_INP_MS] }}
            statistics={{
              median: true,
              quantiles: [
                { q: 0.25, label: "P25" },
                { q: 0.75, label: "P75" },
              ],
              showMinMaxTicks: true,
            }}
            band={{ kind: "iqr" }}
            hero={{
              kind: "numeric",
              value: TOY_INP_MEDIAN_MS,
              decimals: 0,
              suffix: " ms median",
            }}
            footerNote="IQR band highlights the middle 50% of the toy interaction delays."
          />
          <PopulationMetricBlock
            headingId="demo-toy-cls"
            title="Cumulative Layout Shift (toy score)"
            population={{ values: [...TOY_CLS] }}
            statistics={{
              median: true,
              quantiles: [
                { q: 0.25, label: "P25" },
                { q: 0.75, label: "P75" },
              ],
              showMinMaxTicks: true,
            }}
            band={{ kind: "iqr" }}
            hero={{
              kind: "numeric",
              value: TOY_CLS_MEDIAN,
              decimals: 3,
              suffix: " median",
            }}
            footerNote="Unitless CLS draws use the same primitives as timing metrics; domains auto-expand around the toy extrema."
          />
        </div>
      </div>
    </div>
  );
}
