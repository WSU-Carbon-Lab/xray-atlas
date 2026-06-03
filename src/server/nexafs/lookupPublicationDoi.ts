import { normalizeDoi, isCanonicalDoiShape } from "~/lib/doi";
import type { PublicationCitation } from "~/lib/publication-citation";

const CROSSREF_WORKS_URL = "https://api.crossref.org/works";
const DATACITE_DOIS_URL = "https://api.datacite.org/dois";
const LOOKUP_CACHE_TTL_MS = 5 * 60 * 1000;
const LOOKUP_USER_AGENT =
  "X-Ray-Atlas/1.0 (https://xray-atlas.org; mailto:contact@xray-atlas.org)";

type CacheEntry = {
  expiresAt: number;
  value: PublicationLookupResult;
};

const lookupCache = new Map<string, CacheEntry>();

export type PublicationLookupSuggestion = PublicationCitation;

export type PublicationLookupResult =
  | { kind: "resolved"; citation: PublicationCitation }
  | { kind: "suggestions"; suggestions: PublicationLookupSuggestion[] }
  | { kind: "not_found" };

function cacheKey(mode: "doi" | "search", query: string): string {
  return `${mode}:${query.trim().toLowerCase()}`;
}

function readCache(key: string): PublicationLookupResult | null {
  const entry = lookupCache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    lookupCache.delete(key);
    return null;
  }
  return entry.value;
}

function writeCache(key: string, value: PublicationLookupResult): void {
  lookupCache.set(key, { expiresAt: Date.now() + LOOKUP_CACHE_TTL_MS, value });
  if (lookupCache.size > 200) {
    const oldest = lookupCache.keys().next().value;
    if (oldest) {
      lookupCache.delete(oldest);
    }
  }
}

function authorDisplayName(author: Record<string, unknown>): string {
  const literal =
    typeof author.literal === "string" ? author.literal.trim() : "";
  if (literal) {
    return literal;
  }
  const given = typeof author.given === "string" ? author.given.trim() : "";
  const family =
    typeof author.family === "string" ? author.family.trim() : "";
  const parts = [given, family].filter((part) => part.length > 0);
  return parts.join(" ");
}

function parseCrossrefMessage(
  message: Record<string, unknown>,
): PublicationCitation | null {
  const rawDoi =
    typeof message.DOI === "string"
      ? message.DOI
      : typeof message.doi === "string"
        ? message.doi
        : "";
  const doi = normalizeDoi(rawDoi);
  if (!doi || !isCanonicalDoiShape(doi)) {
    return null;
  }
  const titleField = message.title;
  const title =
    Array.isArray(titleField) && typeof titleField[0] === "string"
      ? titleField[0].trim()
      : typeof titleField === "string"
        ? titleField.trim()
        : "";
  if (!title) {
    return null;
  }
  const container = message["container-title"];
  const journal =
    Array.isArray(container) && typeof container[0] === "string"
      ? container[0].trim()
      : typeof container === "string"
        ? container.trim()
        : null;
  const published = message.published;
  let year: number | null = null;
  if (published && typeof published === "object") {
    const dateParts = (published as Record<string, unknown>)["date-parts"];
    if (
      Array.isArray(dateParts) &&
      Array.isArray(dateParts[0]) &&
      typeof dateParts[0][0] === "number"
    ) {
      year = dateParts[0][0];
    }
  }
  const authorField = message.author;
  const authors: string[] = [];
  if (Array.isArray(authorField)) {
    for (const item of authorField) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const name = authorDisplayName(item as Record<string, unknown>);
      if (name) {
        authors.push(name);
      }
    }
  }
  return {
    doi,
    title,
    journal: journal && journal.length > 0 ? journal : null,
    year,
    authors,
  };
}

function parseDataCiteAttributes(
  attrs: Record<string, unknown>,
): PublicationCitation | null {
  const rawDoi =
    typeof attrs.doi === "string"
      ? attrs.doi
      : typeof attrs.identifier === "string"
        ? attrs.identifier
        : "";
  const doi = normalizeDoi(rawDoi);
  if (!doi || !isCanonicalDoiShape(doi)) {
    return null;
  }
  const titles = attrs.titles;
  let title = "";
  if (Array.isArray(titles) && titles[0] && typeof titles[0] === "object") {
    const t = titles[0] as Record<string, unknown>;
    title = typeof t.title === "string" ? t.title.trim() : "";
  }
  if (!title) {
    return null;
  }
  const containers = attrs.container;
  let journal: string | null = null;
  if (
    Array.isArray(containers) &&
    containers[0] &&
    typeof containers[0] === "object"
  ) {
    const c = containers[0] as Record<string, unknown>;
    const j = typeof c.title === "string" ? c.title.trim() : "";
    journal = j.length > 0 ? j : null;
  }
  let year: number | null = null;
  const published = attrs.published;
  if (typeof published === "string" && published.length >= 4) {
    const parsed = Number.parseInt(published.slice(0, 4), 10);
    if (Number.isFinite(parsed)) {
      year = parsed;
    }
  }
  const creators = attrs.creators;
  const authors: string[] = [];
  if (Array.isArray(creators)) {
    for (const creator of creators) {
      if (!creator || typeof creator !== "object") {
        continue;
      }
      const c = creator as Record<string, unknown>;
      const given = typeof c.givenName === "string" ? c.givenName.trim() : "";
      const family =
        typeof c.familyName === "string" ? c.familyName.trim() : "";
      const name = typeof c.name === "string" ? c.name.trim() : "";
      const display =
        name || [given, family].filter((part) => part.length > 0).join(" ");
      if (display) {
        authors.push(display);
      }
    }
  }
  return {
    doi,
    title,
    journal,
    year,
    authors,
  };
}

