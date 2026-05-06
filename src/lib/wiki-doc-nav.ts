/**
 * Canonical navigation entries for `/about/*` wiki-style documentation routes.
 *
 * Owns per-page section anchors for the Overview accordion (`href` + hash links).
 * Next.js routing remains authoritative; section `id`s must match headings in page TSX.
 */

export type WikiOverviewNavIcon =
  | "wiki-home"
  | "data-representation"
  | "platform-features"
  | "contributions";

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
    href: "/about/home",
    label: "Wiki home",
    breadcrumbLabel: "Wiki home",
    overviewNavIcon: "wiki-home",
    sections: [
      { id: "terminology-heading", label: "The zoo of names for the same idea" },
      { id: "nexafs-probes", label: "What NEXAFS probes" },
      { id: "representations-stored", label: "Representations stored in Xray Atlas" },
      { id: "coordinates-and-units", label: "Coordinates and units" },
    ],
  },
  {
    href: "/about/data-representation",
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
    href: "/about/platform-features",
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
    href: "/about/contributions",
    label: "Contributions",
    breadcrumbLabel: "Contributions",
    overviewNavIcon: "contributions",
    sections: [
      { id: "contribution-expectations", label: "Contribution expectations" },
      { id: "next-step", label: "Next step" },
    ],
  },
] satisfies readonly WikiDocTopic[];

/**
 * Resolves the wiki topic metadata whose `href` exactly matches `pathname`, when present.
 *
 * @param pathname - Next.js pathname such as `/about/home` (no query or hash).
 * @returns The matching topic, or `undefined` when `pathname` is not a configured wiki entry.
 */
export function wikiDocTopicForPathname(pathname: string): WikiDocTopic | undefined {
  return wikiDocTopics.find((topic) => topic.href === pathname);
}
