/**
 * Layout for `/docs`.
 *
 * Breaks out of the root `max-w-7xl` column the same way the wiki does, then
 * applies the developer docs shell. This tree is not the spectroscopy wiki.
 */

import type { ReactElement, ReactNode } from "react";
import { DocsShell } from "~/components/docs/docs-shell";

export default function DocsLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <div className="relative mx-[calc(-50vw+50%)] box-border w-screen max-w-[100vw] px-4 sm:px-6 lg:px-8">
      <DocsShell>{children}</DocsShell>
    </div>
  );
}
