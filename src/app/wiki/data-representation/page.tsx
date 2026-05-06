/**
 * About segment outlining dataset layering across molecules, experiments, spectra,
 * and provenance signals exposed through query APIs.
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Data Representation and Structure",
  description:
    "How Xray Atlas represents molecules, samples, experiments, and spectroscopy traces for robust querying and scientific reuse.",
};

export default function DataRepresentationPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <h1 className="text-foreground text-4xl font-bold">
        Data representation and structure
      </h1>
      <p className="text-muted">
        Xray Atlas stores spectroscopy records so users can query both
        scientific content and experimental provenance. Dataset pages combine
        molecules, spectrum traces, and metadata in one navigable model.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="border-border bg-surface rounded-lg border p-4">
          <h2
            id="molecule-and-sample-layer"
            className="text-foreground mb-2 text-lg font-semibold"
          >
            Molecule and sample layer
          </h2>
          <p className="text-muted text-sm">
            Names, synonyms, formulas, identifiers, and sample descriptors are
            stored to support name-driven and chemistry-driven discovery.
          </p>
        </section>
        <section className="border-border bg-surface rounded-lg border p-4">
          <h2
            id="experiment-metadata-layer"
            className="text-foreground mb-2 text-lg font-semibold"
          >
            Experiment metadata layer
          </h2>
          <p className="text-muted text-sm">
            Facility, instrument, edge, geometry, and detection metadata provide
            context required for interpretation and comparison.
          </p>
        </section>
        <section className="border-border bg-surface rounded-lg border p-4">
          <h2
            id="spectrum-trace-layer"
            className="text-foreground mb-2 text-lg font-semibold"
          >
            Spectrum trace layer
          </h2>
          <p className="text-muted text-sm">
            Energy-intensity data and optional derived fields are persisted so
            users can inspect, compare, and export raw and processed traces.
          </p>
        </section>
        <section className="border-border bg-surface rounded-lg border p-4">
          <h2
            id="provenance-and-attribution-layer"
            className="text-foreground mb-2 text-lg font-semibold"
          >
            Provenance and attribution layer
          </h2>
          <p className="text-muted text-sm">
            Contributor and citation context support reproducibility and proper
            credit for data reuse.
          </p>
        </section>
      </div>
      <p className="text-muted">
        To query these fields directly, start with{" "}
        <Link href="/browse" className="text-accent hover:underline">
          the browse interface
        </Link>
        .
      </p>
    </div>
  );
}
