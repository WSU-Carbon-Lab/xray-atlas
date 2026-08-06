import { Suspense, type ReactElement } from "react";
import Header from "~/components/layout/header";
import { fetchGitHubRepoStars } from "~/lib/github/repo-stars";
import { getCachedWhatsNewSummary } from "~/lib/whats-new-summary";

/**
 * Loads the What's New highlight and GitHub star count on the server for the header.
 */
async function HeaderWithWhatsNew(): Promise<ReactElement> {
  const [whatsNew, githubStars] = await Promise.all([
    getCachedWhatsNewSummary(),
    fetchGitHubRepoStars(),
  ]);
  return <Header whatsNew={whatsNew} githubStars={githubStars} />;
}

/**
 * Renders the site header without blocking the root layout on blog MDX scans.
 */
export function HeaderWhatsNewSuspense(): ReactElement {
  return (
    <Suspense fallback={<Header />}>
      <HeaderWithWhatsNew />
    </Suspense>
  );
}
