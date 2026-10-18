import type { ReactElement } from "react";
import Link from "next/link";

/** Contribute entry point with template link. */
export function HomeContributeStrip(): ReactElement {
  return (
    <section className="border-border bg-surface flex flex-col items-start justify-between gap-4 rounded-3xl border p-6 sm:flex-row sm:items-center">
      <div>
        <p className="font-display text-foreground text-xl font-semibold">
          Have spectra?
        </p>
        <p className="text-muted text-sm">
          Upload a CSV and the Atlas normalizes, attributes, and can mint a DOI.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/contribute/nexafs"
          className="home-chip border-accent bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Contribute data
        </Link>
        <Link href="/wiki/atlas/uploading-data/template" className="home-chip">
          CSV template
        </Link>
      </div>
    </section>
  );
}
