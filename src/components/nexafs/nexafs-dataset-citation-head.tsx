/**
 * Invisible Dataset citation metadata for the Zotero Connector and other scrapers.
 *
 * Injects Highwire `citation_*` meta tags and schema.org JSON-LD into `document.head`
 * while a NEXAFS experiment card is expanded. Does not alter visible page content.
 */

"use client";

import { useEffect } from "react";
import { site } from "~/app/brand";
import { normalizeDoi } from "~/lib/doi";

const META_ATTR = "data-atlas-dataset-meta";
const JSON_LD_ATTR = "data-atlas-dataset-jsonld";

export interface NexafsDatasetCitationHeadProps {
  active: boolean;
  title: string;
  authors: ReadonlyArray<string>;
  year: number;
  datasetDoi: string | null;
  atlasCitationUrl: string | null;
  /** Full abstract / note (experiment + sample + identifiers) for Zotero Extra. */
  description?: string | null;
  publisher?: string;
}

function clearAtlasHeadNodes(): void {
  if (typeof document === "undefined") return;
  document
    .querySelectorAll(`meta[${META_ATTR}], script[${JSON_LD_ATTR}]`)
    .forEach((node) => {
      node.remove();
    });
}

function upsertMeta(name: string, content: string): void {
  const el = document.createElement("meta");
  el.setAttribute("name", name);
  el.setAttribute("content", content);
  el.setAttribute(META_ATTR, "1");
  document.head.appendChild(el);
}

/**
 * Publishes Dataset bibliographic metadata to the document head while `active`.
 *
 * @param props - Citation fields and whether the host card is expanded.
 */
export function NexafsDatasetCitationHead({
  active,
  title,
  authors,
  year,
  datasetDoi,
  atlasCitationUrl,
  description,
  publisher = site.name,
}: NexafsDatasetCitationHeadProps): null {
  useEffect(() => {
    clearAtlasHeadNodes();
    if (!active || typeof document === "undefined") {
      return clearAtlasHeadNodes;
    }

    const doi = normalizeDoi(datasetDoi);
    const url = atlasCitationUrl?.trim() ?? null;
    const desc = description?.trim() ?? null;

    upsertMeta("citation_title", title);
    upsertMeta("citation_publication_date", String(year));
    upsertMeta("citation_online_date", String(year));
    upsertMeta("citation_language", "en");
    upsertMeta("citation_publisher", publisher);
    upsertMeta("DC.type", "Dataset");
    upsertMeta("DC.title", title);
    upsertMeta("DC.publisher", publisher);
    for (const author of authors) {
      const name = author.trim();
      if (!name) continue;
      upsertMeta("citation_author", name);
      upsertMeta("DC.creator", name);
    }
    if (doi) {
      upsertMeta("citation_doi", doi);
      upsertMeta("DC.identifier", `doi:${doi}`);
    }
    if (url) {
      upsertMeta("citation_abstract_html_url", url);
      upsertMeta("citation_pdf_url", url);
      upsertMeta("DC.identifier", url);
      upsertMeta("DC.relation", url);
    }
    if (desc) {
      upsertMeta("citation_abstract", desc);
      upsertMeta("DC.description", desc);
      upsertMeta("description", desc);
    }

    const identifiers: Array<Record<string, string>> = [];
    if (doi) {
      identifiers.push({
        "@type": "PropertyValue",
        propertyID: "DOI",
        value: doi,
      });
    }
    if (url) {
      identifiers.push({
        "@type": "PropertyValue",
        propertyID: "URL",
        value: url,
      });
    }

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: title,
      description: desc ?? title,
      publisher: { "@type": "Organization", name: publisher },
      datePublished: String(year),
      ...(authors.length > 0
        ? {
            creator: authors.map((name) => ({
              "@type": "Person",
              name,
            })),
          }
        : {}),
      ...(identifiers.length === 1
        ? { identifier: identifiers[0] }
        : identifiers.length > 1
          ? { identifier: identifiers }
          : {}),
      ...(doi ? { sameAs: `https://doi.org/${doi}` } : {}),
      ...(url ? { url } : {}),
      license: "https://creativecommons.org/licenses/by/4.0/",
      isAccessibleForFree: true,
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute(JSON_LD_ATTR, "1");
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return clearAtlasHeadNodes;
  }, [
    active,
    title,
    authors,
    year,
    datasetDoi,
    atlasCitationUrl,
    description,
    publisher,
  ]);

  return null;
}
