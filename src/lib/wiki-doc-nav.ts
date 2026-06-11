/**
 * Canonical navigation entries for `/wiki/*` documentation routes.
 *
 * Owns the two-branch wiki tree (Start here, NEXAFS, Using X-ray Atlas) and per-page
 * section anchors for the right-rail outline. Section `id`s must match `rehype-slug`
 * output on MDX headings.
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
    href: "/wiki",
    label: "Start here",
    breadcrumbLabel: "Start here",
    overviewNavIcon: "wiki-home",
    sections: [],
  },
  {
    href: "/wiki/nexafs",
    label: "NEXAFS",
    breadcrumbLabel: "NEXAFS",
    overviewNavIcon: "data-representation",
    sections: [
      {
        id: "terminology",
        label: "Terminology and edge nomenclature",
        href: "/wiki/nexafs/terminology",
      },
      {
        id: "quantities",
        label: "Measured and derived quantities",
        href: "/wiki/nexafs/quantities",
      },
      {
        id: "optical-constants",
        label: "Optical constants and Kramers-Kronig",
        href: "/wiki/nexafs/optical-constants",
      },
    ],
  },
  {
    href: "/wiki/atlas",
    label: "Using X-ray Atlas",
    breadcrumbLabel: "Using X-ray Atlas",
    overviewNavIcon: "platform-features",
    sections: [
      {
        id: "data-model",
        label: "What the database stores",
        href: "/wiki/atlas/data-model",
      },
      {
        id: "uploading-data",
        label: "Uploading spectroscopy",
        href: "/wiki/atlas/uploading-data",
      },
      {
        id: "quality-metrics",
        label: "Dataset quality metrics",
        href: "/wiki/atlas/quality-metrics",
      },
      {
        id: "contributing",
        label: "Contributing datasets",
        href: "/wiki/atlas/contributing",
      },
      {
        id: "api",
        label: "API overview",
        href: "/wiki/api",
      },
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
 * Per-page right-rail outline keyed by pathname. Populated from heading slugs on MDX pages.
 */
export const wikiPageSections: Record<string, readonly WikiDocNavSection[]> = {
  "/wiki": [
    { id: "nexafs", label: "NEXAFS" },
    { id: "using-x-ray-atlas", label: "Using X-ray Atlas" },
    { id: "citing-and-contributing", label: "Citing and contributing" },
  ],
  "/wiki/nexafs": [
    { id: "the-absorption-process", label: "The absorption process" },
    {
      id: "anatomy-of-a-near-edge-spectrum",
      label: "Anatomy of a near-edge spectrum",
    },
    {
      id: "what-nexafs-measures-in-practice",
      label: "What NEXAFS measures in practice",
    },
    { id: "where-to-go-next", label: "Where to go next" },
  ],
  "/wiki/nexafs/terminology": [
    { id: "naming-conventions", label: "Naming conventions" },
    { id: "edge-nomenclature", label: "Edge nomenclature" },
    { id: "related", label: "Related" },
  ],
  "/wiki/nexafs/quantities": [
    {
      id: "absorption-from-transmission",
      label: "Absorption from transmission",
    },
    {
      id: "the-complex-index-of-refraction",
      label: "The complex index of refraction",
    },
    { id: "atomic-scattering-factors", label: "Atomic scattering factors" },
    { id: "dielectric-response", label: "Dielectric response" },
    {
      id: "persisted-versus-derived-channels",
      label: "Persisted versus derived channels",
    },
    { id: "related", label: "Related" },
  ],
  "/wiki/nexafs/optical-constants": [
    { id: "example-spectrum", label: "Example spectrum" },
    {
      id: "the-kramers-kronig-transform",
      label: "The Kramers-Kronig transform",
    },
    {
      id: "interpolation-onto-the-measured-grid",
      label: "Interpolation onto the measured grid",
    },
    { id: "recalculation-in-the-app", label: "Recalculation in the app" },
    { id: "related", label: "Related" },
  ],
  "/wiki/atlas": [
    { id: "what-the-platform-provides", label: "What the platform provides" },
  ],
  "/wiki/atlas/data-model": [
    { id: "persisted-channels", label: "Persisted channels" },
    { id: "metadata-conventions", label: "Metadata conventions" },
    { id: "related", label: "Related" },
  ],
  "/wiki/atlas/uploading-data": [
    { id: "expected-column-layout", label: "Expected column layout" },
    { id: "related", label: "Related" },
  ],
  "/wiki/atlas/quality-metrics": [
    { id: "metrics-roadmap", label: "Metrics roadmap" },
    { id: "headline-score", label: "Headline score" },
    {
      id: "energy-resolution-distribution",
      label: "Energy resolution distribution",
    },
    {
      id: "worked-example-spacing-distribution",
      label: "Worked example, spacing distribution",
    },
    { id: "signal-to-noise-ratio", label: "Signal-to-noise ratio" },
    {
      id: "normalization-fits-od-and-mass-absorption",
      label: "Normalization fits (OD and mass absorption)",
    },
    {
      id: "missing-metrics-in-the-tooltip",
      label: "Missing metrics in the tooltip",
    },
  ],
  "/wiki/atlas/contributing": [
    { id: "contribution-expectations", label: "Contribution expectations" },
    {
      id: "what-makes-a-dataset-reusable",
      label: "What makes a dataset reusable",
    },
    { id: "next-step", label: "Next step" },
  ],
};

