/**
 * Wiki guide for NEXAFS browse dataset quality headline metrics and tooltip breakdown.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { site } from "~/app/brand";

export const metadata: Metadata = {
  title: "Dataset Quality Metrics",
  description: `How ${site.name} summarizes spectral resolution, SNR, normalization fits, and missing-statistic penalties on NEXAFS browse and molecule-detail cards.`,
  alternates: {
    canonical: "/wiki/platform-features/dataset-quality-metrics",
  },
};

export default function DatasetQualityMetricsWikiPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <h1 className="text-foreground text-4xl font-bold">Dataset quality metrics</h1>
      <p className="text-muted">
        NEXAFS grouped browse and experiment cards surface a single dataset-level quality control so you can
        compare uploads at a glance. The circular headline summarizes several diagnostics; opening the tooltip
        breaks down each component and explains why a row may show a dash instead of a numeric score.
      </p>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="headline-score" className="text-foreground mb-2 text-lg font-semibold">
          Headline score
        </h2>
        <p className="text-muted text-sm">
          The ring reports a value on a 0–100 scale derived from the finite metrics currently available for that
          dataset. Resolution contributes via the energy-spacing model described below (including diminishing returns
          when spacing is far finer than the reference). Signal-to-noise and each normalization fit contribute their
          own 0–100 subscores when data allow. Each of three optional slots—SNR, OD normalization fit, and
          mass-absorption normalization fit—that cannot be scored reduces the headline by five points before the
          result is clamped to the display range.
        </p>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="energy-resolution" className="text-foreground mb-2 text-lg font-semibold">
          Energy resolution distribution
        </h2>
        <p className="text-muted text-sm">
          Adjacent energy spacing along the canonical polarization trace is classified into population tiers: great
          (below 0.1 eV), good (0.1–1 eV), OK (1–5 eV), and bad (above 5 eV). The tooltip shows this distribution as a
          segmented trace. The 75th percentile spacing (P75 ΔE) appears as the hero quantity in eV and positions a
          marker along the bar. The resolution subscore uses a decade-relative mapping anchored at 0.1 eV so equal
          ratios in spacing move the score by equal amounts, rather than a simple inverse linear scale.
        </p>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="signal-to-noise" className="text-foreground mb-2 text-lg font-semibold">
          Signal-to-noise ratio
        </h2>
        <p className="text-muted text-sm">
          SNR is evaluated on uploaded absorption using uploaded uncertainty when finite positive error bars exist on
          those samples. If the spectrum has no usable error bars, SNR is intentionally omitted—the tooltip explains
          that state rather than fabricating a variance estimate.
        </p>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="normalization-fits" className="text-foreground mb-2 text-lg font-semibold">
          Normalization fits (OD and mass absorption)
        </h2>
        <p className="text-muted text-sm">
          When contributors declare pre-edge and post-edge energy windows, the platform measures how closely the optical
          density trace matches nominal anchors (0 in the pre-edge window and 1 in the post-edge window), and does the
          same independently for mass absorption. Missing windows mean both fits are unavailable and the tooltip flags
          that pre-edge and post-edge regions were not supplied.
        </p>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="missing-rows" className="text-foreground mb-2 text-lg font-semibold">
          Missing metrics in the tooltip
        </h2>
        <p className="text-muted text-sm">
          When a statistic cannot be scored, the breakdown shows a neutral skeleton bar, an em dash instead of a numeric
          headline for that row, and amber guidance text summarizing the reason (for example absent error bars or
          absent normalization ranges). Energy resolution may be omitted entirely when there are not enough points to
          estimate an adjacent-spacing distribution.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/browse/nexafs"
          className="bg-accent text-accent-foreground rounded-lg px-4 py-2 text-sm font-medium"
        >
          Browse NEXAFS
        </Link>
        <Link
          href="/wiki/platform-features"
          className="border-border bg-surface text-foreground rounded-lg border px-4 py-2 text-sm font-medium"
        >
          Platform features overview
        </Link>
      </div>
    </div>
  );
}
