/**
 * Canonical navigation entries for `/wiki/*` documentation routes.
 *
 * Owns per-page section anchors for the Overview accordion (`href` + hash links).
 * Next.js routing remains authoritative; section `id`s must match headings in page TSX.
 */

export type WikiOverviewNavIcon =
  | "wiki-home"
  | "data-representation"
  | "platform-features"
  | "contributions"
  | "api-reference";

export interface WikiDocNavSection {
  readonly id: string;
  readonly label: string;
}

export interface WikiDocTopic {
  readonly href: string;
  readonly label: string;
  readonly breadcrumbLabel: string;
  readonly overviewNavIcon: WikiOverviewNavIcon;
  readonly sections: readonly WikiDocNavSection[];
}

export const wikiDocTopics: readonly WikiDocTopic[] = [
  {
    href: "/wiki/home",
    label: "Wiki home",
    breadcrumbLabel: "Wiki home",
    overviewNavIcon: "wiki-home",
    sections: [
      { id: "terminology-heading", label: "The zoo of names for the same idea" },
      { id: "nexafs-probes", label: "What NEXAFS probes" },
      { id: "representations-stored", label: "Representations stored in X-ray Atlas" },
      { id: "coordinates-and-units", label: "Coordinates and units" },
    ],
  },
  {
    href: "/wiki/data-representation",
    label: "Data representation",
    breadcrumbLabel: "Data representation",
    overviewNavIcon: "data-representation",
    sections: [
      { id: "molecule-and-sample-layer", label: "Molecule and sample layer" },
      { id: "experiment-metadata-layer", label: "Experiment metadata layer" },
      { id: "spectrum-trace-layer", label: "Spectrum trace layer" },
      { id: "provenance-and-attribution-layer", label: "Provenance and attribution layer" },
    ],
  },
  {
    href: "/wiki/platform-features",
    label: "Platform features",
    breadcrumbLabel: "Platform features",
    overviewNavIcon: "platform-features",
    sections: [
      { id: "search-and-filter", label: "Search and filter" },
      { id: "interactive-visualization", label: "Interactive visualization" },
      { id: "contribution-workflows", label: "Contribution workflows" },
      { id: "attribution-signals", label: "Attribution signals" },
    ],
  },
  {
    href: "/wiki/contributions",
    label: "Contributions",
    breadcrumbLabel: "Contributions",
    overviewNavIcon: "contributions",
    sections: [
      { id: "contribution-expectations", label: "Contribution expectations" },
      { id: "next-step", label: "Next step" },
    ],
  },
  {
    href: "/wiki/api-reference",
    label: "API reference",
    breadcrumbLabel: "API reference",
    overviewNavIcon: "api-reference",
    sections: [
      { id: "overview", label: "Overview" },
      { id: "molecule-catalog", label: "Molecule catalog endpoint" },
      { id: "edge-summary", label: "Molecule edge summary endpoint" },
      { id: "dataset-summaries", label: "Dataset summaries endpoint" },
      { id: "doi-discovery", label: "DOI-first discovery endpoint" },
      { id: "dataset-export", label: "Dataset export endpoint" },
      { id: "compatibility", label: "Compatibility and transition" },
      { id: "errors", label: "Status codes and errors" },
    ],
  },
] satisfies readonly WikiDocTopic[];

/**
 * Resolves the wiki topic metadata whose `href` exactly matches `pathname`, when present.
 *
 * @param pathname - Next.js pathname such as `/wiki/home` (no query or hash).
 * @returns The matching topic, or `undefined` when `pathname` is not a configured wiki entry.
 */
export function wikiDocTopicForPathname(pathname: string): WikiDocTopic | undefined {
  return wikiDocTopics.find((topic) => topic.href === pathname);
}
