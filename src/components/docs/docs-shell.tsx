"use client";

/**
 * Developer docs chrome.
 *
 * A left section rail and a main column. The landing page and each guide
 * share this shell. The wiki science reference does not.
 */

import { cn } from "@heroui/styles";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement, ReactNode } from "react";
import { DocsVersionSelector } from "~/components/docs/docs-version-selector";
import { activeDocsHref, docsNavGroups } from "~/lib/docs-nav";
import { docsVersionFromPath, hrefForDocsVersion } from "~/lib/docs-versions";

/**
 * Renders the docs sidebar and page body.
 *
 * @param props.children - The active docs page.
 */
export function DocsShell({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const pathname = usePathname();
  const current = activeDocsHref(pathname);
  const pinned = docsVersionFromPath(pathname);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 py-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12 lg:py-10">
      <nav aria-label="Dev Docs" className="lg:sticky lg:top-20 lg:self-start">
        <DocsVersionSelector />
        <div className="flex gap-6 overflow-x-auto lg:block lg:space-y-6 lg:overflow-visible">
          {docsNavGroups.map((group) => (
            <div key={group.label} className="min-w-40 shrink-0 lg:min-w-0">
              <p className="text-muted mb-2 text-xs font-medium tracking-wide uppercase">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const selected = item.href === current;
                  return (
                    <li key={item.href}>
                      <Link
                        href={hrefForDocsVersion(item.href, pinned)}
                        aria-current={selected ? "page" : undefined}
                        className={cn(
                          "flex items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-sm",
                          selected
                            ? "bg-surface text-foreground font-medium"
                            : "text-muted hover:text-foreground",
                        )}
                      >
                        <span>{item.label}</span>
                        {item.status === "soon" ? (
                          <span className="text-muted text-xs tracking-wide uppercase">
                            Soon
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
