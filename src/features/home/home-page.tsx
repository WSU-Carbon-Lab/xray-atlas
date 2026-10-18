import type { ReactElement } from "react";
import { mission, site } from "~/app/brand";
import { HomeOpenField } from "./home-open-field";
import { HomeAtlasStage } from "./stage/home-atlas-stage";
import { HomeSearchBand } from "./search/home-search-band";
import { HomeLatestPosts } from "./content/home-latest-posts";
import { HomeWikiPicks } from "./content/home-wiki-picks";
import { HomeContributeStrip } from "./content/home-contribute-strip";

/**
 * Home page in three stacked stages.
 *
 * The opening stage centers the site name, then the search, with a faint
 * spectrum under the field. A hairline leads to the feature stage, and another
 * to the blog, wiki, and contribute block. Sections below the fold rise into
 * view on scroll. The flat stack this replaced is the previous `space-y-16`
 * list of the same five sections in `home-page.tsx`.
 */
export function HomePage(): ReactElement {
  return (
    <div className="home-page">
      <section className="home-open" aria-label="Search">
        <div className="home-open__body">
          <div className="home-open__copy">
            <h1 className="font-display home-open__title">{site.name}</h1>
            <p className="home-open__line">{mission.heroShort}</p>
          </div>
          <div className="home-open__search">
            <HomeOpenField />
            <div className="relative z-10">
              <HomeSearchBand />
            </div>
          </div>
        </div>
        <a href="#home-features" className="home-open__next">
          Features
        </a>
      </section>
      <div className="home-break" role="separator" />
      <section id="home-features" className="home-reveal scroll-mt-6">
        <HomeAtlasStage />
      </section>
      <div className="home-break" role="separator" />
      <div className="home-reveal home-reading">
        <HomeLatestPosts />
        <HomeWikiPicks />
        <HomeContributeStrip />
      </div>
    </div>
  );
}
