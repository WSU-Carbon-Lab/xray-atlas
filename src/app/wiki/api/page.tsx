import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { site } from "~/app/brand";

export const metadata: Metadata = {
  title: "API",
  description: `How to read the ${site.name} catalog over HTTP and create an API key for scripts.`,
  alternates: {
    canonical: "/wiki/api",
  },
};

const keySteps: readonly { title: string; body: ReactNode }[] = [
  {
    title: "Sign in",
    body: (
      <>
        New accounts use{" "}
        <a
          className="text-accent hover:underline"
          href="https://orcid.org"
          rel="noopener noreferrer"
          target="_blank"
        >
          ORCID
        </a>
        . GitHub links to an existing account; it does not create one.
      </>
    ),
  },
  {
    title: "Open Security",
    body: (
      <>
        Open your own profile and the Security tab. The profile page is{" "}
        <code className="text-foreground">/users/{"{orcid}"}</code>.
      </>
    ),
  },
  {
    title: "Register a passkey",
    body: (
      <>
        Create and Revoke stay disabled until a passkey is registered. The alert
        says: Register a passkey above before creating or revoking an API key.
      </>
    ),
  },
  {
    title: "Confirm when asked",
    body: "Creating or revoking a key asks for a passkey confirmation when the session is not already stepped up. That confirmation lasts 30 days.",
  },
  {
    title: "Name the key",
    body: "Enter a name, 1 to 64 characters. The field placeholder is Lab script. Then choose Create API key.",
  },
  {
    title: "Copy the token",
    body: (
      <>
        Copy the full token immediately. It is shown once and starts with{" "}
        <code className="text-foreground">xra_</code>. The list afterward shows
        the name and a short prefix, not the secret.
      </>
    ),
  },
  {
    title: "Revoke to free a slot",
    body: "An account may have 10 active keys. Revoke frees a slot. A revoked key stops working. The confirm dialog says scripts using that name will stop working.",
  },
];

/**
 * Renders the API wiki overview: public catalog reads, and the Security-tab
 * steps for creating an account API key.
 */
export default function ApiWikiHomePage() {
  return (
    <article className="w-full min-w-0 space-y-4">
      <h1 className="text-foreground text-4xl font-bold">API</h1>
      <h2 id="overview" className="text-foreground mb-2 text-xl font-semibold">
        Overview
      </h2>
      <p className="text-muted">
        Current <code className="text-foreground">/api/v1</code> routes are
        public GET requests for molecule and dataset discovery, dataset export,
        physics tables, and the OpenAPI document. Molecule search returns a 307
        to the molecule page or the browse list. Reading the catalog does not
        require a key.
      </p>
      <dl className="border-border divide-border divide-y rounded-lg border">
        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-foreground font-medium">Catalog reads</dt>
          <dd className="text-muted">
            No key. Start at{" "}
            <Link className="text-accent hover:underline" href="/wiki/api/v1">
              v1
            </Link>
            , then{" "}
            <Link
              className="text-accent hover:underline"
              href="/wiki/api/v1/molecules"
            >
              molecules
            </Link>
            ,{" "}
            <Link
              className="text-accent hover:underline"
              href="/wiki/api/v1/datasets"
            >
              datasets
            </Link>
            , and{" "}
            <Link
              className="text-accent hover:underline"
              href="/wiki/api/v1/physics"
            >
              physics
            </Link>
            . <code className="text-foreground">GET /api/v1/openapi</code> is
            JSON. Add <code className="text-foreground">?format=yaml</code> for
            YAML.
          </dd>
        </div>
        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-foreground font-medium">API keys</dt>
          <dd className="text-muted">
            For scripts and notebooks that submit data outside the website.
            Contribute and edit on the website use the signed-in session. Send{" "}
            <code className="text-foreground">Authorization: Bearer</code> only
            on routes that change catalog data. Those routes are not in v1
            today.
          </dd>
        </div>
      </dl>
      <h2 id="api-keys" className="text-foreground mb-2 text-xl font-semibold">
        API keys
      </h2>
      <p className="text-muted">
        Create a key on your own profile. The website never asks for this token
        during contribute or edit.
      </p>
      <ol className="space-y-0">
        {keySteps.map((step, index) => (
          <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
            {index < keySteps.length - 1 ? (
              <span
                className="bg-border absolute top-8 left-3.5 h-[calc(100%-1.25rem)] w-px"
                aria-hidden
              />
            ) : null}
            <span className="border-border bg-surface text-foreground relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-medium">
              {index + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-foreground font-medium">{step.title}</p>
              <p className="text-muted mt-1">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}