/**
 * Resolves the wiki topic metadata whose `href` matches `pathname`, when present.
 *
 * @param pathname - Next.js pathname such as `/wiki/nexafs/quantities` (no query or hash).
 * @returns The matching topic, or `undefined` when `pathname` is not a configured wiki entry.
 */
export function wikiDocTopicForPathname(
  pathname: string,
): WikiDocTopic | undefined {
  const exact = wikiDocTopics.find((topic) => topic.href === pathname);
  if (exact) {
    return exact;
  }

  const bySection = wikiDocTopics.find((topic) =>
    topic.sections.some((section) => section.href === pathname),
  );
  if (bySection) {
    return bySection;
  }

  const prefixMatches = wikiDocTopics.filter(
    (topic) => pathname === topic.href || pathname.startsWith(`${topic.href}/`),
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
 * `[{ label: "Using X-ray Atlas", href: "/wiki/atlas" }, { label: "v1" }]`). When
 * `pathname` is outside the wiki tree the trail is empty so the caller can render a
 * default `Wiki` placeholder.
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
    if (pathname === topic.href) {
      return [{ label: topic.breadcrumbLabel }];
    }
    if (pathname.startsWith(`${topic.href}/`)) {
      const leafLabel =
        pathname
          .slice(topic.href.length + 1)
          .split("/")
          .pop()
          ?.replace(/-/g, " ") ?? pathname;
      return [
        { label: topic.breadcrumbLabel, href: topic.href },
        { label: leafLabel.charAt(0).toUpperCase() + leafLabel.slice(1) },
      ];
    }
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
 * @param pathname - Next.js pathname such as `/wiki` (no query or hash).
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

/**
 * Resolves the right-rail outline sections for a wiki pathname when configured.
 *
 * @param pathname - Next.js pathname such as `/wiki/nexafs/quantities`.
 * @returns Section anchors for the page outline, or `undefined` when not configured.
 */
export function wikiPageOutlineForPathname(
  pathname: string,
): readonly WikiDocNavSection[] | undefined {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  return wikiPageSections[normalized];
}

/**
 * Label for the topic landing link shown as the first child under a wiki header menu group.
 *
 * @param topic - Wiki topic entry from {@link wikiDocTopics}.
 * @returns Reader-facing intro link text for the topic root path.
 */
export function wikiTopicIntroLinkLabel(topic: WikiDocTopic): string {
  if (topic.href === "/wiki/nexafs") {
    return "Introduction";
  }
  if (topic.href === "/wiki/atlas") {
    return "Overview";
  }
  return topic.breadcrumbLabel;
}
