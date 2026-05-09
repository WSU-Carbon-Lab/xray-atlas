/**
 * About segment summarizing browse, visualization, contribution, and attribution features.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { site } from "~/app/brand";

export const metadata: Metadata = {
  title: "Platform Features",
  description:
    `Core ${site.name} features for searching, filtering, visualizing, and contributing NEXAFS and X-ray spectroscopy datasets.`,
  alternates: {
    canonical: "/wiki/platform-features",
  },
};

interface PlatformFeatureItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly wikiGuideHref?: string;
}

const featureItems: readonly PlatformFeatureItem[] = [
  {
    id: "search-and-filter",
    title: "Search and filter",
    description:
      "Query by molecule names, identifiers, facilities, edges, and other metadata for focused dataset discovery.",
  },
  {
    id: "interactive-visualization",
    title: "Interactive visualization",
    description:
      "Inspect and compare spectrum traces with tools designed for angle and mode-aware analysis.",
  },
  {
    id: "dataset-quality-metrics",
    title: "Dataset quality metrics",
    description:
      "Browse and molecule-detail NEXAFS cards show a compact ring summarizing spacing distribution (including a P75 ΔE marker), optional SNR when error bars exist, and separate OD versus mass-absorption normalization anchor distances.",
    wikiGuideHref: "/wiki/platform-features/dataset-quality-metrics",
  },
  {
    id: "contribution-workflows",
    title: "Contribution workflows",
    description:
      "Submit molecules, facilities, and experiments through guided flows with validation and metadata prompts.",
  },
  {
    id: "attribution-signals",
    title: "Attribution signals",
    description:
      "Dataset provenance, contributor records, and citation metadata make reuse auditable and citable.",
  },
];

export default function PlatformFeaturesPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <h1 className="text-foreground text-4xl font-bold">Platform features</h1>
      <p className="text-muted">
        {site.name} is built for day-to-day spectroscopy workflows: finding
        relevant NEXAFS data quickly, validating context, and contributing new
        measurements in a reusable format.
      </p>
      <div className="space-y-3">
        {featureItems.map((item) => (
          <section
            key={item.title}
            className="border-border bg-surface rounded-lg border p-4"
          >
            <h2
              id={item.id}
              className="text-foreground mb-1 text-lg font-semibold"
            >
              {item.title}
            </h2>
            <p className="text-muted text-sm">{item.description}</p>
            {item.wikiGuideHref ? (
              <Link
                href={item.wikiGuideHref}
                className="text-accent mt-2 inline-block text-sm font-medium hover:underline"
              >
                Read the dataset quality guide
              </Link>
            ) : null}
          </section>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/browse/nexafs"
          className="bg-accent text-accent-foreground rounded-lg px-4 py-2 text-sm font-medium"
        >
          Browse NEXAFS
        </Link>
        <Link
          href="/contribute"
          className="border-border bg-surface text-foreground rounded-lg border px-4 py-2 text-sm font-medium"
        >
          Contribute datasets
        </Link>
        <Link
          href="/wiki/data-representation"
          className="border-border bg-surface text-foreground rounded-lg border px-4 py-2 text-sm font-medium"
        >
          Data representation guide
        </Link>
      </div>
    </div>
  );
}
