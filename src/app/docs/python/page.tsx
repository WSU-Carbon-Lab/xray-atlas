import type { Metadata } from "next";
import type { ReactElement } from "react";
import { site } from "~/app/brand";
import { DocsCodeBlock } from "~/components/docs/docs-code-block";
import { DocsCommandBlock } from "~/components/docs/docs-command-block";
import { DocsPathLink } from "~/components/docs/docs-path-link";
import { latestDocsVersion } from "~/lib/docs-versions";
import { quickstart, explicitClient } from "~/lib/docs/python-snippets";

export const metadata: Metadata = {
  title: "Python",
  description: `Pull ${site.name} datasets and optical models into Python, then build, publish, compare, and pin models with the xrayatlas client.`,
  alternates: { canonical: "/docs/python" },
};

export default function PythonDocsPage(): ReactElement {
  const release = latestDocsVersion();
  return (
    <article className="w-full min-w-0 space-y-12">
      <header className="max-w-2xl space-y-3">
        <p className="text-muted text-xs font-medium tracking-wide uppercase">
          Clients
        </p>
        <h1 className="font-display text-foreground text-4xl font-semibold tracking-tight sm:text-5xl">
          Python
        </h1>
        <p className="text-muted text-lg leading-8">
          <code className="text-foreground">xrayatlas</code> pulls NEXAFS
          datasets, metadata, auxiliary files, and optical models into analysis
          code. It also builds, publishes, shares, forks, reviews, compares,
          cites, and locks models.
        </p>
        <p className="text-muted text-sm leading-6">
          The client never fits peaks, computes optical constants, or normalizes
          spectra. Normalization is computed by the server from the windows
          stored in a model version, and the peaks and parameter payloads you
          upload come from your own analysis code. This guide covers client{" "}
          <code className="text-foreground">0.1.0</code>; the version selector
          tracks docs release {release.label}, not the package.
        </p>
      </header>

      <nav
        aria-label="On this page"
        className="text-muted flex flex-wrap gap-x-4 gap-y-1 text-sm"
      >
        <a className="hover:text-foreground" href="#get-started">
          Get started
        </a>
        <a className="hover:text-foreground" href="#where-to-go">
          Where to go
        </a>
      </nav>

      <section id="get-started" className="space-y-4">
        <h2 className="text-foreground text-2xl font-semibold">Get started</h2>
        <p className="text-muted max-w-2xl leading-7">
          The package is on PyPI as{" "}
          <code className="text-foreground">xrayatlas</code> and requires Python
          3.10 or newer:
        </p>
        <DocsCommandBlock command="pip install xrayatlas" />
        <p className="text-muted max-w-2xl leading-7">
          Site setup is on{" "}
          <DocsPathLink
            className="text-accent hover:underline"
            href="/docs/installing"
          >
            Installing
          </DocsPathLink>
          . The client shares the credential file written by{" "}
          <DocsPathLink
            className="text-accent hover:underline"
            href="/docs/cli"
          >
            xatlas login
          </DocsPathLink>
          , so sign in once:
        </p>
        <DocsCommandBlock command="xatlas login" />
        <p className="text-muted max-w-2xl leading-7">
          The client reads{" "}
          <code className="text-foreground">
            $XDG_CONFIG_HOME/xatlas/credentials.json
          </code>{" "}
          (default{" "}
          <code className="text-foreground">
            ~/.config/xatlas/credentials.json
          </code>
          ). <code className="text-foreground">XRAYATLAS_TOKEN</code> and{" "}
          <code className="text-foreground">XRAYATLAS_HOST</code> override the
          file. A token is attached only for the host it was issued for. Public
          datasets and public models read anonymously; writes need a token.
        </p>
        <p className="text-muted max-w-2xl leading-7">
          The module-level helpers use one shared client. Pass{" "}
          <code className="text-foreground">client=</code> to point a call at
          another host, or build one explicitly:
        </p>
        <DocsCodeBlock code={explicitClient} />
        <h3
          id="quickstart"
          className="text-foreground pt-2 text-xl font-semibold"
        >
          Quickstart
        </h3>
        <DocsCodeBlock code={quickstart} />
      </section>

      <section id="where-to-go" className="space-y-4">
        <h2 className="text-foreground text-2xl font-semibold">
          Where to go next
        </h2>
        <ul className="text-muted max-w-2xl list-disc space-y-1 pl-5 leading-7">
          <li>
            <DocsPathLink
              className="text-accent hover:underline"
              href="/docs/python/datasets"
            >
              Datasets
            </DocsPathLink>{" "}
            — load, search, spectra, aux files, bibtex.
          </li>
          <li>
            <DocsPathLink
              className="text-accent hover:underline"
              href="/docs/python/models"
            >
              Models
            </DocsPathLink>{" "}
            — read published models, peaks, normalization, lineage, tensor.
          </li>
          <li>
            <DocsPathLink
              className="text-accent hover:underline"
              href="/docs/python/build"
            >
              Build and publish
            </DocsPathLink>{" "}
            — context manager, peaks, normalization, tensor, share, review,
            fork.
          </li>
          <li>
            <DocsPathLink
              className="text-accent hover:underline"
              href="/docs/python/compare"
            >
              Compare
            </DocsPathLink>{" "}
            — aligned peaks and normalized channels.
          </li>
          <li>
            <DocsPathLink
              className="text-accent hover:underline"
              href="/docs/python/reproduce"
            >
              Reproduce
            </DocsPathLink>{" "}
            — lockfiles and restore.
          </li>
          <li>
            <DocsPathLink
              className="text-accent hover:underline"
              href="/docs/python/concepts"
            >
              Concepts
            </DocsPathLink>{" "}
            — versions, cache, normalization, parameter payloads.
          </li>
          <li>
            <DocsPathLink
              className="text-accent hover:underline"
              href="/docs/python/errors"
            >
              Errors
            </DocsPathLink>{" "}
            — exception hierarchy.
          </li>
          <li>
            <DocsPathLink
              className="text-accent hover:underline"
              href="/docs/python/examples"
            >
              Examples
            </DocsPathLink>{" "}
            — runnable scripts.
          </li>
          <li>
            <DocsPathLink
              className="text-accent hover:underline"
              href="/docs/python/faq"
            >
              FAQ
            </DocsPathLink>{" "}
            — env vars, install, troubleshooting.
          </li>
          <li>
            <DocsPathLink
              className="text-accent hover:underline"
              href="/docs/python/reference"
            >
              Reference
            </DocsPathLink>{" "}
            — every public name.
          </li>
        </ul>
      </section>
    </article>
  );
}
