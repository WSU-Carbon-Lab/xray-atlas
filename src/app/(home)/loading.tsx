import type { ReactElement } from "react";
import { attribution, mission, site } from "~/app/brand";

/**
 * Route-level placeholder matching the home masthead and atlas stage.
 */
export default function HomeLoading(): ReactElement {
  return (
    <div className="mx-auto w-full py-12 sm:py-16">
      <section className="max-w-3xl space-y-4">
        <p className="home-kicker">{attribution.lab}</p>
        <h1 className="font-display text-foreground text-5xl font-semibold tracking-tight sm:text-6xl">
          {site.name}
        </h1>
        <p className="text-muted max-w-prose text-lg leading-8">
          {mission.heroShort}
        </p>
      </section>
      <div className="home-stage">
        <div className="bg-surface border-border h-48 rounded-3xl border" />
        <div className="home-stage__grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="home-tile animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
