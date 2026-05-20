/**
 * Wiki subtopic describing stored optical and absorption-related channels, including KK delta.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { site } from "~/app/brand";

export const metadata: Metadata = {
  title: "Optical constant components",
  description: `How ${site.name} stores beta, mu, optical density, and optional Kramers–Kronig delta on spectrum rows, with browser-side KK aligned to the upload energy grid.`,
  alternates: {
    canonical: "/wiki/data-representation/optical-constants",
  },
};

export default function WikiOpticalConstantsPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <div id="optical-constants" className="sr-only" aria-hidden>
        Optical constant components
      </div>
      <h1 className="text-foreground text-4xl font-bold">Optical constant components</h1>
      <p className="text-muted">
        Near-edge spectra in {site.name} can carry several mutually related representations of
        the same measurement: for example optical density, mass absorption coefficient{" "}
        <span className="text-foreground font-medium">mu</span>, and the imaginary part of the
        complex refractive index proxy{" "}
        <span className="text-foreground font-medium">beta</span>. When present, a real-part
        companion <span className="text-foreground font-medium">delta</span> can be attached
        per energy sample on the same <code className="text-foreground">spectrumpoints</code>{" "}
        rows as the rest of the trace.
      </p>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2
          id="channel-overview"
          className="text-foreground mb-2 text-lg font-semibold"
        >
          Channels on each point
        </h2>
        <p className="text-muted text-sm">
          Optional floats include <code className="text-foreground">od</code>,{" "}
          <code className="text-foreground">massabsorption</code>,{" "}
          <code className="text-foreground">beta</code>, and{" "}
          <code className="text-foreground">delta</code> (with{" "}
          <code className="text-foreground">deltaerr</code> reserved for future uncertainty).
          Browse and plot rails let readers switch which channel drives the vertical axis when
          data exist for that channel.
        </p>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2
          id="kramers-kronig-and-makima"
          className="text-foreground mb-2 text-lg font-semibold"
        >
          Kramers–Kronig delta and interpolation
        </h2>
        <p className="text-muted text-sm">
          The in-app Kramers-Kronig routine that estimates{" "}
          <span className="text-foreground font-medium">delta</span> from stored{" "}
          <span className="text-foreground font-medium">beta</span> follows the numerical
          approach of the kkcalc by{" "}
          <a
            href="https://opg.optica.org/oe/fulltext.cfm?uri=oe-22-19-23628"
            className="text-accent hover:underline"
          >
            <span className="text-foreground font-medium">Ben Watts</span>
          </a>
          , adapted to TypeScript for browser execution. When the KK estimate is not already
          on the identical energy samples as the uploaded spectrum, the app uses a{" "}
          <span className="text-foreground font-medium">modified Akima (makima)</span>{" "}
          piecewise interpolation to map delta onto the originating spectral energy axis so
          every persisted row shares the same <code className="text-foreground">energyev</code>{" "}
          as the rest of the dataset.
        </p>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2
          id="browser-execution"
          className="text-foreground mb-2 text-lg font-semibold"
        >
          Browser execution
        </h2>
        <p className="text-muted text-sm">
          Integrals run entirely in the contributor or maintainer browser during NEXAFS upload
          (optional checkbox on the contribute flow) or when an authorized user triggers the
          small recalculation control on an experiment dataset panel. No Python runtime
          participates in the production path.
        </p>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2
          id="consent"
          className="text-foreground mb-2 text-lg font-semibold"
        >
          Consent and session scope
        </h2>
        <p className="text-muted text-sm">
          Before the first heavy pass in a browser session, the app shows an explicit consent
          dialog. Accepting stores a session-only flag in{" "}
          <code className="text-foreground">sessionStorage</code> so later uploads or
          recalculations in the same tab session do not re-prompt until the session clears.
          Cancelling or closing the dialog blocks the calculation for that attempt.
        </p>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2
          id="persistence"
          className="text-foreground mb-2 text-lg font-semibold"
        >
          Persistence and authorization
        </h2>
        <p className="text-muted text-sm">
          Computed values are written to the <code className="text-foreground">delta</code> column
          on <code className="text-foreground">spectrumpoints</code> rows alongside the other
          channels. Uploads include <code className="text-foreground">delta</code> in the same
          create payload as other per-point fields when the user opts in. The recalculate
          mutation accepts only point ids that belong to the target experiment and requires the
          caller to be the experiment uploader, a user listed in{" "}
          <code className="text-foreground">collected_by_user_ids</code>, a molecule contributor
          on the parent sample, or a privileged administrator-style role.
        </p>
        <p className="text-muted mt-3 text-sm">
          Each experiment may store <code className="text-foreground">kk_delta_metadata</code>{" "}
          (JSON on <code className="text-foreground">experiments</code>) recording how the
          current <code className="text-foreground">delta</code> column was produced: an uploaded
          column at ingest, KK at upload, or a later browser recalculate from{" "}
          <code className="text-foreground">beta</code>. The record includes an ISO{" "}
          <code className="text-foreground">calculatedAt</code> timestamp, optional{" "}
          <code className="text-foreground">calculatedByUserId</code>, engine label, and a short
          note that recalculated delta overwrites prior values for the persisted point ids in
          that batch.
        </p>
      </section>
    </div>
  );
}
