/**
 * Wiki subtopic describing uploaded NEXAFS spectroscopy inputs and how they map into Atlas rows.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { site } from "~/app/brand";

export const metadata: Metadata = {
  title: "Input spectroscopy",
  description: `How ${site.name} ingests NEXAFS energy–intensity tables, auxiliary columns, and geometry metadata into spectrum rows.`,
  alternates: {
    canonical: "/wiki/data-representation/input-spectroscopy",
  },
};

export default function WikiInputSpectroscopyPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <div id="input-spectroscopy" className="sr-only" aria-hidden>
        Input spectroscopy
      </div>
      <h1 className="text-foreground text-4xl font-bold">Input spectroscopy</h1>
      <p className="text-muted">
        {site.name} treats each uploaded trace as a sequence of samples on a photon-energy
        axis. Contributors supply the measured signal and optional auxiliary channels; the
        platform stores them on <code className="text-foreground">spectrumpoints</code>{" "}
        rows keyed by experiment, polarization (when angle-resolved), and monotonic{" "}
        <code className="text-foreground">energyev</code>.
      </p>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2
          id="energy-and-intensity"
          className="text-foreground mb-2 text-lg font-semibold"
        >
          Energy and primary intensity
        </h2>
        <p className="text-muted text-sm">
          Each row carries incident energy in electron volts and a primary absorption-related
          value (for example raw detector signal or a column mapped to{" "}
          <code className="text-foreground">rawabs</code>). The contribute flow validates
          strictly ascending energies so plots, normalization, and exports stay stable.
        </p>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2
          id="auxiliary-columns"
          className="text-foreground mb-2 text-lg font-semibold"
        >
          Auxiliary columns and geometry
        </h2>
        <p className="text-muted text-sm">
          Optional columns such as monitor <code className="text-foreground">i0</code>, optical
          density, mass absorption, and beta can be mapped from CSV headers. Polarization and
          angle metadata attach at the spectrum level so multi-geometry uploads become separate
          traces that share the same experiment metadata.
        </p>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2
          id="derived-on-ingest"
          className="text-foreground mb-2 text-lg font-semibold"
        >
          Derived quantities at ingest
        </h2>
        <p className="text-muted text-sm">
          Contributors may normalize before upload or use in-app steps; whatever is persisted
          is what browse and exports show. Optional client-side transforms (for example
          Kramers–Kronig delta from beta) still write back onto the same energy grid as the
          originating points. See{" "}
          <Link
            href="/wiki/data-representation/optical-constants"
            className="text-accent hover:underline"
          >
            Optical constant components
          </Link>{" "}
          for beta, delta, and related channels.
        </p>
      </section>

      <p className="text-muted text-sm">
        Related:{" "}
        <Link href="/wiki/data-representation" className="text-accent hover:underline">
          Data representation overview
        </Link>
        ,{" "}
        <Link href="/contribute/nexafs" className="text-accent hover:underline">
          NEXAFS contribute
        </Link>
        .
      </p>
    </div>
  );
}
