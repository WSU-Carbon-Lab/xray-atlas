"use client";

import {
  MetricHeroSummary,
  MetricTierSegmentedBar,
  type MetricTierSegmentSpec,
} from "~/components/metrics";
import { tierValueTextClass } from "~/lib/nexafs-dataset-metric-policy";

const DEMO_HEADING_ID = "demo-spacing-distribution-body";

/**
 * Fixed illustrative shares for wiki documentation (not from uploads). Adjacent-ΔE tier thresholds match browse
 * `ResolutionDistributionTrace` and `nexafs-dataset-metric-display-model` (great / good / OK / bad).
 */
const ILLUSTRATIVE_SPACING_SEGMENTS: readonly MetricTierSegmentSpec[] = [
  {
    id: "great",
    label: "Great",
    percent: 65,
    rangeDescription: "adjacent spacing below 0.1 eV",
    variant: "hyperfine",
  },
  {
    id: "good",
    label: "Good",
    percent: 30,
    rangeDescription: "spacing from 0.1 eV to 1 eV",
    variant: "good",
  },
  {
    id: "ok",
    label: "OK",
    percent: 3,
    rangeDescription: "spacing from 1 eV to 5 eV",
    variant: "fair",
  },
  {
    id: "bad",
    label: "Bad",
    percent: 2,
    rangeDescription: "spacing above 5 eV",
    variant: "coarse",
  },
] as const;

const ILLUSTRATIVE_P75_EV = 0.35;

const P75_MARKER_ALONG_BAR_PERCENT = 75;

const APP_SPACING_TIER_ROWS = [
  { name: "Great", threshold: "< 0.1 eV" },
  { name: "Good", threshold: "0.1 eV to 1 eV" },
  { name: "OK", threshold: "1 eV to 5 eV" },
  { name: "Bad", threshold: "> 5 eV" },
] as const;

/**
 * Wiki illustration of adjacent energy spacing population shares and P75 marker using the same tier thresholds as
 * browse cards.
 */
export function SpectralSpacingDemo() {
  return (
    <section
      className="border-border bg-surface rounded-xl border p-4 shadow-sm"
      aria-labelledby={DEMO_HEADING_ID}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <h3
            id={DEMO_HEADING_ID}
            className="text-foreground text-sm font-semibold"
          >
            Adjacent spacing distribution (illustrative)
          </h3>
          <p className="text-muted text-xs leading-snug">
            Segment widths use fixed documentation shares (65% / 30% / 3% / 2%; tail 5% across OK and bad). Hover or
            focus a segment for share and range; Tab and arrows move between segments. The marker shows an illustrative
            P75 on the share scale.
          </p>
          <div className="text-[11px] leading-snug">
            <div className="text-muted font-medium">App tiers (adjacent ΔE)</div>
            <ul className="mt-1 space-y-0.5">
              {APP_SPACING_TIER_ROWS.map((row) => (
                <li key={row.name} className="flex flex-wrap gap-x-2 gap-y-0">
                  <span className="text-foreground font-medium">{row.name}</span>
                  <span className="text-muted">{row.threshold}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <MetricHeroSummary
          className="shrink-0 justify-end text-right"
          hero={{
            kind: "numeric",
            value: ILLUSTRATIVE_P75_EV,
            decimals: 3,
            suffix: " eV",
            valueClassName: tierValueTextClass("good"),
          }}
        />
      </div>
      <MetricTierSegmentedBar
        segments={ILLUSTRATIVE_SPACING_SEGMENTS}
        aria-label="Illustrative adjacent spacing tier shares matching browse thresholds"
        marker={{
          percentAlongBar: P75_MARKER_ALONG_BAR_PERCENT,
          ariaLabel: `Illustrative P75 spacing ${ILLUSTRATIVE_P75_EV.toFixed(3)} eV on population share scale`,
        }}
        className="mt-1"
      />
      <p className="text-muted mt-3 text-[11px] leading-snug">
        Illustrative values for documentation; not computed from live spectra.
      </p>
    </section>
  );
}
