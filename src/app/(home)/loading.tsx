import type { ReactElement } from "react";
import { attribution, mission, site } from "~/app/brand";

/**
 * Route-level placeholder matching the home masthead and feature stage.
 */
export default function HomeLoading(): ReactElement {
  return (
    <div className="mx-auto w-full py-12 sm:py-16">
      <section className="max-w-3xl space-y-4">
        <p className="text-accent text-xs font-semibold tracking-[0.16em] uppercase">
          {attribution.lab}
        </p>
        <h1 className="font-display text-foreground text-5xl font-semibold tracking-tight sm:text-6xl">
          {site.name}
        </h1>
        <div className="bg-accent/70 h-0.5 w-12 rounded-full" aria-hidden />
        <p className="text-muted max-w-prose text-lg leading-8">
          {mission.heroShort}
        </p>
      </section>
      <div className="border-border mt-12 h-80 animate-pulse rounded-3xl border lg:mt-16" />
    </div>
  );
}
