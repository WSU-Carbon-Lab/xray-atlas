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
        returns a 307 to the molecule page or the browse list. Account, token,
        version, and write routes require{" "}
        <code className="text-foreground">Authorization: Bearer</code> with a
        credential from the{" "}
        <DocsPathLink className="text-accent hover:underline" href="/docs/cli">
          CLI
        </DocsPathLink>
        . The website writes through the signed-in session and does not use
        these routes. The API stays on v1. Changes to v1 are additive: new
        routes and optional fields. A breaking change would ship as v2 together
        with a v2 CLI.
      </p>
      <h2 id="writes" className="text-foreground mb-2 text-xl font-semibold">
        Writes, scopes, and versions
      </h2>
      <dl className="border-border divide-border divide-y rounded-lg border">
        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-foreground font-medium">Scopes</dt>
          <dd className="text-muted">
            A token carries <code className="text-foreground">read</code>, or{" "}
            <code className="text-foreground">read</code> and{" "}
            <code className="text-foreground">write</code>, as approved at
            login. Reads need read. Every write route needs write and fails with
            403 on a read-only token. A token lasts 30 days and has no refresh.
            Write routes accept tokens only and ignore cookies.
          </dd>
        </div>
        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-foreground font-medium">Errors</dt>
          <dd className="text-muted">
            Write routes and the token-authenticated routes report failures as{" "}
            <code className="text-foreground">
              {'{ "error": { "code", "message", "appCode"? } }'}
            </code>
            . 401 is a missing, expired, or revoked token. 403 is a missing
            scope, a dataset you may not edit, or an unaccepted contribution
            agreement, which carries{" "}
            <code className="text-foreground">
              CONTRIBUTION_AGREEMENT_REQUIRED
            </code>{" "}
            as message and <code className="text-foreground">appCode</code>. 404
            is an unknown id. 409 is a stale version. 422 is invalid input, with
            Zod messages as{" "}
            <code className="text-foreground">path: message</code> pairs. 400 is
            malformed JSON. 500 carries a generic message.
          </dd>
        </div>
        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-foreground font-medium">Dataset versions</dt>
          <dd className="text-muted">
            A dataset version is{" "}
            <code className="text-foreground">major.minor.patch</code> and
            starts at 1.0.0. Adding or removing auxiliary data is a minor bump.
            A new normalization or Kramers-Kronig calculation is a patch bump.
            Peak, contributor, publication, and sample metadata edits do not
            bump. A major bump, for a replacement upload, is coming soon and not
            available. Each bump mints a new Zenodo version only where the
            dataset already has a Zenodo deposit. An edit never creates a
            deposit. A new Zenodo version can show a pending DOI while the
            server retries.
          </dd>
        </div>
        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-foreground font-medium">Confirming a bump</dt>
          <dd className="text-muted">
            A route that bumps the version needs{" "}
            <code className="text-foreground">
              {'confirmVersionBump: { "fromVersion": "M.m.p" }'}
            </code>
            . Call a preview-bump route first to learn the next version and
            whether a Zenodo version will be minted, then send the current
            version back as <code className="text-foreground">fromVersion</code>
            . A missing field is a 422. A version that changed since the preview
            is a 409 and nothing is saved. Add files through an upload session
            to coalesce them into one minor bump.
          </dd>
        </div>
        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-foreground font-medium">Older versions</dt>
          <dd className="text-muted">
            Export and preview accept{" "}
            <code className="text-foreground">version=M.m.p</code> for the
            current version and echo it. Any older version answers 422:
            retrieving a past version is not available yet.
          </dd>
        </div>
      </dl>
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
