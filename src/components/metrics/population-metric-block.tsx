/**
 * Composable card stacking population summaries, optional heroes, and {@link MetricDistributionBar}.
 */

import { cn } from "@heroui/styles";
import { MetricDistributionBar } from "./metric-distribution-bar";
import { MetricHeroSummary } from "./metric-hero";
import type {
  MetricDistributionBandMode,
  MetricHeroConfig,
  MetricPopulationInput,
  MetricPopulationStatisticsConfig,
} from "./types";

export type PopulationMetricBlockProps = {
  readonly title: string;
  readonly description?: string;
  readonly population: MetricPopulationInput;
  readonly statistics?: MetricPopulationStatisticsConfig;
  readonly band: MetricDistributionBandMode;
  readonly domain?: { readonly min: number; readonly max: number };
  readonly hero?: MetricHeroConfig;
  /** Shown under the bar (units, methodology caveats, synthetic data disclaimers). */
  readonly footerNote?: string;
  /** Stable document fragment identifier for the heading; defaults to a slug derived from the title text. */
  readonly headingId?: string;
  readonly className?: string;
};

function slugifyHeadingId(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.length > 0 ? base : "metric-heading";
}

/**
 * Presents a titled metric card with optional hero, finite-sample quantile banding, and contextual footnotes.
 *
 * @param population Raw draws backing ordered statistics; non-finite samples are ignored.
 * @param band Chooses IQR shading versus median-to-upper-quantile emphasis for skewed telemetry.
 * @param hero Optional dominant numeric or gauge headline rendered above the distribution bar.
 */
export function PopulationMetricBlock({
  title,
  description,
  population,
  statistics,
  band,
  domain,
  hero,
  footerNote,
  headingId,
  className,
}: PopulationMetricBlockProps) {
  const resolvedHeadingId = headingId ?? slugifyHeadingId(title);

  return (
    <section
      className={cn(
        "border-border bg-surface rounded-xl border p-4 shadow-sm",
        className,
      )}
      aria-labelledby={resolvedHeadingId}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3
            id={resolvedHeadingId}
            className="text-foreground text-sm font-semibold"
          >
            {title}
          </h3>
          {description ? (
            <p className="text-muted text-xs leading-snug">{description}</p>
          ) : null}
        </div>
        {hero ? <MetricHeroSummary hero={hero} /> : null}
      </div>
      <MetricDistributionBar
        population={population}
        statistics={statistics}
        band={band}
        domain={domain}
        className="mt-1"
      />
      {footerNote ? (
        <p className="text-muted mt-3 text-[11px] leading-snug">{footerNote}</p>
      ) : null}
    </section>
  );
}
