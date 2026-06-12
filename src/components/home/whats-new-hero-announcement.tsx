import type { ReactElement } from "react";
import { getWhatsNewSummary } from "~/lib/whats-new-summary";
import { WhatsNewHeroBadge } from "./whats-new-hero-badge";

/**
 * Server wrapper that loads the highlight post and renders the home hero blog link.
 */
export async function WhatsNewHeroAnnouncement(): Promise<ReactElement | null> {
  const summary = await getWhatsNewSummary();
  if (!summary) {
    return null;
  }

  return <WhatsNewHeroBadge summary={summary} />;
}
