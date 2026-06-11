import Link from "next/link";
import type { ReactElement } from "react";
import { loadWikiOpticalConstantsExample } from "~/lib/wiki-optical-constants-example-data";
import { WIKI_OPTICAL_CONSTANTS_SHOWCASE_EXPERIMENT_ID } from "~/lib/wiki-optical-constants-showcase-id";
import { OpticalConstantsPlotEmbed } from "./optical-constants-plot-embed";

/**
 * Loads the catalog showcase experiment and renders caption, plot embed, and usage copy for wiki MDX.
 */
export async function OpticalConstantsExample(): Promise<ReactElement> {
  const exampleResult = await loadWikiOpticalConstantsExample();

  if (exampleResult.ok) {
    const { caption } = exampleResult.data;
    return (
      <div className="border-border bg-surface rounded-lg border p-4">
        <p className="text-muted text-sm leading-relaxed">
          {caption.moleculeDisplayName}
          {caption.moleculeSynonym
            ? ` (${caption.moleculeSynonym})`
            : null}, {caption.edgeLabel}, {caption.experimentTypeLabel}
          {caption.facilityLabel ? ` at ${caption.facilityLabel}` : null} (
          {caption.instrumentLabel}
          {caption.geometrySummary ? `; ${caption.geometrySummary}` : null}).
          Formula{" "}
          <code className="text-foreground">{caption.chemicalFormula}</code>{" "}
          enables derived f, epsilon, and chi channels ({caption.pointCount}{" "}
          samples).
        </p>
        <OpticalConstantsPlotEmbed />
        <p className="text-muted mt-3 text-sm">
          <span className="text-foreground font-medium">How to use:</span> use
          the left{" "}
          <span className="text-foreground font-medium">data-view rail</span> to
          switch spectroscopy, imaginary (beta), and real (delta) trays. Above
          the rail, toggle{" "}
          <span className="text-foreground font-medium">difference</span> (Δ) to
          subtract one geometry from another when multiple polarizations are
          stored, and{" "}
          <span className="text-foreground font-medium">link mode</span> to
          overlay paired channels (for example beta with delta) on one axis.
          Open the same dataset in{" "}
          <Link href="/browse/nexafs" className="text-accent hover:underline">
            Browse NEXAFS
          </Link>{" "}
          when it appears in your deployment.
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-surface rounded-lg border p-4">
      <p className="text-muted text-sm leading-relaxed" role="status">
        The configured showcase experiment (
        <code className="text-foreground">
          {WIKI_OPTICAL_CONSTANTS_SHOWCASE_EXPERIMENT_ID}
        </code>
        ) is not available in this database (missing row, empty chemical
        formula, or fewer than four spectrum rows with finite beta and delta).
        Seed or import that dataset, or open{" "}
        <Link href="/browse/nexafs" className="text-accent hover:underline">
          Browse NEXAFS
        </Link>{" "}
        when it appears in your deployment.
      </p>
    </div>
  );
}
