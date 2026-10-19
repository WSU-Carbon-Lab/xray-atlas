"use client";

/**
 * Release switcher for Dev Docs.
 *
 * Shows the Next.js-style Latest label and version. Choosing a release pins
 * the current page under `/docs/v/<id>`. Latest returns to the unversioned URL.
 */

import { ChevronsUpDown, Tag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";
import {
  canonicalDocsPath,
  docsVersionFromPath,
  docsVersions,
  hrefForDocsVersion,
  latestDocsVersion,
} from "~/lib/docs-versions";

/**
 * Renders the docs release menu.
 *
 * Latest keeps the unversioned `/docs` path. A catalog release pins the same
 * page under `/docs/v/<id>`.
 */
export function DocsVersionSelector(): ReactElement {
  const pathname = usePathname();
  const canonical = canonicalDocsPath(pathname);
  const latest = latestDocsVersion();
  const pinned = docsVersionFromPath(pathname);
  const showingLatest = pinned === null || pinned.latest;
  const shown = pinned ?? latest;

  return (
    <PopoverMenu
      align="start"
      placement="bottom-start"
      rootClassName="relative mb-6"
      renderTrigger={({ triggerProps }) => (
        <button
          {...triggerProps}
          type="button"
          aria-label={`Documentation version ${shown.label}`}
          className="border-border bg-surface hover:bg-background flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left"
        >
          <span className="border-border text-accent flex size-8 shrink-0 items-center justify-center rounded-md border">
            <Tag className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            {showingLatest ? (
              <span className="text-foreground block text-sm font-medium">
                Latest
              </span>
            ) : null}
            <span className="text-muted block text-xs">{shown.label}</span>
          </span>
          <ChevronsUpDown className="text-muted size-4 shrink-0" aria-hidden />
        </button>
      )}
      renderContent={({ close, contentProps }) => (
        <PopoverMenuContent {...contentProps} className="w-56 p-1">
          <ul className="flex flex-col">
            <li>
              <VersionChoice
                href={hrefForDocsVersion(canonical, null)}
                label="Latest"
                detail={latest.label}
                selected={pinned === null}
                onNavigate={close}
              />
            </li>
            {docsVersions.map((version) => (
              <li key={version.id}>
                <VersionChoice
                  href={hrefForDocsVersion(canonical, version)}
                  label={version.label}
                  detail={version.latest ? "Current release" : "Pinned release"}
                  selected={pinned?.id === version.id}
                  onNavigate={close}
                />
              </li>
            ))}
          </ul>
        </PopoverMenuContent>
      )}
    />
  );
}

function VersionChoice({
  href,
  label,
  detail,
  selected,
  onNavigate,
}: {
  href: string;
  label: string;
  detail: string;
  selected: boolean;
  onNavigate: () => void;
}): ReactElement {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      onClick={onNavigate}
      className="hover:bg-background flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 no-underline"
    >
      <span className="text-foreground text-sm">{label}</span>
      <span className="text-muted text-xs">{detail}</span>
    </Link>
  );
}
