"use client";

/**
 * In-page links inside Dev Docs.
 *
 * Keeps the reader on the release they opened. Unversioned `/docs` stays
 * unversioned. `/docs/v/<id>` stays on that id.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement, ReactNode } from "react";
import { docsVersionFromPath, hrefForDocsVersion } from "~/lib/docs-versions";

/**
 * Links to another Dev Docs page on the same release.
 *
 * @param props.href - Unversioned docs path such as `/docs/cli`.
 * @param props.className - Classes for the anchor.
 * @param props.children - Link label.
 */
export function DocsPathLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}): ReactElement {
  const pinned = docsVersionFromPath(usePathname());
  return (
    <Link className={className} href={hrefForDocsVersion(href, pinned)}>
      {children}
    </Link>
  );
}
