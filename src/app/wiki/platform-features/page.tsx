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
};

const featureItems = [
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
] as const;

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
      </div>
    </div>
  );
}
