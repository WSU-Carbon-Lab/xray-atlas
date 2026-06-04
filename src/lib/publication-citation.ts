/**
 * Reader-facing citation metadata resolved from Crossref or DataCite for a source publication DOI.
 */
export type PublicationCitation = {
  doi: string;
  title: string;
  journal: string | null;
  year: number | null;
  /** Display names in citation order, e.g. `Given Family`. */
  authors: string[];
};

/**
 * Formats {@link PublicationCitation.authors} for compact UI previews.
 *
 * @param citation - Resolved publication metadata.
 * @param maxNames - Maximum author names before an "et al." suffix.
 * @returns Comma-separated author string suitable for cards and list rows.
 */
export function formatPublicationAuthorsPreview(
  citation: PublicationCitation,
  maxNames = 4,
): string {
  const names = citation.authors.filter((name) => name.trim().length > 0);
  if (names.length === 0) {
    return "";
  }
  if (names.length <= maxNames) {
    return names.join(", ");
  }
  return `${names.slice(0, maxNames).join(", ")}, et al.`;
}
