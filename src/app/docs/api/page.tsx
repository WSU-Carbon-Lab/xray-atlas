import type { Metadata } from "next";
import { site } from "~/app/brand";
import { DocsPathLink } from "~/components/docs/docs-path-link";

export const metadata: Metadata = {
  title: "HTTP API",
  description: `HTTP reference for the ${site.name} catalog under /api/v1.`,
  alternates: {
    canonical: "/docs/api",
  },
};

/**
 * Renders the HTTP API overview. Credential minting lives in the CLI docs.
 */
export default function ApiWikiHomePage() {
  return (
    <article className="w-full min-w-0 space-y-4">
      <h1 className="text-foreground text-4xl font-bold">HTTP API</h1>
      <h2 id="overview" className="text-foreground mb-2 text-xl font-semibold">
        Overview
      </h2>
      <p className="text-muted">
        Catalog routes are public GET requests under{" "}
        <code className="text-foreground">/api/v1</code>. Molecule search
        returns a 307 to the molecule page or the browse list.{" "}
        <code className="text-foreground">GET /api/v1/me</code> and{" "}
        <code className="text-foreground">DELETE /api/v1/me</code> require{" "}
        <code className="text-foreground">Authorization: Bearer</code> with a
        read credential. Mint that credential with the{" "}
        <DocsPathLink className="text-accent hover:underline" href="/docs/cli">
          CLI
        </DocsPathLink>
        . The website writes through the signed-in session.
      </p>
      <h2 id="catalog" className="text-foreground mb-2 text-xl font-semibold">
        Catalog
      </h2>
      <dl className="border-border divide-border divide-y rounded-lg border">
        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-foreground font-medium">Routes</dt>
          <dd className="text-muted">
            <DocsPathLink
              className="text-accent hover:underline"
              href="/docs/api/v1/molecules"
            >
              Molecules
            </DocsPathLink>
            ,{" "}
            <DocsPathLink
              className="text-accent hover:underline"
              href="/docs/api/v1/datasets"
            >
              datasets
            </DocsPathLink>
            , and{" "}
            <DocsPathLink
              className="text-accent hover:underline"
              href="/docs/api/v1/physics"
            >
              physics
            </DocsPathLink>
            . <code className="text-foreground">GET /api/v1/openapi</code> is
            JSON. Add <code className="text-foreground">?format=yaml</code> for
            YAML.
          </dd>
        </div>
        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-foreground font-medium">Presented keys</dt>
          <dd className="text-muted">
            Molecule and dataset lists stay public when no Authorization header
            is sent. A presented key that is malformed, unknown, or revoked
            returns 401.
          </dd>
        </div>
      </dl>
    </article>
  );
}
