import type { ReactElement } from "react";

const THEMES = [
  {
    title: "Collaboration",
    body: "Open data and open science. Compare published spectra, then open one and work with it.",
  },
  {
    title: "Data",
    body: "Absorption, polarization, and optical constants on one energy axis.",
  },
  {
    title: "Catalog",
    body: "Group the same measurements by molecule, edge, instrument, facility, or collection mode.",
  },
  {
    title: "Provenance",
    body: "Sample, collection, analysis, raw and calculated traces, and the papers they came from.",
  },
] as const;

/**
 * Route-level placeholder for the three home stages: a first-screen search,
 * then the feature names and preview.
 */
export default function HomeLoading(): ReactElement {
  return (
    <div className="home-page">
      <div className="home-open">
        <div className="home-open__body">
          <div className="bg-default mx-auto h-16 w-72 animate-pulse rounded" />
          <div className="bg-default mx-auto h-6 w-full max-w-md animate-pulse rounded" />
          <div className="bg-default h-14 animate-pulse rounded-xl" />
        </div>
      </div>
      <div className="home-break" />
      <div className="home-reveal grid grid-cols-1 items-stretch gap-10 lg:grid-cols-[minmax(22rem,32rem)_minmax(0,1fr)] lg:gap-x-16">
        <div>
          <div className="bg-default mb-3 h-3 w-16 animate-pulse rounded" />
          <div className="divide-border divide-y">
            {THEMES.map((theme) => (
              <div key={theme.title} className="py-3">
                <div className="font-display text-muted text-3xl leading-none sm:text-4xl lg:text-5xl">
                  {theme.title}
                </div>
                <p className="text-muted mt-2 max-w-sm text-sm leading-6">
                  {theme.body}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="min-h-[28rem] space-y-4" aria-hidden>
          <div className="bg-default h-3 w-40 animate-pulse rounded" />
          <div className="bg-default h-10 max-w-xl animate-pulse rounded" />
          <div className="bg-default h-64 animate-pulse rounded-xl" />
        </div>
      </div>
    </div>
  );
}
