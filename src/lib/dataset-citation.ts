/**
 * Builds publication-ready citation strings for individual NEXAFS datasets and for the
 * X-ray Atlas collection. Follows an APA-like / DataCite dataset citation shape:
 * creators, year, italicizable title, publisher, and DOI when present.
 *
 * Aligns with brand identity from `~/app/brand` and privacy-page guidance. Does not
 * invent DOIs: collection DOI is omitted until Atlas registers one
 * (see {@link ATLAS_COLLECTION_DOI}).
 */

import { site } from "~/app/brand";
import { normalizeDoi } from "~/lib/doi";

/**
 * Atlas-wide collection DOI when one exists.
 *
 * Remains `null` until a community/collection DOI is registered for the catalog.
 * Callers must not invent a placeholder DOI string.
 */
export const ATLAS_COLLECTION_DOI: string | null = null;

/** Default publisher label for Atlas-hosted dataset citations. */
export const DATASET_CITATION_PUBLISHER = site.name;

/** Inputs used to assemble a formal NEXAFS dataset title for citations and Zenodo. */
export interface NexafsDatasetCitationTitleInput {
  moleculeDisplayName: string;
  edgeLabel: string;
  instrumentName: string;
  facilityName?: string | null;
  experimentTypeLabel?: string | null;
}

/** Source publication fields needed for the "Adapted from" clause. */
export interface DatasetCitationSourcePublication {
  doi: string;
  title?: string | null;
}

/** Creator / author name for scholarly citation formatting. */
export interface DatasetCitationCreator {
  /** Display name (`Given Family` or `Family, Given`). */
  name: string;
}

/**
 * Core sample preparation fields for BibTeX `note` and related citation context.
 *
 * Labels should already be human-readable (e.g. process method display name).
 */
export interface DatasetCitationSampleInfo {
  processMethod?: string | null;
  substrate?: string | null;
  /** Optional patterning / mask layer on the specimen (under substrate in forms). */
  patterningLayer?: string | null;
  solvent?: string | null;
  thicknessNm?: number | null;
  molecularWeightGPerMol?: number | null;
  vendorName?: string | null;
}

/** Inputs for a single-dataset citation bundle. */
export interface BuildDatasetCitationInput {
  moleculeDisplayName: string;
  edgeLabel: string;
  instrumentName: string;
  facilityName?: string | null;
  experimentTypeLabel?: string | null;
  /** Zenodo/Atlas dataset DOI; may be null when minting is pending. */
  datasetDoi: string | null;
  /** Ordered creators; empty falls back to {@link DATASET_CITATION_PUBLISHER} contributors. */
  creators?: ReadonlyArray<DatasetCitationCreator | string>;
  /** Four-digit publication / deposit year; defaults to current UTC year. */
  year?: number;
  sourcePublications?: ReadonlyArray<DatasetCitationSourcePublication>;
  /** Optional core sample preparation summary for BibTeX notes. */
  sample?: DatasetCitationSampleInfo | null;
  /** Defaults to {@link DATASET_CITATION_PUBLISHER}. */
  publisher?: string;
  /** Defaults to {@link site.name}. */
  hostName?: string;
}

/** Structured citation fragments for Cite popover copy actions. */
export interface DatasetCitationBundle {
  title: string;
  year: number;
  /** APA-like parenthetical in-text form, e.g. `(Doe et al., 2026)`. */
  inText: string;
  /**
   * Toy prose sentence showing how to mention the dataset and X-ray Atlas,
   * ending with the same parenthetical as {@link inText}.
   */
  inTextExample: string;
  /** Full reference list entry (APA-like dataset citation). */
  reference: string;
  /** Methods / data-availability paragraph for manuscripts. */
  dataAvailability: string;
  /** BibTeX `@dataset` entry. */
  bibtex: string;
}

/** Inputs for the Atlas collection / database citation. */
export interface BuildDatabaseCitationInput {
  /** Access date; defaults to today (UTC calendar date). */
  accessedAt?: Date;
  /** Collection DOI override; defaults to {@link ATLAS_COLLECTION_DOI}. */
  collectionDoi?: string | null;
  /** Defaults to {@link site.name}. */
  collectionName?: string;
}

