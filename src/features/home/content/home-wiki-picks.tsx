import type { ReactElement } from "react";
import Link from "next/link";

const PICKS = [
  {
    href: "/wiki/nexafs/quantities",
    title: "What NEXAFS measures",
    hook: "Optical density, mass absorption, β and δ, and how they relate.",
  },
  {
    href: "/wiki/nexafs/orientation",
    title: "Reading orientation",
    hook: "How polarization dependence reveals molecular tilt.",
  },
  {
    href: "/wiki/nexafs/normalization",
    title: "Normalization",
    hook: "From detector counts to comparable spectra.",
  },
  {
    href: "/wiki/atlas/uploading-data",
    title: "Uploading data",
    hook: "Columns, templates, and what the Atlas computes for you.",
  },
] as const;

/** Four curated wiki entry points. */
export function HomeWikiPicks(): ReactElement {
  return (
    <section aria-labelledby="home-wiki" className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h2
          id="home-wiki"
          className="font-display text-foreground text-2xl font-semibold"
        >
          Start in the wiki
        </h2>
        <Link href="/wiki" className="text-accent text-sm">
          Browse the wiki
        </Link>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PICKS.map((p) => (
          <li key={p.href}>
            <Link href={p.href} className="home-tile home-tile--compact h-full">
              <span className="text-foreground font-semibold">{p.title}</span>
              <span className="text-muted text-sm leading-6">{p.hook}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
