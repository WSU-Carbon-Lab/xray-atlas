import type { ReactElement, ReactNode } from "react";
import { attribution, mission, site } from "~/app/brand";
import { HeroUpdatesRow } from "~/components/home/hero-updates-row";
import { HomeFeatureStage } from "./home-feature-stage";

/**
 * Home catalog shell: brand masthead, the short tagline, and the expanding
 * feature stage. Does not read molecule popularity or experiment rows.
 * `announcement` is the optional What's New link.
 */
export function HomeCatalog({
  announcement,
}: {
  announcement?: ReactNode;
}): ReactElement {
  return (
    <div className="mx-auto w-full py-12 sm:py-16">
      <section className="max-w-3xl space-y-4" aria-labelledby="home-heading">
        <p className="text-accent text-xs font-semibold tracking-[0.16em] uppercase">
          {attribution.lab}
        </p>
        <h1
          id="home-heading"
          className="font-display text-foreground text-5xl font-semibold tracking-tight sm:text-6xl"
        >
          {site.name}
        </h1>
        <div className="bg-accent/70 h-0.5 w-12 rounded-full" aria-hidden />
        <p className="text-muted max-w-prose text-lg leading-8">
          {mission.heroShort}
        </p>
        <HeroUpdatesRow
          blogAnnouncement={announcement}
          className="max-w-3xl items-start pt-2"
        />
      </section>
      <HomeFeatureStage />
    </div>
  );
}
