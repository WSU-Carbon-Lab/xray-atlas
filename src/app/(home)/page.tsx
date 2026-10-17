import type { ReactElement } from "react";
import { WhatsNewHeroAnnouncement } from "~/components/home/whats-new-hero-announcement";
import { HomeCatalog } from "./home-catalog";

/**
 * Home route. Renders the static catalog shell and suspends only the
 * What's New link, which reads cached blog frontmatter.
 */
export default function HomePage(): ReactElement {
  return <HomeCatalog announcement={<WhatsNewHeroAnnouncement />} />;
}
