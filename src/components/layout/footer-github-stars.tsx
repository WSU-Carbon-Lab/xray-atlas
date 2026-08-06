import { Suspense, type ReactElement } from "react";
import { Footer } from "~/components/layout/footer";
import { fetchGitHubRepoStars } from "~/lib/github/repo-stars";

/**
 * Loads the GitHub star count on the server and passes it into the client footer.
 */
async function FooterWithGithubStars(): Promise<ReactElement> {
  const githubStars = await fetchGitHubRepoStars();
  return <Footer githubStars={githubStars} />;
}

/**
 * Renders the site footer without blocking the root layout on the GitHub stars fetch.
 */
export function FooterGithubStarsSuspense(): ReactElement {
  return (
    <Suspense fallback={<Footer />}>
      <FooterWithGithubStars />
    </Suspense>
  );
}
