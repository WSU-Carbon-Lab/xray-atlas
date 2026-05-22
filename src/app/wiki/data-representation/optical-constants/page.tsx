/**
 * Wiki guide for persisted optical constants, browse plot views, and KK delta lineage.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { site } from "~/app/brand";
import { loadWikiOpticalConstantsExample } from "~/lib/wiki-optical-constants-example-data";
import { WIKI_OPTICAL_CONSTANTS_SHOWCASE_EXPERIMENT_ID } from "~/lib/wiki-optical-constants-showcase-id";
import { WikiOpticalConstantsPlotEmbed } from "./wiki-optical-constants-plot-embed";

export const metadata: Metadata = {
  title: "Optical constants and plot views",
  description: `How ${site.name} stores beta, delta, and related channels; interactive browse-style plot example; Kramers-Kronig and makima notes.`,
  alternates: {
    canonical: "/wiki/data-representation/optical-constants",
  },
};

export default async function WikiOpticalConstantsPage() {
  const exampleResult = await loadWikiOpticalConstantsExample();

  return (
    <div className="w-full min-w-0 space-y-6">
      <div id="optical-constants" className="sr-only" aria-hidden>
        Optical constants and plot views
      </div>
      <h1 className="text-foreground text-4xl font-bold">
        Optical constants and plot views
      </h1>
      <p className="text-muted max-w-none text-sm leading-relaxed">
        Browse dataset plots read persisted <code className="text-foreground">spectrumpoints</code>{" "}
        as stored at upload (or recalculate). The example below is a fixed public dataset from the
        NEXAFS catalog; upload column mapping is in{" "}
        <Link
          href="/wiki/data-representation/input-spectroscopy"
          className="text-accent hover:underline"
        >
          Input spectroscopy
        </Link>
        .
      </p>

      <section
        id="example-spectrum-plot"
        className="border-border bg-surface rounded-lg border p-4"
      >
        <h2 className="text-foreground mb-2 text-lg font-semibold">
          Example spectrum
        </h2>
        {exampleResult.ok ? (
          <>
            <p className="text-muted text-sm leading-relaxed">
              {exampleResult.data.caption.moleculeDisplayName}
              {exampleResult.data.caption.moleculeSynonym
                ? ` (${exampleResult.data.caption.moleculeSynonym})`
                : null}
              , {exampleResult.data.caption.edgeLabel},{" "}
              {exampleResult.data.caption.experimentTypeLabel}
              {exampleResult.data.caption.facilityLabel
                ? ` at ${exampleResult.data.caption.facilityLabel}`
                : null}{" "}
              ({exampleResult.data.caption.instrumentLabel}
              {exampleResult.data.caption.geometrySummary
                ? `; ${exampleResult.data.caption.geometrySummary}`
                : null}
              ). Formula{" "}
              <code className="text-foreground">
                {exampleResult.data.caption.chemicalFormula}
              </code>{" "}
              enables derived f, epsilon, and chi channels (
              {exampleResult.data.caption.pointCount} samples).
            </p>
            <WikiOpticalConstantsPlotEmbed />
            <p className="text-muted mt-3 text-sm">
              <span className="text-foreground font-medium">How to use:</span> use the left{" "}
              <span className="text-foreground font-medium">data-view rail</span> to switch
              spectroscopy, imaginary (beta), and real (delta) trays. Above the rail, toggle{" "}
              <span className="text-foreground font-medium">difference</span> (Δ) to subtract one
              geometry from another when multiple polarizations are stored, and{" "}
              <span className="text-foreground font-medium">link mode</span> to overlay paired
              channels (for example beta with delta) on one axis. Open the same dataset in{" "}
              <Link href="/browse/nexafs" className="text-accent hover:underline">
                Browse NEXAFS
              </Link>{" "}
              when it appears in your deployment.
            </p>
          </>
        ) : (
          <p className="text-muted text-sm leading-relaxed" role="status">
            The configured showcase experiment (
            <code className="text-foreground">
              {WIKI_OPTICAL_CONSTANTS_SHOWCASE_EXPERIMENT_ID}
            </code>
            ) is not available in this database (missing row, empty chemical formula, or fewer
            than four spectrum rows with finite beta and delta). Seed or import that dataset, or
            open{" "}
            <Link href="/browse/nexafs" className="text-accent hover:underline">
              Browse NEXAFS
            </Link>{" "}
            when it appears in your deployment.
          </p>
        )}
      </section>

      <section
        id="kramers-kronig-and-makima"
        className="border-border bg-surface rounded-lg border p-4"
      >
        <h2 className="text-foreground mb-2 text-lg font-semibold">
          Kramers-Kronig delta and interpolation
        </h2>
        <p className="text-muted text-sm leading-relaxed">
          Optional in-app <span className="text-foreground font-medium">delta</span> from stored{" "}
          <span className="text-foreground font-medium">beta</span> follows the kkcalc numerical
          approach of{" "}
          <a
            href="https://opg.optica.org/oe/fulltext.cfm?uri=oe-22-19-23628"
            className="text-accent hover:underline"
            rel="noopener noreferrer"
          >
            Ben Watts (<em>Optics Express</em> 22, 23628)
          </a>
          , adapted for browser execution. When the KK grid differs from the uploaded energy
          samples, delta is mapped onto the spectrum axis with{" "}
          <span className="text-foreground font-medium">modified Akima (makima)</span> (
          <a
            href="https://opg.optica.org/osac/abstract.cfm?uri=osac-4-5-1497"
            className="text-accent hover:underline"
            rel="noopener noreferrer"
          >
            <em>OSA Continuum</em> summary
          </a>
          ).
        </p>
        <p className="text-muted mt-3 text-sm leading-relaxed">
          KK runs in your browser during NEXAFS upload when you opt in, or when an authorized user
          triggers recalculate on a dataset panel. Values persist on{" "}
          <code className="text-foreground">spectrumpoints.delta</code> with optional{" "}
          <code className="text-foreground">kk_delta_metadata</code> on the experiment row.
        </p>
      </section>

      <p className="text-muted text-sm">
        Related:{" "}
        <Link href="/wiki/data-representation" className="text-accent hover:underline">
          Data representation overview
        </Link>
        ,{" "}
        <Link href="/browse/nexafs" className="text-accent hover:underline">
          Browse NEXAFS
        </Link>
        .
      </p>
    </div>
  );
}
