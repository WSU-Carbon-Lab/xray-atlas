import type { ReactElement } from "react";
import { WhatsNewHeroAnnouncement } from "~/components/home/whats-new-hero-announcement";
import { HomePage as HomePageView } from "~/features/home/home-page";

/** Home route: static Atlas Stage rendered from the committed snapshot; no database read at paint. */
export default function HomePage(): ReactElement {
  return <HomePageView announcement={<WhatsNewHeroAnnouncement />} />;
}
