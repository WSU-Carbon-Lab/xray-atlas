import { canonicalDocsPath } from "~/lib/docs-versions";

/**
 * Navigation for `/docs`.
 *
 * The wiki holds the spectroscopy reference. This module owns the developer
 * documentation tree: the HTTP API and the client guides.
 */

export interface DocsNavItem {
  readonly href: string;
  readonly label: string;
  readonly status?: "soon";
  readonly children?: readonly DocsNavItem[];
}

export interface DocsNavGroup {
  readonly label: string;
  readonly items: readonly DocsNavItem[];
}

export interface DocsSectionCard {
  readonly href: string;
  readonly title: string;
  readonly status: "Published" | "Coming soon";
  readonly body: string;
}

/** Left-rail groups. Overview is an exact match. Longer paths win over prefixes. */
export const docsNavGroups: readonly DocsNavGroup[] = [
  {
    label: "Start",
    items: [
      { href: "/docs", label: "Overview" },
      { href: "/docs/installing", label: "Installing" },
    ],
  },
  {
    label: "Clients",
    items: [
      { href: "/docs/cli", label: "CLI" },
      { href: "/docs/editors", label: "Editors", status: "soon" },
      {
        href: "/docs/python",
        label: "Python",
        children: [
          { href: "/docs/python/datasets", label: "Datasets" },
          { href: "/docs/python/models", label: "Models" },
          { href: "/docs/python/build", label: "Build & publish" },
          { href: "/docs/python/compare", label: "Compare" },
          { href: "/docs/python/reproduce", label: "Reproduce" },
          { href: "/docs/python/concepts", label: "Concepts" },
          { href: "/docs/python/errors", label: "Errors" },
          { href: "/docs/python/examples", label: "Examples" },
          { href: "/docs/python/faq", label: "FAQ" },
          { href: "/docs/python/reference", label: "Reference" },
        ],
      },
      { href: "/docs/igor", label: "Igor Pro", status: "soon" },
    ],
  },
];

/** Cards on the docs landing page. */
export const docsSectionCards: readonly DocsSectionCard[] = [
  {
    href: "/docs/installing",
    title: "Installing",
    status: "Published",
    body: "Install the catalog CLI with the site script, Bun, Homebrew, or Scoop.",
  },
  {
    href: "/docs/cli",
    title: "CLI",
    status: "Published",
    body: "Log in, browse the catalog, query spectra, save a local copy with its citation, upload datasets, and edit normalization.",
  },
  {
    href: "/docs/editors",
    title: "Editors",
    status: "Coming soon",
    body: "VS Code and Zed extensions for browsing the catalog from an editor.",
  },
  {
    href: "/docs/python",
    title: "Python",
    status: "Published",
    body: "Read datasets, metadata, auxiliary files, and optical models into Python, then build, publish, compare, and pin models.",
  },
  {
    href: "/docs/igor",
    title: "Igor Pro",
    status: "Coming soon",
    body: "Igor Pro client for loading catalog spectra into an experiment.",
  },
  {
    href: "/docs/api",
    title: "HTTP API",
    status: "Published",
    body: "Raw contract under /api/v1: catalog reads, token-authenticated dataset writes, versions, physics tables, and OpenAPI.",
  },
];

/**
 * Returns the nav item that should be current for `pathname`.
 *
 * @param pathname - Next.js pathname with no query or hash.
 * @returns The matching href, or `null` when `pathname` is outside `/docs`.
 */
export function activeDocsHref(pathname: string): string | null {
  const normalized = canonicalDocsPath(pathname);
  const items = docsNavGroups.flatMap((group) => group.items);
  const matches = items.filter(
    (item) =>
      normalized === item.href ||
      (item.href !== "/docs" && normalized.startsWith(`${item.href}/`)),
  );
  matches.sort((left, right) => right.href.length - left.href.length);
  return matches[0]?.href ?? null;
}
