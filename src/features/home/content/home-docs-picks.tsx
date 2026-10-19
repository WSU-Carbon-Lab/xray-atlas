import type { ReactElement } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { HomeStageJumpList } from "../home-stage-nav";

interface DocEntry {
  readonly href?: string;
  readonly title: string;
  readonly body: string;
}

const WIKI_ENTRIES: readonly DocEntry[] = [
  {
    href: "/wiki",
    title: "Wiki home",
    body: "Living reference for NEXAFS spectroscopy and how the platform stores measurements.",
  },
  {
    href: "/wiki/nexafs/orientation",
    title: "Reading orientation",
    body: "How polarization dependence reveals molecular tilt.",
  },
  {
    href: "/wiki/nexafs/normalization",
    title: "Normalization",
    body: "From detector counts to comparable spectra.",
  },
  {
    href: "/wiki/atlas/uploading-data",
    title: "Uploading data",
    body: "Columns, templates, and what the Atlas computes for you.",
  },
];

const DEVELOPER_ENTRIES: readonly DocEntry[] = [
  {
    href: "/docs/cli",
    title: "CLI",
    body: "Browse the catalog, upload spectra, and edit datasets from the terminal.",
  },
  {
    href: "/docs/python",
    title: "Programmatic access",
    body: "Python and Igor Pro clients for loading spectra into analysis code. Coming soon.",
  },
  {
    href: "/docs/editors",
    title: "Editor extensions",
    body: "VS Code and Zed packages for using the catalog where you work. Coming soon.",
  },
  {
    title: "MCP",
    body: "Coming soon.",
  },
];

/**
 * Home documentation stage.
 *
 * The wiki and the developer clients use the same divided display list as
 * the feature stage. Stages above and below are listed in document order.
 */
export function HomeDocsPicks(): ReactElement {
  return (
    <section id="home-docs" aria-label="Documentation" className="home-stage">
      <HomeStageJumpList currentId="home-docs" edge="above" />
      <div className="flex w-full flex-1 items-center">
        <div className="grid w-full items-start gap-12 lg:grid-cols-2 lg:grid-rows-[auto_repeat(4,minmax(0,auto))] lg:items-stretch lg:gap-x-16 lg:gap-y-0">
          <DocColumn kicker="Wiki" href="/wiki" entries={WIKI_ENTRIES} />
          <DocColumn
            kicker="Developer"
            href="/docs"
            entries={DEVELOPER_ENTRIES}
          />
        </div>
      </div>
      <HomeStageJumpList currentId="home-docs" edge="below" />
    </section>
  );
}

/**
 * Display name and sentence for one documentation row.
 *
 * @param props.title - Row name.
 * @param props.body - Sentence under the name.
 * @param props.quiet - Renders the name in the muted color for an unpublished row.
 */
function DocEntryLabel(props: {
  title: string;
  body: string;
  quiet?: boolean;
}): ReactElement {
  return (
    <>
      <span className="flex items-center justify-between gap-3">
        <span
          className={`font-display text-2xl leading-none font-normal tracking-tight sm:text-3xl ${props.quiet ? "text-muted" : "text-foreground"}`}
        >
          {props.title}
        </span>
        {props.quiet ? null : (
          <ArrowRightIcon
            className="size-5 shrink-0 opacity-0 transition-transform group-hover:translate-x-1 group-hover:opacity-60 group-focus-visible:translate-x-1 group-focus-visible:opacity-60 sm:size-6"
            aria-hidden
          />
        )}
      </span>
      <span className="text-muted mt-2 block max-w-sm text-sm leading-6">
        {props.body}
      </span>
    </>
  );
}

/**
 * One documentation column: a kicker that opens the index, then display-sized links.
 *
 * @param props.kicker - Column name, linked to the index.
 * @param props.href - Index path for this column.
 * @param props.entries - Links in this column.
 */
function DocColumn(props: {
  kicker: string;
  href: string;
  entries: readonly DocEntry[];
}): ReactElement {
  return (
    <div className="min-w-0 lg:row-span-5 lg:grid lg:grid-rows-subgrid">
      <Link
        href={props.href}
        className="home-kicker mb-3 inline-block lg:mb-0 lg:pb-3"
      >
        {props.kicker}
      </Link>
      {props.entries.map((entry) =>
        entry.href ? (
          <Link
            key={entry.title}
            href={entry.href}
            className="group border-border block w-full border-t py-3 no-underline"
          >
            <DocEntryLabel title={entry.title} body={entry.body} />
          </Link>
        ) : (
          <div key={entry.title} className="border-border border-t py-3">
            <DocEntryLabel title={entry.title} body={entry.body} quiet />
          </div>
        ),
      )}
    </div>
  );
}
