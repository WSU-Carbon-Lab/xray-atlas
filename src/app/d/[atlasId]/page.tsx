/**
 * Short Atlas dataset citation URL (`/d/{atlasDatasetId}`).
 *
 * Resolves the opaque id and permanently redirects to the molecule page with
 * `?nexafsExperiment=` so the matching dataset card expands. Citation metadata
 * for scrapers that do not follow redirects remains on this route via
 * `generateMetadata`.
 */

import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { site } from "~/app/brand";
import { db } from "~/server/db";
import { loadAtlasDatasetCitationPage } from "~/server/nexafs/load-atlas-dataset-citation";

interface AtlasDatasetPageProps {
  params: Promise<{ atlasId: string }>;
}

/**
 * Builds HTML head metadata for Connector scrapers and social previews that
 * request `/d/{id}` without following the redirect.
 */
export async function generateMetadata({
  params,
}: AtlasDatasetPageProps): Promise<Metadata> {
  const { atlasId } = await params;
  const model = await loadAtlasDatasetCitationPage(db, atlasId);
  if (!model) {
    return { title: `Dataset not found | ${site.name}` };
  }

  const other: Record<string, string | string[]> = {
    citation_title: model.title,
    citation_publication_date: String(model.year),
    citation_online_date: String(model.year),
    citation_language: "en",
    citation_publisher: site.name,
    "DC.type": "Dataset",
    "DC.title": model.title,
    "DC.publisher": site.name,
    "DC.description": model.description,
    citation_abstract: model.description,
    citation_abstract_html_url: model.atlasCitationUrl,
  };
  if (model.authors.length > 0) {
    other.citation_author = model.authors;
    other["DC.creator"] = model.authors;
  }
  if (model.datasetDoi) {
    other.citation_doi = model.datasetDoi;
    other["DC.identifier"] = [
      `doi:${model.datasetDoi}`,
      model.atlasCitationUrl,
    ];
  } else {
    other["DC.identifier"] = model.atlasCitationUrl;
  }

  return {
    title: `${model.title} | ${site.name}`,
    description: model.description,
    alternates: { canonical: model.atlasCitationUrl },
    openGraph: {
      title: model.title,
      description: model.description,
      url: model.atlasCitationUrl,
      type: "website",
      siteName: site.name,
    },
    other,
  };
}

/**
 * Permanently redirects `/d/{id}` to the molecule spectrum card deep-link.
 */
export default async function AtlasDatasetCitationPage({
  params,
}: AtlasDatasetPageProps) {
  const { atlasId } = await params;
  const model = await loadAtlasDatasetCitationPage(db, atlasId);
  if (!model) notFound();
  permanentRedirect(model.spectrumHref);
}
