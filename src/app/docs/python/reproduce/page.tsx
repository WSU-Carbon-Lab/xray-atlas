import type { Metadata } from "next";
import type { ReactElement } from "react";
import { DocsCodeBlock } from "~/components/docs/docs-code-block";
import { reproduce } from "~/lib/docs/python-snippets";

export const metadata: Metadata = { title: "Python: Reproduce", alternates: { canonical: "/docs/python/reproduce" } };

export default function Page(): ReactElement {
  return (
    <article className="w-full min-w-0 space-y-8">
      <h1 className="font-display text-foreground text-3xl font-semibold">Reproduce a session</h1>
      <p className="text-muted max-w-2xl leading-7">
        Every dataset and published model pulled through <code className="text-foreground">xa.datasets.get</code> and <code className="text-foreground">xa.models.get</code> is recorded in an in-memory session registry. <code className="text-foreground">xa.lock</code> serializes it; <code className="text-foreground">xa.restore</code> re-fetches each pin at exactly its recorded revision.
      </p>
      <DocsCodeBlock code={reproduce} />
      <p className="text-muted max-w-2xl leading-7">
        The lockfile pins one Atlas host, dataset versions, and model versions with checksums. It holds no token and no ORCID. <code className="text-foreground">lock()</code> refuses to mix entries from two hosts, and <code className="text-foreground">xrayatlas.lock.reset()</code> clears the registry. A restore fails with <code className="text-foreground">ConflictError</code> when a pinned dataset version is unavailable or a model checksum changed.
      </p>
    </article>
  );
}
