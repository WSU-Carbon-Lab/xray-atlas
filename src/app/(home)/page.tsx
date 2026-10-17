import { Suspense } from "react";
import { WhatsNewHeroAnnouncement } from "~/components/home/whats-new-hero-announcement";
import {
  HomePageContent,
  HomePopularMoleculesFallback,
} from "./home-page-content";
import { HomePopularMolecules } from "./home-popular-molecules";

export default function HomePage() {
  return (
    <HomePageContent
      heroAnnouncement={<WhatsNewHeroAnnouncement />}
      popularMolecules={
        <Suspense fallback={<HomePopularMoleculesFallback />}>
          <HomePopularMolecules />
        </Suspense>
      }
    />
  );
}
