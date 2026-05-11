/**
 * Wiki topic describing browser-side Kramers–Kronig delta-from-beta handling and persistence.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { site } from "~/app/brand";

export const metadata: Metadata = {
  title: "Kramers–Kronig delta from beta",
  description: `How ${site.name} optionally derives optical delta from stored beta in the browser, consent rules, and where values persist on spectrum rows.`,
  alternates: {
    canonical: "/wiki/data-representation/kramers-kronig-delta",
  },
};

export default function WikiKramersKronigDeltaPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <div id="kramers-kronig-delta" className="sr-only" aria-hidden>
        Kramers–Kronig delta from beta
      </div>
      <h1 className="text-foreground text-4xl font-bold">
        Kramers–Kronig delta from beta
      </h1>
      <p className="text-muted">
        {site.name} can attach a real-part optical proxy{" "}
        <span className="text-foreground font-medium">delta</span> to each
        persisted spectrum row when imaginary{" "}
        <span className="text-foreground font-medium">beta</span> is already
        available on the same photon-energy grid. The numerical approach follows
        the same tabulated-energy pairing idea as the kkcalc Python reference
        (energy ascending; real and imaginary parts evaluated on identical
        abscissae) but uses a compact discrete principal-value sum implemented in
        TypeScript instead of the full piecewise-polynomial atomic scattering merge
        used by kkcalc outside the measurement window.
      </p>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2
          id="browser-execution"
          className="text-foreground mb-2 text-lg font-semibold"
        >
          Browser execution
        </h2>
        <p className="text-muted text-sm">
          Integrals run entirely in the contributor or maintainer browser during
          NEXAFS upload (optional checkbox on the contribute flow) or when an
          authorized user triggers the small &quot;Recalc KK delta&quot; control on
          an experiment dataset panel. No Python runtime participates in the
          production path.
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
          Before the first heavy pass in a browser session, the app shows an
          explicit consent dialog. Accepting stores a session-only flag in{" "}
          <code className="text-foreground">sessionStorage</code> so later uploads
          or recalculations in the same tab session do not re-prompt until the
          session clears. Cancelling or closing the dialog blocks the calculation
          for that attempt.
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
          Computed values are written to the <code className="text-foreground">delta</code>{" "}
          column on <code className="text-foreground">spectrumpoints</code> rows (optional{" "}
          <code className="text-foreground">deltaerr</code> is reserved for future uncertainty
          propagation). Uploads include <code className="text-foreground">delta</code> in the
          same <code className="text-foreground">createWithSpectrum</code> payload as other
          per-point channels. The recalculate mutation accepts only point ids that belong to the
          target experiment and requires the caller to be the experiment uploader, a user listed
          in <code className="text-foreground">collected_by_user_ids</code>, a molecule contributor
          on the parent sample, or a privileged administrator-style role.
        </p>
      </section>

      <p className="text-muted text-sm">
        Related:{" "}
        <Link
          href="/wiki/data-representation"
          className="text-accent hover:underline"
        >
          Data representation overview
        </Link>
        ,{" "}
        <Link href="/contribute/nexafs" className="text-accent hover:underline">
          NEXAFS contribute
        </Link>
        , and issue{" "}
        <a
          href="https://github.com/WSU-Carbon-Lab/xray-atlas/issues/78"
          className="text-accent hover:underline"
        >
          #78
        </a>
        .
      </p>
    </div>
  );
}