/**
 * Builds a formal dataset title shared by citations and Zenodo deposits:
 * `NEXAFS dataset: {molecule}, {edge}[, {type}], {instrument}[, {facility}]`.
 *
 * Omits informal `@` facility markers. Empty molecule/edge/instrument fall back to
 * stable placeholders so titles remain non-empty.
 *
 * @param input - Molecule, edge, instrument, and optional facility/type labels.
 * @returns Trimmed title string suitable for citation and deposit metadata parity.
 */
export function buildNexafsDatasetCitationTitle(
  input: NexafsDatasetCitationTitleInput,
): string {
  const moleculeRaw = input.moleculeDisplayName.trim();
  const edgeRaw = input.edgeLabel.trim();
  const instrumentRaw = input.instrumentName.trim();
  const molecule = moleculeRaw.length > 0 ? moleculeRaw : "Unknown molecule";
  const edge = edgeRaw.length > 0 ? edgeRaw : "unknown edge";
  const instrument =
    instrumentRaw.length > 0 ? instrumentRaw : "unknown instrument";
  const facility = input.facilityName?.trim() ?? "";
  const typeLabel = input.experimentTypeLabel?.trim() ?? "";

  const parts = [molecule, edge];
  if (typeLabel) parts.push(typeLabel);
  parts.push(instrument);
  if (facility) parts.push(facility);
  return `NEXAFS dataset: ${parts.join(", ")}`;
}

/**
 * Formats a DOI for display in citations as `https://doi.org/{doi}` when possible.
 *
 * @param doi - Raw or canonical DOI; empty/invalid values yield `null`.
 * @returns Absolute DOI URL, or `null` when no usable DOI is present.
 */
export function formatDoiCitationUrl(
  doi: string | null | undefined,
): string | null {
  const normalized = normalizeDoi(doi);
  if (!normalized) return null;
  return `https://doi.org/${normalized}`;
}

/**
 * Resolves a Zenodo HTML record URL for citation-manager deep links.
 *
 * Prefers an explicit `zenodoRecordUrl`, otherwise derives
 * `https://zenodo.org/records/{id}` from a `10.5281/zenodo.{id}` DOI.
 *
 * @param input - Optional DOI and/or published Zenodo record URL.
 * @returns Absolute Zenodo record URL, or `null` when neither is usable.
 */
export function resolveZenodoRecordUrlForCitation(input: {
  doi?: string | null;
  zenodoRecordUrl?: string | null;
}): string | null {
  const explicit = input.zenodoRecordUrl?.trim() ?? "";
  if (/^https:\/\/(sandbox\.)?zenodo\.org\/(records|doi)\//i.test(explicit)) {
    return explicit.replace(/\/$/, "");
  }
  const doi = normalizeDoi(input.doi);
  if (!doi) return null;
  const match = /^10\.5281\/zenodo\.(\d+)$/i.exec(doi);
  if (!match) return null;
  return `https://zenodo.org/records/${match[1]}`;
}

/**
 * Resolves a Zenodo record id for citation-manager export links.
 *
 * Accepts an explicit record URL or a `10.5281/zenodo.{id}` DOI.
 *
 * @param input - Optional DOI and/or published Zenodo record URL.
 * @returns Numeric Zenodo record id, or `null` when neither is usable.
 */
export function resolveZenodoRecordIdForCitation(input: {
  doi?: string | null;
  zenodoRecordUrl?: string | null;
}): string | null {
  const zenodoUrl = resolveZenodoRecordUrlForCitation(input);
  if (zenodoUrl) {
    const fromRecords = /\/records\/(\d+)/i.exec(zenodoUrl)?.[1];
    if (fromRecords) return fromRecords;
    const fromDoiPath = /\/doi\/(?:10\.5281\/)?zenodo\.(\d+)/i.exec(zenodoUrl)?.[1];
    if (fromDoiPath) return fromDoiPath;
  }
  const doi = normalizeDoi(input.doi);
  if (!doi) return null;
  return /^10\.5281\/zenodo\.(\d+)$/i.exec(doi)?.[1] ?? null;
}

