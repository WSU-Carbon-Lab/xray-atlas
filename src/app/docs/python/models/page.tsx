import type { Metadata } from "next";
import type { ReactElement } from "react";
import { DocsCodeBlock } from "~/components/docs/docs-code-block";
import { DocsPathLink } from "~/components/docs/docs-path-link";
import { modelReads, tensorRead } from "~/lib/docs/python-snippets";

export const metadata: Metadata = { title: "Python: Models", alternates: { canonical: "/docs/python/models" } };

export default function Page(): ReactElement {
  return (
    <article className="w-full min-w-0 space-y-8">
      <h1 className="font-display text-foreground text-3xl font-semibold">Models</h1>
      <p className="text-muted max-w-2xl leading-7">
        <code className="text-foreground">xa.models.get</code> loads the latest published version by default, a numbered published version, or the owner&apos;s draft. Model JSON is never cached because visibility can change; tensor blobs are cached by SHA-256 and verified on every read.
      </p>
      <DocsCodeBlock code={modelReads} />
      <p className="text-muted max-w-2xl leading-7">
        <code className="text-foreground">m.normalized(dataset)</code> asks the server to apply this version&apos;s windows to a linked dataset. A link is pinned to a dataset version; <code className="text-foreground">link.load()</code> returns that exact version.
      </p>
      <p className="text-muted max-w-2xl leading-7">A stored tensor is a container of named parameter columns:</p>
      <DocsCodeBlock code={tensorRead} />
      <p className="text-muted max-w-2xl leading-7">
        <code className="text-foreground">load()</code> returns the values only. The manifest records the energy bounds and sample count. A complex payload stores delta in the real part and beta in the imaginary part. A full physics tensor is future work.
      </p>
      <p className="text-muted max-w-2xl leading-7">
        See the <DocsPathLink className="text-accent hover:underline" href="/docs/python/reference/models">models reference</DocsPathLink>.
      </p>
    </article>
  );
}
