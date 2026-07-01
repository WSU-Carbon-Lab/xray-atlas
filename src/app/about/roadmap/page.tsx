/**
 * About-section roadmap route: publication timeline plus live GitHub activity.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Chip } from "@heroui/react";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { RoadmapGitHubPanel } from "~/components/about/roadmap/roadmap-github-panel";
import { RoadmapTimeline } from "~/components/about/roadmap/roadmap-timeline";
import { site } from "~/app/brand";
import { fetchGitHubRoadmapActivity } from "~/lib/github/roadmap-activity";
import { roadmapHorizon } from "~/lib/roadmap/roadmap-data";

export const metadata: Metadata = {
  title: `Roadmap | About ${site.name}`,
  description: `Near- and medium-term priorities for ${site.name}: platform milestones, publication timeline, and open GitHub work.`,
  alternates: {
    canonical: "/about/roadmap",
  },
};

export default async function AboutRoadmapPage() {
  const githubActivity = await fetchGitHubRoadmapActivity();

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
              Roadmap
            </h1>
            <p className="text-secondary max-w-2xl text-lg leading-relaxed">
              What we intend to build, what is already live, and what remains
              genuinely open. This page is revised as milestones land or
              priorities change; institutional questions are marked explicitly
              rather than force-fit into delivery dates.
            </p>
            <Chip
              size="sm"
              variant="secondary"
              className="border-accent/30 bg-accent/10 text-accent h-7 rounded-full px-3 text-xs font-semibold"
            >
              Target: reviewers {roadmapHorizon.monthLabel}
            </Chip>
          </div>
        </div>

        <RoadmapTimeline />

        <RoadmapGitHubPanel activity={githubActivity} />
      </div>
    </div>
  );
}