/**
 * Builds a Zotero import URL that serves Zenodo BibTeX for this dataset.
 *
 * Returns Zenodo’s `/records/{id}/export/bibtex` endpoint (`application/x-bibtex`).
 * Used to gate the Zotero control when a deposit exists. The Cite UI posts the
 * Atlas-built BibTeX to a same-origin `/api/citations/bibtex` endpoint inside a
 * hidden iframe so the Zotero Connector can intercept Dataset metadata without
 * opening a tab (Zenodo’s export URL cannot be framed).
 *
 * Without the connector, that response downloads a `.bib` file the user can
 * import via File → Import (same `@dataset` result as pasting BibTeX).
 *
 * @param input - Dataset DOI and optional Zenodo record URL.
 * @returns Absolute Zenodo BibTeX export URL, or `null` when minting is pending.
 */
export function buildZoteroSaveUrl(input: {
  doi?: string | null;
  zenodoRecordUrl?: string | null;
}): string | null {
  const recordId = resolveZenodoRecordIdForCitation(input);
  if (!recordId) return null;
  return `https://zenodo.org/records/${recordId}/export/bibtex`;
}

/**
 * Builds a Mendeley web import deep link for a dataset DOI.
 *
 * Opens `https://www.mendeley.com/import/?doi=` with the bare DOI. Mendeley
 * typically redirects through sign-in, then offers to add the reference.
 * Returns `null` when no usable DOI is present.
 *
 * @param doi - Raw or canonical dataset DOI.
 * @returns Absolute Mendeley import URL, or `null` when minting is pending.
 */
export function buildMendeleyImportUrl(
  doi: string | null | undefined,
): string | null {
  const normalized = normalizeDoi(doi);
  if (!normalized) return null;
  return `https://www.mendeley.com/import/?doi=${encodeURIComponent(normalized)}`;
}

/**
 * Normalizes creator inputs to trimmed non-empty display names.
 *
 * @param creators - Creator objects or bare name strings.
 * @returns Ordered unique names (case-insensitive dedupe); empty when none usable.
 */