async function fetchCrossrefWork(doi: string): Promise<PublicationCitation | null> {
  const encoded = encodeURIComponent(doi);
  const response = await fetch(`${CROSSREF_WORKS_URL}/${encoded}`, {
    headers: { Accept: "application/json", "User-Agent": LOOKUP_USER_AGENT },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    return null;
  }
  const json = (await response.json()) as { message?: Record<string, unknown> };
  if (!json.message || typeof json.message !== "object") {
    return null;
  }
  return parseCrossrefMessage(json.message);
}

async function fetchDataCiteWork(doi: string): Promise<PublicationCitation | null> {
  const encoded = encodeURIComponent(doi);
  const response = await fetch(`${DATACITE_DOIS_URL}/${encoded}`, {
    headers: { Accept: "application/vnd.api+json", "User-Agent": LOOKUP_USER_AGENT },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    return null;
  }
  const json = (await response.json()) as {
    data?: { attributes?: Record<string, unknown> };
  };
  const attrs = json.data?.attributes;
  if (!attrs || typeof attrs !== "object") {
    return null;
  }
  return parseDataCiteAttributes(attrs);
}

/**
 * Resolves a canonical DOI to citation metadata using Crossref with a DataCite fallback.
 *
 * @param doi - Normalized DOI body (no `https://doi.org/` prefix).
 * @returns Citation metadata when a registry returns a match; otherwise `null`.
 */
export async function resolvePublicationDoi(
  doi: string,
): Promise<PublicationCitation | null> {
  const normalized = normalizeDoi(doi);
  if (!normalized || !isCanonicalDoiShape(normalized)) {
    return null;
  }
  const cacheHit = readCache(cacheKey("doi", normalized));
  if (cacheHit?.kind === "resolved") {
    return cacheHit.citation;
  }
  const crossref = await fetchCrossrefWork(normalized);
  if (crossref) {
    writeCache(cacheKey("doi", normalized), {
      kind: "resolved",
      citation: crossref,
    });
    return crossref;
  }
  const datacite = await fetchDataCiteWork(normalized);
  if (datacite) {
    writeCache(cacheKey("doi", normalized), {
      kind: "resolved",
      citation: datacite,
    });
    return datacite;
  }
  writeCache(cacheKey("doi", normalized), { kind: "not_found" });
  return null;
}

async function searchCrossrefWorks(
  query: string,
): Promise<PublicationLookupSuggestion[]> {
  const params = new URLSearchParams({
    query: query.trim(),
    rows: "8",
    select: "DOI,title,author,container-title,published",
  });
  const response = await fetch(`${CROSSREF_WORKS_URL}?${params}`, {
    headers: { Accept: "application/json", "User-Agent": LOOKUP_USER_AGENT },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    return [];
  }
  const json = (await response.json()) as {
    message?: { items?: Record<string, unknown>[] };
  };
  const items = json.message?.items;
  if (!Array.isArray(items)) {
    return [];
  }
  const out: PublicationLookupSuggestion[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const citation = parseCrossrefMessage(item);
    if (!citation || seen.has(citation.doi)) {
      continue;
    }
    seen.add(citation.doi);
    out.push(citation);
  }
  return out;
}

/**
 * Looks up publication metadata by DOI or performs a Crossref title search.
 *
 * @param query - User input (DOI URL, DOI body, or free-text title).
 * @returns A resolved citation, search suggestions, or `not_found`.
 */
export async function lookupPublicationDoi(
  query: string,
): Promise<PublicationLookupResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { kind: "not_found" };
  }
  const normalized = normalizeDoi(trimmed);
  if (normalized && isCanonicalDoiShape(normalized)) {
    const cached = readCache(cacheKey("doi", normalized));
    if (cached) {
      return cached;
    }
    const citation = await resolvePublicationDoi(normalized);
    if (citation) {
      const result: PublicationLookupResult = {
        kind: "resolved",
        citation,
      };
      writeCache(cacheKey("doi", normalized), result);
      return result;
    }
    writeCache(cacheKey("doi", normalized), { kind: "not_found" });
    return { kind: "not_found" };
  }

  if (trimmed.length < 3) {
    return { kind: "not_found" };
  }

  const searchKey = cacheKey("search", trimmed);
  const cachedSearch = readCache(searchKey);
  if (cachedSearch) {
    return cachedSearch;
  }

  const suggestions = await searchCrossrefWorks(trimmed);
  if (suggestions.length === 0) {
    writeCache(searchKey, { kind: "not_found" });
    return { kind: "not_found" };
  }
  if (suggestions.length === 1) {
    const result: PublicationLookupResult = {
      kind: "resolved",
      citation: suggestions[0]!,
    };
    writeCache(searchKey, result);
    writeCache(cacheKey("doi", suggestions[0]!.doi), result);
    return result;
  }
  const result: PublicationLookupResult = {
    kind: "suggestions",
    suggestions,
  };
  writeCache(searchKey, result);
  return result;
}

/** Clears the in-memory lookup cache (for tests). */
export function clearPublicationLookupCacheForTests(): void {
  lookupCache.clear();
}
