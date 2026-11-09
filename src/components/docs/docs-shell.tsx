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
export function DocsShell({ children }: { children: ReactNode }): ReactElement {
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
                  const childSelected = item.children?.some((c) => c.href === current) ?? false;
                  if (item.children && item.children.length > 0) {
                    return (
                      <li key={item.href}>
                        <details open={selected || childSelected} className="group">
                          <summary className="text-muted hover:text-foreground flex cursor-pointer list-none items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-sm font-medium">
                            <span>{item.label}</span>
                            <span className="text-xs">▾</span>
                          </summary>
                          <div className="px-2 pb-1">
                            <Link
                              href={hrefForDocsVersion(item.href, pinned)}
                              className={cn("block rounded-md px-2 py-1 text-xs", selected ? "bg-surface text-foreground font-medium" : "text-muted hover:text-foreground")}
                            >
                              Overview
                            </Link>
                          </div>
                          <ul className="mt-0.5 ml-3 space-y-0.5 border-l border-border/40 pl-2">
                            {item.children.map((child) => {
                              const csel = child.href === current;
                              return (
                                <li key={child.href}>
                                  <Link
                                    href={hrefForDocsVersion(child.href, pinned)}
                                    aria-current={csel ? "page" : undefined}
                                    className={cn("block rounded-md px-2 py-1 text-sm", csel ? "bg-surface text-foreground font-medium" : "text-muted hover:text-foreground")}
                                  >
                                    {child.label}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </details>
                      </li>
                    );
                  }
                  return (
                    <li key={item.href}>
                      <Link
                        href={hrefForDocsVersion(item.href, pinned)}
                        aria-current={selected ? "page" : undefined}
                        className={cn(
                          "flex items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-sm",
                          selected ? "bg-surface text-foreground font-medium" : "text-muted hover:text-foreground",
                        )}
                      >
                        <span>{item.label}</span>
                        {item.status === "soon" ? (
                          <span className="text-muted text-xs tracking-wide uppercase">Soon</span>
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
