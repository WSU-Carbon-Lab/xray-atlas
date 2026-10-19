import type { Metadata } from "next";
import type { ReactElement } from "react";
import { site } from "~/app/brand";
import { DocsPathLink } from "~/components/docs/docs-path-link";
import { InstallDeveloperAccordion } from "~/components/docs/install-developer-accordion";
import { InstallGuide } from "~/components/docs/install-guide";

export const metadata: Metadata = {
  title: "Installing",
  description: `Install the ${site.name} catalog CLI.`,
  alternates: {
    canonical: "/docs/installing",
  },
};

/**
 * Renders the client install guide.
 */
export default function InstallingDocsPage(): ReactElement {
  return (
    <article className="w-full min-w-0 space-y-10">
      <header className="max-w-2xl space-y-3">
        <h1 className="font-display text-foreground text-4xl font-semibold tracking-tight sm:text-5xl">
          Installing
        </h1>
        <p className="text-muted text-lg leading-8">
          The published client is the catalog CLI. It runs on{" "}
          <a
            className="text-accent hover:underline"
            href="https://bun.sh"
            rel="noopener noreferrer"
            target="_blank"
          >
            Bun
          </a>
          . Install one command name:{" "}
          <code className="text-foreground">xatlas</code>,{" "}
          <code className="text-foreground">xa</code>, or{" "}
          <code className="text-foreground">atlas</code>.
        </p>
      </header>
      <InstallGuide />
      <section className="space-y-3">
        <h2 id="developers" className="text-foreground text-xl font-semibold">
          Developers
        </h2>
        <InstallDeveloperAccordion />
      </section>
      <section className="space-y-3">
        <h2
          id="other-clients"
          className="text-foreground text-xl font-semibold"
        >
          Other clients
        </h2>
        <p className="text-muted">
          Login and catalog commands are on the{" "}
          <DocsPathLink
            className="text-accent hover:underline"
            href="/docs/cli"
          >
            CLI
          </DocsPathLink>{" "}
          page.{" "}
          <DocsPathLink
            className="text-accent hover:underline"
            href="/docs/editors"
          >
            Editors
          </DocsPathLink>
          ,{" "}
          <DocsPathLink
            className="text-accent hover:underline"
            href="/docs/python"
          >
            Python
          </DocsPathLink>
          , and{" "}
          <DocsPathLink
            className="text-accent hover:underline"
            href="/docs/igor"
          >
            Igor Pro
          </DocsPathLink>{" "}
          have repository slots and no published package.
        </p>
      </section>
    </article>
  );
}
