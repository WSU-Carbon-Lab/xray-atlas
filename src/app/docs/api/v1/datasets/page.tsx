import type { Metadata } from "next";
import { ApiV1Resource } from "~/components/about/api-v1-reference";

export const metadata: Metadata = {
  title: "API v1 datasets",
  description:
    "Version 1 dataset summaries, DOI lookup, CSV export, BibTeX, and the tar.gz archive.",
  alternates: {
    canonical: "/docs/api/v1/datasets",
  },
};

export default function ApiV1DatasetsPage() {
  return (
    <ApiV1Resource
      tags={["Datasets"]}
      title="Datasets"
      lede="Read dataset summaries, resolve a DOI, export rows, or download BibTeX and the full archive for one experiment."
    />
  );
}
