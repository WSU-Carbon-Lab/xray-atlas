/**
 * About segment outlining dataset layering across molecules, experiments, spectra,
 * and provenance signals exposed through query APIs.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { site } from "~/app/brand";

export const metadata: Metadata = {
  title: "Data Representation and Structure",
  description:
    `How ${site.name} represents molecules, samples, experiments, and spectroscopy traces for robust querying and scientific reuse.`,
  alternates: {
    canonical: "/wiki/data-representation",
  },
};

export default function DataRepresentationPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <h1 className="text-foreground text-4xl font-bold">
        Data representation and structure
      </h1>
      <p className="text-muted">
        {site.name} stores spectroscopy records so users can query both
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
          <p className="text-muted mt-2 text-sm">
            See{" "}
            <Link
              href="/wiki/data-representation/input-spectroscopy"
              className="text-accent hover:underline"
            >
              Input spectroscopy
            </Link>{" "}
            for uploads and columns, and{" "}
            <Link
              href="/wiki/data-representation/optical-constants"
              className="text-accent hover:underline"
            >
              Optical constant components
            </Link>{" "}
            for beta, delta, and optional browser-side Kramers–Kronig derivation.
          </p>
        </section>
        <section className="border-border bg-surface rounded-lg border p-4">
          <h2
            id="input-spectroscopy-summary"
            className="text-foreground mb-2 text-lg font-semibold"
          >
            Input spectroscopy (detail)
          </h2>
          <p className="text-muted text-sm">
            Energy grids, mapped CSV columns, and geometry metadata for angle-resolved traces.
          </p>
          <p className="text-muted mt-2 text-sm">
            <Link
              href="/wiki/data-representation/input-spectroscopy"
              className="text-accent hover:underline"
            >
              Open the input spectroscopy page
            </Link>
          </p>
        </section>
        <section className="border-border bg-surface rounded-lg border p-4">
          <h2
            id="optical-constants-summary"
            className="text-foreground mb-2 text-lg font-semibold"
          >
            Optical constant components (detail)
          </h2>
          <p className="text-muted text-sm">
            Beta, mu, optical density, and optional delta including KK lineage and makima
            alignment to the upload energy axis.
          </p>
          <p className="text-muted mt-2 text-sm">
            <Link
              href="/wiki/data-representation/optical-constants"
              className="text-accent hover:underline"
            >
              Open the optical constant components page
            </Link>
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
        <Link href="/browse/molecules" className="text-accent hover:underline">
          molecule browse
        </Link>
        {" "}for identity and composition filters,{" "}
        <Link href="/browse/nexafs" className="text-accent hover:underline">
          NEXAFS browse
        </Link>
        {" "}for edge and geometry comparisons, and{" "}
        <Link href="/wiki/contributions" className="text-accent hover:underline">
          contribution guidelines
        </Link>
        {" "}for metadata completeness before upload.
      </p>
    </div>
  );
}
