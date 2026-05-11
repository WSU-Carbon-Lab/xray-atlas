/**
 * Headline numeric or gauge summaries paired with distribution bars.
 */

import { cn } from "@heroui/styles";
import { MetricPercentGaugeRing } from "./metric-percent-gauge-ring";
import type { MetricHeroConfig } from "./types";

export type MetricHeroSummaryProps = {
  readonly hero: MetricHeroConfig;
  readonly className?: string;
};

function formatNumeric(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(decimals);
}

/**
 * Renders the configured hero surface: large numeric text or a percent ring with accessible labeling.
 *
 * @param hero Discriminated configuration for numeric headlines versus gauge arcs.
 */
export function MetricHeroSummary({ hero, className }: MetricHeroSummaryProps) {
  if (hero.kind === "percentGauge") {
    const label =
      hero.ariaLabel ??
      (Number.isFinite(hero.percent)
        ? `Score ${Math.round(Math.min(100, Math.max(0, hero.percent)))} out of 100`
        : "Score unavailable");
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <MetricPercentGaugeRing
          percent={hero.percent}
          missing={!Number.isFinite(hero.percent)}
          sizePx={hero.sizePx ?? 52}
          strokePx={hero.strokePx ?? 3}
          strokeClassName={hero.strokeClassName}
          trackClassName={hero.trackClassName}
          ariaLabel={label}
        />
      </div>
    );
  }

  const decimals = hero.decimals ?? 2;
  const text = formatNumeric(hero.value, decimals);
  const valueTone =
    hero.valueClassName != null && hero.valueClassName.length > 0
      ? hero.valueClassName
      : "text-foreground";

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span
        className={cn(
          "text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl",
          valueTone,
        )}
      >
        {hero.prefix ?? ""}
        {text}
        {hero.suffix ?? ""}
      </span>
    </div>
  );
}
