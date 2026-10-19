import type { Metadata } from "next";
import { ApiV1Resource } from "~/components/about/api-v1-reference";

export const metadata: Metadata = {
  title: "API v1 datasets",
  description:
    "Version 1 dataset summaries, DOI lookup, CSV export, BibTeX, the tar.gz archive, version history, and token-authenticated dataset writes.",
  alternates: {
    canonical: "/docs/api/v1/datasets",
  },
};

export default function ApiV1DatasetsPage() {
  return (
    <ApiV1Resource
      tags={["Datasets"]}
      title="Datasets"
      lede="Read dataset summaries, resolve a DOI, export rows, or download BibTeX and the full archive for one experiment. With a write token, create a dataset, edit its normalization, manage auxiliary files, and read its version history. Version bumps need confirmVersionBump."
    />
  );
}
