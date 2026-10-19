"use client";

import { cn } from "@heroui/styles";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement, ReactNode } from "react";
import { ApiTryConsole } from "~/components/about/api-try-console";
import {
  canonicalDocsPath,
  docsVersionFromPath,
  hrefForDocsVersion,
} from "~/lib/docs-versions";

interface ApiDocPage {
  readonly href: string;
  readonly label: string;
}

const API_DOC_PAGES: readonly ApiDocPage[] = [
  { href: "/docs/api/v1", label: "Overview" },
  { href: "/docs/api/v1/molecules", label: "Molecules" },
  { href: "/docs/api/v1/datasets", label: "Datasets" },
  { href: "/docs/api/v1/physics", label: "Physics" },
];

/**
 * Shared column for the HTTP API reference.
 *
 * `children` is the page body. Resource links and the try console use the
 * same full width as that body. The docs release is the selector in the
 * left rail.
 *
 * @returns The resource nav, try console, and page body.
 */
export function ApiDocChrome({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const browserPath = usePathname();
  const pathname = canonicalDocsPath(browserPath);
  const pinned = docsVersionFromPath(browserPath);

  return (
    <div className="w-full min-w-0 space-y-8">
      <nav
        aria-label="HTTP API resources"
        className="border-border flex gap-4 border-b"
      >
        {API_DOC_PAGES.map((page) => {
          const selected = pathname === page.href;
          return (
            <Link
              key={page.href}
              href={hrefForDocsVersion(page.href, pinned)}
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
