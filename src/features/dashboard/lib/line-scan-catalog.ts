import {
  catalogEntryEnrichmentStatus,
  groupCatalogEntries,
  type StxmCatalogEntry,
} from "~/lib/stxm";

/**
 * Splits catalog rows into placeholder and parsed buckets for progressive listing UI.
 */
export function partitionCatalogEntries(entries: StxmCatalogEntry[]): {
  placeholders: StxmCatalogEntry[];
  parsed: StxmCatalogEntry[];
} {
  const placeholders: StxmCatalogEntry[] = [];
  const parsed: StxmCatalogEntry[] = [];
  for (const entry of entries) {
    if (catalogEntryEnrichmentStatus(entry) === "placeholder") {
      placeholders.push(entry);
    } else {
      parsed.push(entry);
    }
  }
  return { placeholders, parsed };
}

/**
 * Returns catalog rows suitable for the ingestion-tab line-scan strip:
 * NEXAFS line scans, generic line scans, and placeholders still awaiting metadata.
 *
 * @param entries - Full experiment catalog from the workspace loader.
 * @returns Rows ordered placeholders-first during discovery, then parsed line scans.
 */
export function filterCatalogLineScans(
  entries: StxmCatalogEntry[],
): StxmCatalogEntry[] {
  const { placeholders, parsed } = partitionCatalogEntries(entries);
  const grouped = groupCatalogEntries(parsed);
  const lineScans = grouped.get("line_scan") ?? [];
  const nexafsOnly = parsed.filter((entry) => entry.isNexafsLineScan);
  const parsedLineScans = lineScans.length > 0 ? lineScans : nexafsOnly;

  if (parsed.length === 0) {
    return entries;
  }

  const pendingLineScans = placeholders.filter(isCatalogLineScanStripEntry);
  return [...pendingLineScans, ...parsedLineScans];
}

/**
 * Reports whether a catalog row should appear in the ingestion line-scan strip.
 */
export function isCatalogLineScanStripEntry(entry: StxmCatalogEntry): boolean {
  const status = catalogEntryEnrichmentStatus(entry);
  if (status === "placeholder") {
    return true;
  }
  return entry.category === "line_scan" || entry.isNexafsLineScan;
}
