"use client";

import { cn } from "@heroui/styles";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement, ReactNode } from "react";
import { ApiTryConsole } from "~/components/about/api-try-console";

interface ApiDocVersion {
  readonly id: string;
  readonly href: string;
  readonly label: string;
}

interface ApiDocPage {
  readonly href: string;
  readonly label: string;
}

const API_DOC_VERSIONS: readonly ApiDocVersion[] = [
  { id: "v1", href: "/wiki/api/v1", label: "v1" },
];

const API_DOC_PAGES: readonly ApiDocPage[] = [
  { href: "/wiki/api/v1", label: "Overview" },
  { href: "/wiki/api/v1/molecules", label: "Molecules" },
  { href: "/wiki/api/v1/datasets", label: "Datasets" },
  { href: "/wiki/api/v1/physics", label: "Physics" },
];

/**
 * Shared column for versioned API docs.
 *
 * `children` is the page body. The version control, resource links, and try
 * console use the same full width as that body. Published versions are the
 * entries in `API_DOC_VERSIONS`.
 *
 * @returns The version bar, resource nav, try console, and page body.
 */
export function ApiDocChrome({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const pathname = usePathname();

  return (
    <div className="w-full min-w-0 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="border-border bg-surface inline-flex rounded-lg border p-0.5"
          role="navigation"
          aria-label="API version"
        >
          {API_DOC_VERSIONS.map((version) => {
            const selected =
              pathname === version.href ||
              pathname.startsWith(`${version.href}/`);
            return (
              <Link
                key={version.id}
                href={version.href}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1 text-sm font-medium",
                  selected
                    ? "bg-foreground text-background"
                    : "text-muted hover:text-foreground",
                )}
              >
                {version.label}
              </Link>
            );
          })}
        </div>
        <p className="text-muted text-sm">Published version</p>
      </div>
      <nav
        aria-label="v1 resources"
        className="border-border flex gap-4 border-b"
      >
        {API_DOC_PAGES.map((page) => {
          const selected = pathname === page.href;
          return (
            <Link
              key={page.href}
              href={page.href}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-0.5 pb-2 text-sm font-medium",
                selected
                  ? "border-foreground text-foreground"
                  : "text-muted hover:text-foreground border-transparent",
              )}
            >
              {page.label}
            </Link>
          );
        })}
      </nav>
      <ApiTryConsole key={pathname} />
      {children}
    </div>
  );
}
