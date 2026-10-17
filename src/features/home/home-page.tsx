import type { ReactElement, ReactNode } from "react";
import { attribution, mission, site } from "~/app/brand";
import { HeroUpdatesRow } from "~/components/home/hero-updates-row";
import { HOME_SNAPSHOT } from "./snapshot/home-snapshot.generated";
import { HomeAtlasStage } from "./stage/home-atlas-stage";
import { HomeSearchBand } from "./search/home-search-band";
import { HomeMoleculesView } from "./molecules/home-molecules-view";
import { HomeMoleculesPreview } from "./molecules/home-molecules-preview";
import { HomeSpectraView } from "./spectra/home-spectra-view";
import { HomeSpectraPreview } from "./spectra/home-spectra-preview";
import { HomeFacilitiesView } from "./facilities/home-facilities-view";
import { HomeFacilitiesPreview } from "./facilities/home-facilities-preview";
import { HomeLatestPosts } from "./content/home-latest-posts";
import { HomeWikiPicks } from "./content/home-wiki-picks";
import { HomeContributeStrip } from "./content/home-contribute-strip";

/** Home page composition. `announcement` is the suspended What's New link. */
export function HomePage({
  announcement,
}: {
  announcement?: ReactNode;
}): ReactElement {
  const s = HOME_SNAPSHOT;
  return (
    <div className="mx-auto w-full space-y-20 py-12 sm:py-16">
      <div>
        <section className="max-w-3xl space-y-4" aria-labelledby="home-heading">
          <p className="home-kicker">{attribution.lab}</p>
          <h1
            id="home-heading"
            className="font-display text-foreground text-5xl font-semibold tracking-tight sm:text-6xl"
          >
            {site.name}
          </h1>
          <p className="text-muted max-w-prose text-lg leading-8">
            {mission.heroShort}
          </p>
          <HeroUpdatesRow
            blogAnnouncement={announcement}
            className="max-w-3xl items-start pt-2"
          />
        </section>
        <HomeAtlasStage
          search={<HomeSearchBand />}
          previews={{
            molecules: <HomeMoleculesPreview molecules={s.molecules} />,
            spectra: <HomeSpectraPreview spectrum={s.spectrum} />,
            facilities: <HomeFacilitiesPreview />,
          }}
          views={{
            molecules: <HomeMoleculesView molecules={s.molecules} />,
            spectra: <HomeSpectraView spectrum={s.spectrum} />,
            facilities: <HomeFacilitiesView />,
          }}
        />
      </div>
      <HomeLatestPosts />
      <HomeWikiPicks />
      <HomeContributeStrip />
    </div>
  );
}
