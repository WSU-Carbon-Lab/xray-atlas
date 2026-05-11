/**
 * Wiki guide for NEXAFS browse dataset quality headline metrics and tooltip breakdown.
 */

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { site } from "~/app/brand";
import { SpectralSpacingDemo } from "./spectral-spacing-demo";

export const metadata: Metadata = {
  title: "Dataset Quality Metrics",
  description: `How ${site.name} summarizes spectral resolution, SNR, normalization-fit signals (in development), and missing-statistic penalties on dataset cards.`,
  alternates: {
    canonical: "/wiki/platform-features/dataset-quality-metrics",
  },
};

function WikiSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-border bg-surface rounded-lg border p-4">
      <h2 id={id} className="text-foreground mb-2 text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function DatasetQualityMetricsWikiPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <h1 className="text-foreground text-4xl font-bold">Dataset quality metrics</h1>
      <p className="text-muted">
        Browse and molecule-detail NEXAFS cards show one headline quality ring plus a tooltip breakdown. Missing rows use
        neutral placeholders and short explanations instead of invented numbers.
      </p>

      <WikiSection id="metrics-roadmap" title="Metrics roadmap">
        <p className="text-muted mb-3 text-sm">
          Some signals are still evolving. The items below are planned or in active development; browse cards may show
          interim rows until these stabilize.
        </p>
        <ul className="text-muted list-inside list-disc space-y-2 text-sm">
          <li>
            <strong className="text-foreground font-medium">Normalization fits (OD and mass absorption):</strong>{" "}
            clearer definitions, documentation examples, and richer tooltip copy for how declared pre-edge and post-edge
            windows compare to anchor targets.
          </li>
          <li>
            <strong className="text-foreground font-medium">Worked wiki examples:</strong> optional interactive demos for
            normalization-fit rows and SNR (similar in spirit to the spacing demo below) once definitions are locked.
          </li>
        </ul>
      </WikiSection>

      <WikiSection id="headline-score" title="Headline score">
        <p className="text-muted text-sm">
          The ring is a 0–100 aggregate from whichever subscores are available for that dataset: energy resolution,
          signal-to-noise (when error bars allow), and OD versus mass-absorption normalization fits (when ranges and
          channels allow). The resolution model uses decade-relative spacing scoring; details follow under Energy
          resolution. Each optional slot among SNR, OD normalization fit, and mass-absorption normalization fit that
          cannot be scored applies a five-point penalty before the headline is clamped to the display range.
        </p>
      </WikiSection>

      <WikiSection id="energy-resolution" title="Energy resolution distribution">
        <p className="text-muted text-sm">
          Adjacent channel spacing along the canonical polarization trace is grouped by tier: great (below 0.1 eV), good
          (0.1–1 eV), OK (1–5 eV), and bad (above 5 eV). The tooltip uses a segmented trace and a P75 ΔE headline. The
          resolution subscore uses a mapping anchored at 0.1 eV so equal ratios in spacing move the score similarly across
          decades.
        </p>
      </WikiSection>

      <section className="space-y-3">
        <h2 id="demo-spacing-distribution" className="text-foreground text-lg font-semibold">
          Demo: spacing distribution
        </h2>
        <p className="text-muted text-sm leading-relaxed">
          The interactive bar uses fixed illustrative tier shares (65% / 30% / 3% / 2%) and the same thresholds as in
          Energy resolution distribution; it is not computed from uploaded energies. The P75 value is a documentation
          example aligned with those shares.
        </p>
        <SpectralSpacingDemo />
      </section>

      <WikiSection id="signal-to-noise" title="Signal-to-noise ratio">
        <p className="text-muted text-sm">
          SNR uses uploaded absorption and uncertainty when finite positive error bars exist. Without usable error bars,
          SNR is omitted and the tooltip states why.
        </p>
      </WikiSection>

      <WikiSection id="normalization-fits" title="Normalization fits (OD and mass absorption)">
        <p className="text-muted text-sm">
          Rows aim to summarize how well traces match nominal plateaus in declared windows. Presentation and scoring copy
          are still tightening—see{" "}
          <a href="#metrics-roadmap" className="text-accent font-medium underline-offset-4 hover:underline">
            Metrics roadmap
          </a>
          . Contributors should still supply pre-edge and post-edge ranges when possible so future scoring can consume
          them.
        </p>
      </WikiSection>

      <WikiSection id="missing-rows" title="Missing metrics in the tooltip">
        <p className="text-muted text-sm">
          When a statistic cannot be scored, the row shows a skeleton bar, an em dash instead of a headline number, and
          amber guidance (for example missing error bars or missing normalization windows). Resolution may be omitted if
          there are too few points for an adjacent-spacing distribution.
        </p>
      </WikiSection>

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
