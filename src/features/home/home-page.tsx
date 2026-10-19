import type { ReactElement } from "react";
import { mission, site } from "~/app/brand";
import { HomeOpenField } from "./home-open-field";
import { HomeAtlasStage } from "./stage/home-atlas-stage";
import { HomeSearchBand } from "./search/home-search-band";
import { HomeLatestPosts } from "./content/home-latest-posts";
import { HomeDocsPicks } from "./content/home-docs-picks";
import { HomeStageMetrics } from "./home-stage-metrics";
import { HomeStageJumpList } from "./home-stage-nav";

/**
 * Home page in four stacked stages.
 *
 * Wheel and trackpad scrolling snaps one stage at a time. Each stage lists
 * every stage above it and every stage below it, in document order. The
 * feature list selects on hover. The news stage previews the post under
 * the pointer.
 */
export function HomePage(): ReactElement {
  return (
    <div className="home-page">
      <HomeStageMetrics />
      <section id="home-search" className="home-open" aria-label="Search">
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
        <HomeStageJumpList
          currentId="home-search"
          edge="below"
          className="home-open__next"
        />
      </section>
      <div className="home-break" role="separator" />
      <section id="home-features" className="home-stage">
        <HomeStageJumpList currentId="home-features" edge="above" />
        <div className="flex w-full min-w-0 flex-1 items-center">
          <div className="w-full min-w-0">
            <HomeAtlasStage />
          </div>
        </div>
        <HomeStageJumpList currentId="home-features" edge="below" />
      </section>
      <div className="home-break" role="separator" />
      <HomeDocsPicks />
      <div className="home-break" role="separator" />
      <section
        id="home-news"
        aria-label="Recent news"
        className="home-stage home-stage--last"
      >
        <HomeStageJumpList currentId="home-news" edge="above" />
        <div className="flex w-full min-w-0 flex-1 items-center">
          <HomeLatestPosts />
        </div>
      </section>
    </div>
  );
}
