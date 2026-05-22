/**
 * Hub table of contents for Data representation child guides.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { site } from "~/app/brand";

export const metadata: Metadata = {
  title: "Data Representation and Structure",
  description:
    `How ${site.name} maps uploaded spectroscopy into persisted traces, optical constants, and browse plot channels.`,
  alternates: {
    canonical: "/wiki/data-representation",
  },
};

interface DataRepresentationChildPage {
  readonly id: string;
  readonly href: string;
  readonly title: string;
  readonly description: string;
}

const childPages: readonly DataRepresentationChildPage[] = [
  {
    id: "input-spectroscopy",
    href: "/wiki/data-representation/input-spectroscopy",
    title: "Input spectroscopy",
    description:
      "CSV column mapping, example upload table, and a downloadable template for angle-resolved traces.",
  },
  {
    id: "optical-constants",
    href: "/wiki/data-representation/optical-constants",
    title: "Optical constants and plot views",
    description:
      "Persisted beta, mu, optical density, and delta; channel equations; browse rail channels; example plot and brief Kramers-Kronig / makima notes.",
  },
];

export default function DataRepresentationPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <h1 className="text-foreground text-4xl font-bold">
        Data representation and structure
      </h1>
      <p className="text-muted max-w-none">
        {site.name} stores NEXAFS measurements as queryable molecules, experiments,
        and per-energy spectrum points. The guides below cover how uploads become
        persisted traces and how browse plots expose optical-constant channels.
      </p>
      <nav aria-label="Data representation guides" className="grid gap-4">
        {childPages.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            id={page.id}
            className="border-border bg-surface hover:border-accent/40 focus-visible:ring-accent block rounded-2xl border p-6 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:p-8"
          >
            <h2 className="text-foreground text-lg font-semibold">{page.title}</h2>
            <p className="text-muted mt-2 text-sm leading-relaxed">
              {page.description}
            </p>
          </Link>
        ))}
      </nav>
      <section className="border-border bg-surface rounded-2xl border p-6 sm:p-8">
        <h2 className="text-foreground mb-2 text-lg font-semibold">Related</h2>
        <p className="text-muted text-sm leading-relaxed">
          Overview of stored representations and units on{" "}
          <Link
            href="/wiki/home#representations-stored"
            className="text-accent hover:underline"
          >
            Wiki home
          </Link>
          . Browse datasets at{" "}
          <Link href="/browse/nexafs" className="text-accent hover:underline">
            NEXAFS browse
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
