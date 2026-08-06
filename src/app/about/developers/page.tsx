/**
 * About-section developers route: changelog, bugs, discussions, and open pull requests.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { RoadmapGitHubCommunityPanel } from "~/components/about/roadmap/roadmap-github-community-panel";
import { site } from "~/app/brand";
import { fetchGitHubChangelogActivity } from "~/lib/github/changelog-activity";
import { fetchGitHubRoadmapActivity } from "~/lib/github/roadmap-activity";

export const metadata: Metadata = {
  title: `Developers | About ${site.name}`,
  description: `Developer feed for ${site.name}: changelog of merges to main, open bugs, discussions, and pull requests.`,
  alternates: {
    canonical: "/about/developers",
  },
};

export const revalidate = 600;

export default async function AboutDevelopersPage() {
  const [githubActivity, changelog] = await Promise.all([
    fetchGitHubRoadmapActivity(),
    fetchGitHubChangelogActivity(),
  ]);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-12">
        <div className="space-y-4">
          <Link
            href="/about"
            className="text-muted hover:text-accent inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden />
            About {site.name}
          </Link>
          <div className="space-y-3">
            <h1 className="text-foreground text-4xl font-bold sm:text-5xl">
              Developers
            </h1>
            <p className="text-secondary max-w-2xl text-lg leading-relaxed">
              What recently shipped on main, which bugs are open, and where to
              join discussions or review pull requests on GitHub.
            </p>
          </div>
        </div>

        <RoadmapGitHubCommunityPanel
          activity={githubActivity}
          changelog={changelog}
        />
      </div>
    </div>
  );
}
