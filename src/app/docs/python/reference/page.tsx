import type { Metadata } from "next";
import type { ReactElement } from "react";
import { DocsPathLink } from "~/components/docs/docs-path-link";

const modules = [
  { href: "/docs/python/reference/client", label: "client", body: "Client, default_client, set_default_client, login, Credential." },
  { href: "/docs/python/reference/datasets", label: "datasets", body: "datasets.get, datasets.search, Dataset, DatasetSummary, aux files." },
  { href: "/docs/python/reference/models", label: "models", body: "models.get, ModelDetail, peaks, normalization, lineage, tensor." },
  { href: "/docs/python/reference/tensor", label: "tensor", body: "Tensor, TensorManifest, from_array, load." },
  { href: "/docs/python/reference/types", label: "types", body: "Normalization, Peak, Lineage, Author, WindowPair, etc." },
  { href: "/docs/python/reference/errors", label: "errors", body: "AtlasError hierarchy." },
];

export const metadata: Metadata = { title: "Python reference", alternates: { canonical: "/docs/python/reference" } };

export default function Page(): ReactElement {
  return (
    <article className="w-full min-w-0 space-y-8">
      <h1 className="font-display text-foreground text-3xl font-semibold">Python reference</h1>
      <p className="text-muted max-w-2xl leading-7">Signatures, return values, and errors for every public name in the xrayatlas client, grouped by module.</p>
      <ul className="text-muted max-w-2xl list-disc space-y-1 pl-5 leading-7">
        {modules.map((m) => (
          <li key={m.href}>
            <DocsPathLink className="text-accent hover:underline" href={m.href}>{m.label}</DocsPathLink> — {m.body}
          </li>
        ))}
      </ul>
    </article>
  );
}
