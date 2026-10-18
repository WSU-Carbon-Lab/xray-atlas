import { Suspense, type ReactElement } from "react";
import { Footer, type FooterCatalog } from "~/components/layout/footer";
import { fetchGitHubRepoStars } from "~/lib/github/repo-stars";
import { getCachedAboutCollaborators } from "~/server/cache/about-public-cache";

function toFooterCatalog(
  rows: Awaited<ReturnType<typeof getCachedAboutCollaborators>>,
): FooterCatalog {
  const toLink = (row: {
    id: string;
    name: string;
    url: string | null;
  }): FooterCatalog["hosts"][number] => ({
    id: row.id,
    name: row.name,
    url: row.url,
  });
  return {
    hosts: rows.hosts.map(toLink),
    collaborators: rows.collaborators.map(toLink),
  };
}

/**
 * Loads GitHub stars and the collaborator lists on the server and passes them into the footer.
 */
async function FooterWithGithubStars(): Promise<ReactElement> {
  const [githubStars, catalog] = await Promise.all([
    fetchGitHubRepoStars(),
    getCachedAboutCollaborators()
      .then(toFooterCatalog)
      .catch(() => null),
  ]);
  return <Footer githubStars={githubStars} catalog={catalog} />;
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
