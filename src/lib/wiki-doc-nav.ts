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
  | "data-insights"
  | "api";

export interface WikiDocNavSection {
  readonly id: string;
  readonly label: string;
  readonly href?: string;
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
      {
        id: "terminology-heading",
        label: "The zoo of names for the same idea",
      },
      { id: "nexafs-probes", label: "What NEXAFS probes" },
      {
        id: "representations-stored",
        label: "Representations stored in X-ray Atlas",
      },
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
      {
        id: "input-spectroscopy",
        label: "Input spectroscopy",
        href: "/wiki/data-representation/input-spectroscopy",
      },
      {
        id: "optical-constants",
        label: "Optical constant components",
        href: "/wiki/data-representation/optical-constants",
      },
      {
        id: "provenance-and-attribution-layer",
        label: "Provenance and attribution layer",
      },
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
      {
        id: "dataset-quality-metrics",
        label: "Dataset quality metrics",
        href: "/wiki/platform-features/dataset-quality-metrics",
      },
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
    href: "/wiki/data-insights",
    label: "Data Insights",
    breadcrumbLabel: "Data Insights",
    overviewNavIcon: "data-insights",
    sections: [
      { id: "live-metrics-preview", label: "Live metrics preview" },
      {
        id: "speed-insights-overview",
        label: "Speed Insights overview",
      },
      {
        id: "real-experience-score",
        label: "Real Experience Score",
      },
      { id: "core-web-vitals", label: "Core Web Vitals" },
      { id: "other-metrics", label: "Additional metrics" },
      { id: "how-scores-work", label: "How scores are determined" },
      {
        id: "data-points-percentiles",
        label: "Data points and percentiles",
      },
      { id: "interpreting-scores", label: "Interpreting scores" },
      {
        id: "official-documentation",
        label: "Official documentation",
      },
    ],
  },
  {
    href: "/wiki/api",
    label: "API",
    breadcrumbLabel: "API",
    overviewNavIcon: "api",
    sections: [
      { id: "overview", label: "API overview", href: "/wiki/api" },
      {
        id: "openapi",
        label: "OpenAPI",
        href: "/wiki/api/openapi",
      },
      {
        id: "v1",
        label: "v1",
        href: "/wiki/api/v1",
      },
    ],
  },
] satisfies readonly WikiDocTopic[];

/**
 * Resolves the wiki topic metadata whose `href` exactly matches `pathname`, when present.
 *
 * @param pathname - Next.js pathname such as `/wiki/home` (no query or hash).
 * @returns The matching topic, or `undefined` when `pathname` is not a configured wiki entry.
 */
export function wikiDocTopicForPathname(
  pathname: string,
): WikiDocTopic | undefined {
  const exact = wikiDocTopics.find((topic) => topic.href === pathname);
  if (exact) {
    return exact;
  }
  const prefixMatches = wikiDocTopics.filter(
    (topic) =>
      pathname.startsWith(`${topic.href}/`) || pathname.startsWith(topic.href),
  );
  return prefixMatches.sort((a, b) => b.href.length - a.href.length)[0];
}

/**
 * Linear, reading-order entry that powers `Previous` / `Next` page controls.
 *
 * Each entry corresponds to a distinct rendered URL under `/wiki/*`. Sub-pages declared
 * via section `href`s are inlined immediately after their parent topic.
 */
export interface WikiDocPage {
  readonly href: string;
  readonly label: string;
}

function buildWikiDocPages(): readonly WikiDocPage[] {
  const pages: WikiDocPage[] = [];
  const seen = new Set<string>();
  const push = (href: string, label: string): void => {
    if (seen.has(href)) {
      return;
    }
    seen.add(href);
    pages.push({ href, label });
  };

  for (const topic of wikiDocTopics) {
    push(topic.href, topic.breadcrumbLabel);
    for (const section of topic.sections) {
      if (section.href && section.href !== topic.href) {
        push(section.href, section.label);
      }
    }
  }
  return pages;
}

/**
 * Reading-order list of wiki pages used to drive prev/next navigation controls.
 *
 * Order follows {@link wikiDocTopics} top-to-bottom, with each topic's section-level
 * sub-pages (entries that declare their own `href`) inlined immediately after the topic.
 */
export const wikiDocPages: readonly WikiDocPage[] = buildWikiDocPages();

/**
 * Locates the wiki page entry whose `href` exactly matches `pathname`.
 *
 * Trailing slashes on `pathname` are tolerated; query strings and hashes must already be
 * stripped by the caller.
 *
 * @param pathname - Next.js pathname such as `/wiki/api/v1`.
 * @returns The matching page entry, or `undefined` when `pathname` is not a wiki page.
 */
export function wikiDocPageForPathname(
  pathname: string,
): WikiDocPage | undefined {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  return wikiDocPages.find((page) => page.href === normalized);
}

/**
 * Breadcrumb trail entry for a wiki pathname.
 *
 * Each entry represents one breadcrumb after the static `Home > Wiki` prefix. Entries
 * with an `href` should render as links; entries without `href` are the terminal current
 * page and should render as inert text.
 */
export interface WikiBreadcrumbItem {
  readonly label: string;
  readonly href?: string;
}

/**
 * Resolves the breadcrumb trail beneath the static `Home > Wiki` prefix for a given
 * wiki pathname.
 *
 * For top-level topic pages the trail is a single inert entry naming the topic. For
 * sub-pages declared via section `href`s that differ from the topic `href`, the trail
 * begins with a link to the parent topic and ends with an inert entry for the active
 * sub-page (for example `/wiki/api/v1` returns
 * `[{ label: "API", href: "/wiki/api" }, { label: "v1" }]`). When `pathname` is outside
 * the wiki tree the trail is empty so the caller can render a default `Wiki` placeholder.
 *
 * @param pathname - Next.js pathname such as `/wiki/api/v1` (no query or hash).
 * @returns Ordered breadcrumb entries beneath `Home > Wiki`.
 */
export function wikiDocBreadcrumbTrail(
  pathname: string,
): readonly WikiBreadcrumbItem[] {
  const topic = wikiDocTopicForPathname(pathname);
  if (!topic) {
    return [];
  }

  const subPage = topic.sections.find(
    (section) =>
      section.href && section.href !== topic.href && section.href === pathname,
  );

  if (!subPage) {
    return [{ label: topic.breadcrumbLabel }];
  }

  return [
    { label: topic.breadcrumbLabel, href: topic.href },
    { label: subPage.label },
  ];
}

/**
 * Reading-order neighbors for a given wiki pathname.
 *
 * `current` is the matched page entry, and `previous` / `next` are the adjacent entries
 * in {@link wikiDocPages}. The first page has no `previous`; the last page has no `next`.
 * When `pathname` is outside the wiki page list, all three fields are `undefined` so
 * callers can render disabled controls without throwing.
 *
 * @param pathname - Next.js pathname such as `/wiki/home` (no query or hash).
 * @returns `{ current, previous, next }` neighbor entries.
 */
export function wikiDocPageNeighbors(pathname: string): {
  readonly current: WikiDocPage | undefined;
  readonly previous: WikiDocPage | undefined;
  readonly next: WikiDocPage | undefined;
} {
  const current = wikiDocPageForPathname(pathname);
  if (!current) {
    return { current: undefined, previous: undefined, next: undefined };
  }
  const index = wikiDocPages.indexOf(current);
  return {
    current,
    previous: index > 0 ? wikiDocPages[index - 1] : undefined,
    next:
      index >= 0 && index < wikiDocPages.length - 1
        ? wikiDocPages[index + 1]
        : undefined,
  };
}
