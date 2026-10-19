"use client";

import { useState, type ReactElement } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { cn } from "@heroui/styles";
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

type DocColumnId = "wiki" | "developer";

/**
 * Home documentation stage.
 *
 * Wide windows show the wiki and the developer clients side by side. Narrow
 * windows show one column at a time, switched from the Wiki and Developer
 * tabs, so the stage stays within the viewport. Stages above and below are
 * listed in document order.
 */
export function HomeDocsPicks(): ReactElement {
  const [column, setColumn] = useState<DocColumnId>("wiki");

  return (
    <section id="home-docs" aria-label="Documentation" className="home-stage">
      <HomeStageJumpList currentId="home-docs" edge="above" />
      <div className="flex w-full min-w-0 flex-1 items-center">
        <div className="grid w-full min-w-0 items-start lg:grid-cols-2 lg:grid-rows-[auto_repeat(4,minmax(0,auto))] lg:items-stretch lg:gap-x-16 lg:gap-y-0">
          <div
            role="tablist"
            aria-label="Documentation"
            className="mb-4 hidden items-end gap-6 max-lg:flex"
          >
            <DocTab
              id="home-docs-tab-wiki"
              controls="home-docs-wiki"
              label="Wiki"
              selected={column === "wiki"}
              onSelect={() => setColumn("wiki")}
            />
            <DocTab
              id="home-docs-tab-developer"
              controls="home-docs-developer"
              label="Developer"
              selected={column === "developer"}
              onSelect={() => setColumn("developer")}
            />
          </div>
          <DocColumn
            id="home-docs-wiki"
            labelledBy="home-docs-tab-wiki"
            kicker="Wiki"
            href="/wiki"
            entries={WIKI_ENTRIES}
            visible={column === "wiki"}
          />
          <DocColumn
            id="home-docs-developer"
            labelledBy="home-docs-tab-developer"
            kicker="Developer"
            href="/docs"
            entries={DEVELOPER_ENTRIES}
            visible={column === "developer"}
          />
        </div>
      </div>
      <HomeStageJumpList currentId="home-docs" edge="below" />
    </section>
  );
}

/**
 * Narrow-window control that shows one documentation column.
 *
 * @param props.id - DOM id referenced by the panel.
 * @param props.controls - Panel id this tab shows.
 * @param props.label - Visible tab name.
 * @param props.selected - Whether this column is the one on screen.
 * @param props.onSelect - Shows this column.
 */
function DocTab(props: {
  id: string;
  controls: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      id={props.id}
      role="tab"
      aria-selected={props.selected}
      aria-controls={props.controls}
      onClick={props.onSelect}
      className={cn(
        "border-b-2 pb-1",
        props.selected
          ? "home-kicker border-accent"
          : "home-label border-transparent",
      )}
    >
      {props.label}
    </button>
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
 * @param props.id - DOM id of the panel.
 * @param props.labelledBy - Tab id that names this panel.
 * @param props.kicker - Column name, linked to the index on wide windows.
 * @param props.href - Index path for this column.
 * @param props.entries - Links in this column.
 * @param props.visible - Whether the narrow-window tab has this column selected.
 */
function DocColumn(props: {
  id: string;
  labelledBy: string;
  kicker: string;
  href: string;
  entries: readonly DocEntry[];
  visible: boolean;
}): ReactElement {
  return (
    <div
      id={props.id}
      role="tabpanel"
      aria-labelledby={props.labelledBy}
      className={cn(
        "min-w-0 lg:row-span-5 lg:grid lg:grid-rows-subgrid",
        props.visible ? "" : "max-lg:hidden",
      )}
    >
      <Link
        href={props.href}
        className="home-kicker mb-3 hidden lg:mb-0 lg:inline-block lg:pb-3"
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
