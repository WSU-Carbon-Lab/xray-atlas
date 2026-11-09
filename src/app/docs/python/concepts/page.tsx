import type { Metadata } from "next";
import type { ReactElement } from "react";

export const metadata: Metadata = { title: "Python: Concepts", alternates: { canonical: "/docs/python/concepts" } };

export default function Page(): ReactElement {
  return (
    <article className="w-full min-w-0 space-y-8">
      <h1 className="font-display text-foreground text-3xl font-semibold">Concepts</h1>
      <section className="space-y-3">
        <h2 className="text-foreground text-xl font-semibold">Versions and the cache</h2>
        <p className="text-muted max-w-2xl leading-7">Datasets version as <code className="text-foreground">major.minor.patch</code>. A new upload is <code className="text-foreground">1.0.0</code>; auxiliary files bump minor, and a normalization or Kramers-Kronig delta calculation bumps patch. Reading a pinned version never moves it. The HTTP cache stores responses and tensor blobs, never a token, an Authorization header, or an ORCID.</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-foreground text-xl font-semibold">Server-side normalization</h2>
        <p className="text-muted max-w-2xl leading-7">The client reads normalization; it does not compute it. <code className="text-foreground">Dataset.spectra()</code> returns the channels persisted with that dataset version. <code className="text-foreground">Model.normalized()</code> asks the server to apply the version&apos;s windows to a linked dataset.</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-foreground text-xl font-semibold">Parameter payloads</h2>
        <p className="text-muted max-w-2xl leading-7">The stored object is a container for named parameter columns. Axis 1 is labelled by the manifest components (<code className="text-foreground">xx, yy, zz, xy, xz, yz, delta, beta</code>); the values a researcher works with today are <code className="text-foreground">delta</code> and <code className="text-foreground">beta</code> as separate series on a shared energy axis. A complex array is a storage convenience. The client never narrows a complex payload to a real dtype.</p>
      </section>
    </article>
  );
}
