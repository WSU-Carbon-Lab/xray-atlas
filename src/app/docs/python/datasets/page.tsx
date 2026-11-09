import type { Metadata } from "next";
import type { ReactElement } from "react";
import { DocsCodeBlock } from "~/components/docs/docs-code-block";
import { DocsPathLink } from "~/components/docs/docs-path-link";
import { datasetReads, datasetSearch } from "~/lib/docs/python-snippets";

export const metadata: Metadata = { title: "Python: Datasets", alternates: { canonical: "/docs/python/datasets" } };

export default function Page(): ReactElement {
  return (
    <article className="w-full min-w-0 space-y-8">
      <h1 className="font-display text-foreground text-3xl font-semibold">Datasets</h1>
      <p className="text-muted max-w-2xl leading-7">
        <code className="text-foreground">xa.datasets.get</code> accepts an Atlas id (<code className="text-foreground">abcd2345</code> or <code className="text-foreground">d/abcd2345</code>) or an experiment UUID. Without a version it loads the current version and pins it in the cache. With a version it serves that version from the cache even after the server moves on; a pinned version that is neither current nor cached raises <code className="text-foreground">ConflictError</code>.
      </p>
      <DocsCodeBlock code={datasetReads} />
      <p className="text-muted max-w-2xl leading-7">
        <code className="text-foreground">spectra()</code> returns the channels the server stored for that dataset version. <code className="text-foreground">raw=True</code> returns only the uploaded channel and I0. Rows sort by <code className="text-foreground">(theta_deg, phi_deg, energy_ev)</code> with unknown geometry last, and geometry identity is the ordered pair. Auxiliary files arrive from the dataset bundle and keep their <code className="text-foreground">experiment-aux/</code> and <code className="text-foreground">sample-aux/</code> folders.
      </p>
      <p className="text-muted max-w-2xl leading-7">
        An export carries at most 100,000 rows. When the result may be incomplete, <code className="text-foreground">spectra()</code> raises <code className="text-foreground">AtlasError</code>; pass <code className="text-foreground">allow_truncated=True</code> to accept the capped export.
      </p>
      <p className="text-muted max-w-2xl leading-7">Search returns lightweight summaries; spectra load only when you ask:</p>
      <DocsCodeBlock code={datasetSearch} />
      <p className="text-muted max-w-2xl leading-7">
        See the <DocsPathLink className="text-accent hover:underline" href="/docs/python/reference/datasets">datasets reference</DocsPathLink> for full signatures.
      </p>
    </article>
  );
}
