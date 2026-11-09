import type { Metadata } from "next";
import type { ReactElement } from "react";
import { DocsCommandBlock } from "~/components/docs/docs-command-block";

export const metadata: Metadata = {
  title: "Python: FAQ",
  alternates: { canonical: "/docs/python/faq" },
};

export default function Page(): ReactElement {
  return (
    <article className="w-full min-w-0 space-y-8">
      <h1 className="font-display text-foreground text-3xl font-semibold">
        Frequently asked questions
      </h1>
      <section className="space-y-3">
        <h2 className="text-foreground text-xl font-semibold">
          Environment variables
        </h2>
        <ul className="text-muted max-w-2xl list-disc space-y-1 pl-5 leading-7">
          <li>
            <code className="text-foreground">XRAYATLAS_TOKEN</code> — bearer
            token overriding the credential file.
          </li>
          <li>
            <code className="text-foreground">XRAYATLAS_HOST</code> — Atlas
            origin overriding the credential file&apos;s host.
          </li>
          <li>
            <code className="text-foreground">XDG_CONFIG_HOME</code> — base
            directory for the credential file.
          </li>
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="text-foreground text-xl font-semibold">Install</h2>
        <p className="text-muted max-w-2xl leading-7">
          Install from PyPI with pip or add it to a uv project:
        </p>
        <DocsCommandBlock command="pip install xrayatlas" />
        <DocsCommandBlock command="uv add xrayatlas" />
      </section>
    </article>
  );
}
