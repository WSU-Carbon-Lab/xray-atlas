import type { Metadata } from "next";
import type { ReactElement } from "react";
import { DocsCodeBlock } from "~/components/docs/docs-code-block";
import { DocsPathLink } from "~/components/docs/docs-path-link";
import { buildModel, perChannel, afterPublish } from "~/lib/docs/python-snippets";

export const metadata: Metadata = { title: "Python: Build and publish", alternates: { canonical: "/docs/python/build" } };

export default function Page(): ReactElement {
  return (
    <article className="w-full min-w-0 space-y-8">
      <h1 className="font-display text-foreground text-3xl font-semibold">Build and publish</h1>
      <p className="text-muted max-w-2xl leading-7">
        <code className="text-foreground">xa.model(...)</code> returns a context manager. On entry it reads its source: the first dataset&apos;s default model, or the model named by <code className="text-foreground">from_model=</code>. On a clean exit it forks the source, replaces the draft, and uploads the tensor when one is set. Nothing is written when the block raises, the block saves once even if you call <code className="text-foreground">save()</code> inside it, and publishing is always a separate explicit call that is never retried.
      </p>
      <DocsCodeBlock code={buildModel} />
      <p className="text-muted max-w-2xl leading-7">
        The builder prefills peaks and normalization from the source. <code className="text-foreground">builder.peaks</code> is a pandas DataFrame validated like <code className="text-foreground">xa.validate_peaks</code>; extra columns become each peak&apos;s <code className="text-foreground">params</code>. One unified window pair applies to every channel. When the channels need different windows, use per-channel normalization:
      </p>
      <DocsCodeBlock code={perChannel} />
      <p className="text-muted max-w-2xl leading-7">
        A tensor is optional. When present, <code className="text-foreground">xa.Tensor.from_array</code> accepts a float or complex array with 2 to 6 dimensions and finite values, widens <code className="text-foreground">float16</code>/<code className="text-foreground">float32</code> to <code className="text-foreground">float64</code> and <code className="text-foreground">complex64</code> to <code className="text-foreground">complex128</code>, and rejects integer arrays. The energy axis is strictly increasing with at least two samples, and the serialized payload is capped at 128 MiB.
      </p>
      <p className="text-muted max-w-2xl leading-7">After the draft is saved, the owner can publish it, set visibility, share it with ORCID iDs, review it on a dataset they can edit, or fork a published version:</p>
      <DocsCodeBlock code={afterPublish} />
      <p className="text-muted max-w-2xl leading-7">
        A draft that was saved but never published can be deleted through the model returned by <code className="text-foreground">save()</code> or <code className="text-foreground">builder.model</code>. A published model is immutable; fork it instead.
      </p>
      <p className="text-muted max-w-2xl leading-7">
        See the <DocsPathLink className="text-accent hover:underline" href="/docs/python/reference/models">reference</DocsPathLink>.
      </p>
    </article>
  );
}
