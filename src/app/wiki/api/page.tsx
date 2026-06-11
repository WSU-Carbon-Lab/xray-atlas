import type { Metadata } from "next";
import Link from "next/link";
import { site } from "~/app/brand";

export const metadata: Metadata = {
  title: "API",
  description: `OpenAPI-first API documentation for ${site.name} researcher workflows.`,
  alternates: {
    canonical: "/wiki/api",
  },
};

export default function ApiWikiHomePage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <h1 className="text-foreground text-4xl font-bold">API</h1>
      <section className="border-border bg-surface rounded-lg border p-4">
        <h2
          id="overview"
          className="text-foreground mb-2 text-lg font-semibold"
        >
          OpenAPI-first documentation workflow
        </h2>
        <p className="text-muted text-sm leading-relaxed">
          This API surface is documented with OpenAPI as the source of truth.
          Route pages in this section are human-readable summaries that must
          match the published OpenAPI contract at <code>/api/v1/openapi</code>.
        </p>
        <ul className="text-muted mt-3 ml-6 list-disc space-y-1 text-sm">
          <li>Design contract changes in OpenAPI first.</li>
          <li>Implement routes to satisfy the contract.</li>
          <li>
            Keep each route page synchronized with unauthenticated behavior.
          </li>
          <li>
            Use examples and response semantics aligned with OpenAPI operation
            definitions.
          </li>
        </ul>
      </section>
      <section className="border-border bg-surface rounded-lg border p-4">
        <h2
          id="contract-version"
          className="text-foreground mb-2 text-lg font-semibold"
        >
          Contract and version index
        </h2>
        <p className="text-muted mb-3 text-sm">
          All documented routes in <code>v1</code> are available to
          non-authenticated users.
        </p>
        <ul className="ml-6 list-disc space-y-1 text-sm">
          <li>
            <Link
              className="text-accent hover:underline"
              href="/wiki/api/openapi"
            >
              OpenAPI
            </Link>
          </li>
          <li>
            <Link className="text-accent hover:underline" href="/wiki/api/v1">
              v1
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
