import type { Metadata } from "next";
import type { ReactElement } from "react";
import { DocsCodeBlock } from "~/components/docs/docs-code-block";
import { compareModels } from "~/lib/docs/python-snippets";

export const metadata: Metadata = { title: "Python: Compare", alternates: { canonical: "/docs/python/compare" } };

export default function Page(): ReactElement {
  return (
    <article className="w-full min-w-0 space-y-8">
      <h1 className="font-display text-foreground text-3xl font-semibold">Compare</h1>
      <p className="text-muted max-w-2xl leading-7">
        <code className="text-foreground">xa.compare</code> takes two or more models and returns a comparison fixed at construction. Peak centers chain into one group while each next center is at most the tolerance past the group&apos;s widest center; each model contributes at most one peak per group. Labels derive <code className="text-foreground">tag#version</code> unless you pass your own.
      </p>
      <DocsCodeBlock code={compareModels} />
      <p className="text-muted max-w-2xl leading-7">
        <code className="text-foreground">spectra()</code> merges each model&apos;s server-normalized channel on exact geometry and energy keys and adds one <code className="text-foreground">{`{label}_minus_{first_label}`}</code> column per model after the first. Nothing is resampled or interpolated.
      </p>
    </article>
  );
}
