import type { Metadata } from "next";
import { site } from "~/app/brand";
import { DocsPathLink } from "~/components/docs/docs-path-link";
import { docsSectionCards } from "~/lib/docs-nav";

export const metadata: Metadata = {
  title: "Dev Docs",
  description: `Developer documentation for the ${site.name} HTTP API and client tools.`,
  alternates: {
    canonical: "/docs",
  },
};

/**
 * Renders the developer docs landing page.
 */
export default function DocsHomePage() {
  return (
    <article className="w-full min-w-0 space-y-10">
      <header className="max-w-2xl space-y-4">
        <h1 className="font-display text-foreground text-4xl font-semibold tracking-tight sm:text-5xl">
          Dev Docs
        </h1>
        <div className="bg-accent/70 h-0.5 w-12 rounded-full" aria-hidden />
        <p className="text-muted text-lg leading-8">
          Reference for the {site.name} catalog interface and the clients that
          call it. The spectroscopy reference stays in the wiki.
        </p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {docsSectionCards.map((section) => (
          <li key={section.href}>
            <DocsPathLink
              href={section.href}
              className="border-border bg-surface hover:border-foreground/30 flex h-full flex-col gap-2 rounded-xl border p-5 no-underline transition-colors"
            >
              <span className="text-muted text-xs tracking-wide uppercase">
                {section.status}
              </span>
              <span className="text-foreground text-lg font-medium">
                {section.title}
              </span>
              <span className="text-muted text-sm leading-6">
                {section.body}
              </span>
            </DocsPathLink>
          </li>
        ))}
      </ul>
    </article>
  );
}
