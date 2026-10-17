import { Suspense, type ReactElement, type ReactNode } from "react";
import { attribution, mission, site } from "~/app/brand";
import { HeroUpdatesRow } from "~/components/home/hero-updates-row";
import { HOME_SNAPSHOT } from "./snapshot/home-snapshot.generated";
import { getCachedHomeMoleculeCounts } from "~/server/home/home-molecule-counts";
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

/** Molecules view with cached live counts overlaid on snapshot values; snapshot stays on failure. */
async function HomeMoleculesWithCounts(): Promise<ReactElement> {
  const molecules = HOME_SNAPSHOT.molecules;
  const counts = await getCachedHomeMoleculeCounts(molecules.map((m) => m.id));
  return (
    <HomeMoleculesView
      molecules={molecules.map((m) => ({
        ...m,
        datasetCount: counts[m.id]?.datasets ?? m.datasetCount,
        favoriteCount: counts[m.id]?.favorites ?? m.favoriteCount,
      }))}
    />
  );
}

/** Home page composition. `announcement` is the suspended What's New link. */
export function HomePage({
  announcement,
}: {
  announcement?: ReactNode;
}): ReactElement {
  const s = HOME_SNAPSHOT;
  return (
    <div className="mx-auto w-full space-y-20 py-8 sm:py-10">
      <div>
        <section className="max-w-3xl space-y-3" aria-labelledby="home-heading">
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
            className="max-w-3xl items-start pt-1"
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
            molecules: (
              <Suspense
                fallback={<HomeMoleculesView molecules={s.molecules} />}
              >
                <HomeMoleculesWithCounts />
              </Suspense>
            ),
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