export function normalizeCitationCreatorNames(
  creators: ReadonlyArray<DatasetCitationCreator | string> | undefined,
): string[] {
  if (!creators || creators.length === 0) return [];
  const seen = new Set<string>();
  const names: string[] = [];
  for (const entry of creators) {
    const raw = typeof entry === "string" ? entry : entry.name;
    const name = raw.trim().replace(/\s+/g, " ");
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

function splitDisplayName(displayName: string): {
  family: string;
  given: string;
} {
  const trimmed = displayName.trim().replace(/\s+/g, " ");
  if (trimmed.includes(",")) {
    const [familyPart, ...rest] = trimmed.split(",");
    return {
      family: (familyPart ?? "").trim() || trimmed,
      given: rest.join(",").trim(),
    };
  }
  const parts = trimmed.split(" ");
  if (parts.length === 1) {
    return { family: trimmed, given: "" };
  }
  return {
    family: parts[parts.length - 1]!,
    given: parts.slice(0, -1).join(" "),
  };
}

function givenNameInitials(given: string): string {
  if (!given) return "";
  return given
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part[0]!.toUpperCase()}.`)
    .join(" ");
}

/**
 * Formats one creator for an APA reference list (`Family, G.`).
 *
 * @param displayName - `Given Family` or `Family, Given` display string.
 * @returns APA-style name fragment.
 */
export function formatApaReferenceAuthor(displayName: string): string {
  const { family, given } = splitDisplayName(displayName);
  const initials = givenNameInitials(given);
  if (!initials) return family;
  return `${family}, ${initials}`;
}

/**
 * Formats one creator for BibTeX (`Family, Given`).
 *
 * @param displayName - `Given Family` or `Family, Given` display string.
 * @returns BibTeX author fragment.
 */
export function formatBibtexAuthor(displayName: string): string {
  const { family, given } = splitDisplayName(displayName);
  if (!given) return family;
  return `${family}, ${given}`;
}

/**
 * Formats the author list for an APA reference entry.
 *
 * @param names - Ordered creator display names.
 * @returns APA author string, or a contributors fallback when empty.
 */
export function formatApaReferenceAuthors(
  names: ReadonlyArray<string>,
): string {
  if (names.length === 0) {
    return `${DATASET_CITATION_PUBLISHER} contributors`;
  }
  const formatted = names.map(formatApaReferenceAuthor);
  if (formatted.length === 1) return formatted[0]!;
  if (formatted.length === 2) return `${formatted[0]}, & ${formatted[1]}`;
  const head = formatted.slice(0, -1).join(", ");
  return `${head}, & ${formatted[formatted.length - 1]!}`;
}

/**
 * Builds an APA-like parenthetical in-text citation for a dataset.
 *
 * @param names - Ordered creator display names.
 * @param year - Four-digit year.
 * @returns e.g. `(Doe et al., 2026)`, `(Doe & Smith, 2026)`, or `(Doe, 2026)`.
 */
export function buildDatasetInTextCitation(
  names: ReadonlyArray<string>,
  year: number,
): string {
  const y = Number.isFinite(year)
    ? Math.trunc(year)
    : new Date().getUTCFullYear();
  if (names.length === 0) {
    return `(${DATASET_CITATION_PUBLISHER}, ${y})`;
  }
  const firstFamily = splitDisplayName(names[0]!).family;
  if (names.length === 1) return `(${firstFamily}, ${y})`;
  if (names.length === 2) {
    const secondFamily = splitDisplayName(names[1]!).family;
    return `(${firstFamily} & ${secondFamily}, ${y})`;
  }
  return `(${firstFamily} et al., ${y})`;
}

function formatSourcePublicationClause(
  publications: ReadonlyArray<DatasetCitationSourcePublication> | undefined,
): string | null {
  if (!publications || publications.length === 0) return null;
  const parts: string[] = [];
  for (const publication of publications) {
    const titleRaw = publication.title?.trim() ?? "";
    const title = titleRaw.length > 0 ? titleRaw : null;
    const doiUrl = formatDoiCitationUrl(publication.doi);
    if (title && doiUrl) {
      parts.push(`${title} (${doiUrl})`);
    } else if (doiUrl) {
      parts.push(doiUrl);
    } else if (title) {
      parts.push(title);
    }
  }
  if (parts.length === 0) return null;
  return parts.join("; ");
}

function resolveCitationYear(year: number | undefined): number {
  if (year != null && Number.isFinite(year) && year >= 1900 && year <= 2100) {
    return Math.trunc(year);
  }
  return new Date().getUTCFullYear();
}

function bibtexCiteKey(
  title: string,
  year: number,
  doi: string | null,
): string {
  if (doi) {
    const slug = doi.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (slug) return `atlas_${slug}`.slice(0, 80);
  }
  const fromTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return `atlas_${fromTitle || "dataset"}_${year}`;
}

function escapeBibtex(value: string): string {
  return value.replace(/[{}\\&%$#_]/g, (ch) => `\\${ch}`);
}

function formatCitationNumeric(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("en-US", {
        maximumFractionDigits: 6,
        useGrouping: false,
      });
}

/**
 * Formats core sample preparation fields into a compact clause for BibTeX notes.
 *
 * Omits empty fields. Example:
 * `Sample: process Dry; substrate Si; patterning layer photoresist; thickness 50 nm; vendor Sigma-Aldrich`
 *
 * Field order matches specimen UI: process, substrate, patterning layer, solvent,
 * thickness, molecular weight, vendor.
 *
 * @param sample - Optional core sample fields with human-readable labels.
 * @returns Sample clause without a trailing period, or `null` when nothing usable.
 */
export function formatDatasetCitationSampleSummary(
  sample: DatasetCitationSampleInfo | null | undefined,
): string | null {
  if (!sample) return null;
  const parts: string[] = [];
  const processMethod = sample.processMethod?.trim() ?? "";
  if (processMethod) parts.push(`process ${processMethod}`);
  const substrate = sample.substrate?.trim() ?? "";
  if (substrate) parts.push(`substrate ${substrate}`);
  const patterningLayer = sample.patterningLayer?.trim() ?? "";
  if (patterningLayer) parts.push(`patterning layer ${patterningLayer}`);
  const solvent = sample.solvent?.trim() ?? "";
  if (solvent) parts.push(`solvent ${solvent}`);
  if (sample.thicknessNm != null && Number.isFinite(sample.thicknessNm)) {
    parts.push(`thickness ${formatCitationNumeric(sample.thicknessNm)} nm`);
  }
  if (
    sample.molecularWeightGPerMol != null &&
    Number.isFinite(sample.molecularWeightGPerMol)
  ) {
    parts.push(
      `molecular weight ${formatCitationNumeric(sample.molecularWeightGPerMol)} g/mol`,
    );
  }
  const vendorName = sample.vendorName?.trim() ?? "";
  if (vendorName) parts.push(`vendor ${vendorName}`);
  if (parts.length === 0) return null;
  return `Sample: ${parts.join("; ")}`;
}

/**
 * Builds the BibTeX `note` body for an Atlas NEXAFS dataset, including sample
 * preparation when provided.
 *
 * @param sample - Optional core sample fields.
 * @returns Note text (not BibTeX-escaped).
 */
export function buildDatasetBibTeXNote(
  sample?: DatasetCitationSampleInfo | null,
): string {
  const base = `${DATASET_CITATION_PUBLISHER} NEXAFS dataset; DOI minted via Zenodo`;
  const sampleSummary = formatDatasetCitationSampleSummary(sample);
  if (!sampleSummary) return base;
  return `${base}; ${sampleSummary}`;
}

/**
 * Builds a toy prose sentence that embeds an in-text citation and names X-ray Atlas.
 *
 * Example: `NEXAFS spectra for PC61BM were obtained from the X-ray Atlas (Collins et al., 2026).`
 *
 * @param moleculeDisplayName - Molecule label used in the sentence subject.
 * @param inText - Parenthetical from {@link buildDatasetInTextCitation}.
 * @param hostName - Catalog name; defaults to {@link site.name}.
 * @returns Single sentence suitable for an In-text popover example.
 */
export function buildDatasetInTextExample(
  moleculeDisplayName: string,
  inText: string,
  hostName?: string,
): string {
  const moleculeRaw = moleculeDisplayName.trim();
  const molecule = moleculeRaw.length > 0 ? moleculeRaw : "this molecule";
  const host = (hostName ?? site.name).trim() || site.name;
  return `NEXAFS spectra for ${molecule} were obtained from the ${host} ${inText}.`;
}

/**
 * Builds a manuscript data-availability statement for an Atlas NEXAFS dataset.
 *
 * Frames X-ray Atlas as the primary home for NEXAFS datasets and Zenodo as the
 * DOI mint / persistence layer. Uses the formal title once without a redundant
 * `NEXAFS dataset "NEXAFS dataset: …"` wrapper.
 *
 * @param input - Dataset identity and optional DOI.
 * @returns Single paragraph suitable for a Data Availability section.
 */
export function buildDatasetDataAvailabilityStatement(
  input: BuildDatasetCitationInput,
): string {
  const title = buildNexafsDatasetCitationTitle(input);
  const host = (input.hostName ?? site.name).trim() || site.name;
  const doiUrl = formatDoiCitationUrl(input.datasetDoi);
  if (doiUrl) {
    return (
      `NEXAFS datasets are openly available on ${host}. ` +
      `Persistent DOIs for Atlas datasets are minted via Zenodo. ` +
      `${title} is available at ${doiUrl} (CC BY 4.0).`
    );
  }
  return (
    `NEXAFS datasets are openly available on ${host}. ` +
    `A persistent DOI for ${title} is pending minting via Zenodo.`
  );
}

/**
 * Builds a BibTeX `@dataset` entry for an Atlas NEXAFS record.
 *
 * @param input - Dataset identity, creators, year, and optional DOI.
 * @returns Multi-line BibTeX string ready to copy.
 */
export function buildDatasetBibTeX(input: BuildDatasetCitationInput): string {
  const title = buildNexafsDatasetCitationTitle(input);
  const year = resolveCitationYear(input.year);
  const publisher =
    (input.publisher ?? DATASET_CITATION_PUBLISHER).trim() ||
    DATASET_CITATION_PUBLISHER;
  const names = normalizeCitationCreatorNames(input.creators);
  const authorField =
    names.length > 0
      ? names.map(formatBibtexAuthor).join(" and ")
      : `${DATASET_CITATION_PUBLISHER} contributors`;
  const doi = normalizeDoi(input.datasetDoi);
  const doiUrl = formatDoiCitationUrl(input.datasetDoi);
  const key = bibtexCiteKey(title, year, doi);
  const lines = [
    `@dataset{${key},`,
    `  author    = {${escapeBibtex(authorField)}},`,
    `  title     = {${escapeBibtex(title)}},`,
    `  year      = {${year}},`,
    `  publisher = {${escapeBibtex(publisher)}},`,
    `  version   = {1},`,
  ];
  if (doi) {
    lines.push(`  doi       = {${escapeBibtex(doi)}},`);
  }
  if (doiUrl) {
    lines.push(`  url       = {${escapeBibtex(doiUrl)}},`);
  }
  lines.push(
    `  note      = {${escapeBibtex(buildDatasetBibTeXNote(input.sample))}},`,
  );
  lines.push(`}`);
  return lines.join("\n");
}

/**
 * Builds the preferred individual-dataset reference-list citation (APA-like).
 *
 * Pattern:
 * `Creator(s). (Year). Title [Dataset]. Publisher. https://doi.org/…`
 * Optional: ` Adapted from ….` when source publications are supplied.
 *
 * When `datasetDoi` is missing, the DOI URL is omitted (mint pending).
 *
 * @param input - Dataset identity, creators, year, optional DOI, and sources.
 * @returns Single-line citation text ready to copy.
 */
export function buildDatasetCitation(input: BuildDatasetCitationInput): string {
  const title = buildNexafsDatasetCitationTitle(input);
  const year = resolveCitationYear(input.year);
  const publisher =
    (input.publisher ?? DATASET_CITATION_PUBLISHER).trim() ||
    DATASET_CITATION_PUBLISHER;
  const names = normalizeCitationCreatorNames(input.creators);
  const authors = formatApaReferenceAuthors(names);
  const doiUrl = formatDoiCitationUrl(input.datasetDoi);
  const adaptedFrom = formatSourcePublicationClause(input.sourcePublications);

  const head = `${authors} (${year}). ${title} [Dataset]. ${publisher}.`;
  const doiPart = doiUrl ? ` ${doiUrl} (DOI minted via Zenodo).` : "";
  const adapted = adaptedFrom ? ` Adapted from ${adaptedFrom}.` : "";
  return `${head}${doiPart}${adapted}`.replace(/\s+/g, " ").trim();
}

/**
 * Assembles in-text, example sentence, reference, data-availability, and BibTeX
 * citation fragments for the Cite popover.
 *
 * @param input - Same fields as {@link buildDatasetCitation}.
 * @returns Bundle for Cite popover sections.
 */
export function buildDatasetCitationBundle(
  input: BuildDatasetCitationInput,
): DatasetCitationBundle {
  const names = normalizeCitationCreatorNames(input.creators);
  const year = resolveCitationYear(input.year);
  const inText = buildDatasetInTextCitation(names, year);
  return {
    title: buildNexafsDatasetCitationTitle(input),
    year,
    inText,
    inTextExample: buildDatasetInTextExample(
      input.moleculeDisplayName,
      inText,
      input.hostName,
    ),
    reference: buildDatasetCitation(input),
    dataAvailability: buildDatasetDataAvailabilityStatement(input),
    bibtex: buildDatasetBibTeX(input),
  };
}

/**
 * Formats an access date as `YYYY-MM-DD` in UTC for collection citations.
 *
 * @param date - Instant to format; defaults to now.
 * @returns ISO calendar date string (UTC).
 */
export function formatCitationAccessDate(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Builds the preferred Atlas collection / database citation string.
 *
 * Pattern: `{site.name} [Collection DOI]. Accessed [Date].`
 *
 * When no collection DOI is configured ({@link ATLAS_COLLECTION_DOI} is `null`),
 * the DOI segment is omitted rather than inventing a fake identifier:
 * `{site.name}. Accessed [Date].`
 *
 * @param input - Optional access date, collection DOI override, and collection name.
 * @returns Single-line collection citation text ready to copy.
 */
export function buildDatabaseCitation(
  input: BuildDatabaseCitationInput = {},
): string {
  const name = (input.collectionName ?? site.name).trim() || site.name;
  const doiUrl = formatDoiCitationUrl(
    input.collectionDoi === undefined
      ? ATLAS_COLLECTION_DOI
      : input.collectionDoi,
  );
  const accessed = formatCitationAccessDate(input.accessedAt ?? new Date());
  if (doiUrl) {
    return `${name} ${doiUrl}. Accessed ${accessed}.`;
  }
  return `${name}. Accessed ${accessed}.`;
}
