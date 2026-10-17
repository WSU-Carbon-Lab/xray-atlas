import { Suspense, type ReactElement } from "react";
import { getCachedWhatsNewSummary } from "~/lib/whats-new-summary";
import { WhatsNewHeroBadge } from "./whats-new-hero-badge";

/**
 * Reads the shared What's New cache and renders the hero blog link.
 * Returns `null` when no published post exists.
 */
async function WhatsNewHeroAnnouncementContent(): Promise<ReactElement | null> {
  const summary = await getCachedWhatsNewSummary();
  if (!summary) {
    return null;
  }

  return (
    <div className="flex max-w-full min-w-0 justify-center">
      <WhatsNewHeroBadge summary={summary} />
    </div>
  );
}

/**
 * Renders the home hero blog link from the cached What's New highlight.
 * Suspends so the rest of the home page does not wait on that read.
 */
export function WhatsNewHeroAnnouncement(): ReactElement {
  return (
    <Suspense fallback={null}>
      <WhatsNewHeroAnnouncementContent />
    </Suspense>
  );
}
