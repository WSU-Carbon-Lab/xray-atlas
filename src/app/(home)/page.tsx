import { WhatsNewHeroAnnouncement } from "@/components/home/whats-new-hero-announcement";
import { HomePageContent } from "./home-page-content";

export default function HomePage() {
  return (
    <HomePageContent heroAnnouncement={<WhatsNewHeroAnnouncement />} />
  );
}
