import {
  normalizeOrcidUserInput,
  orcidUserIdSchema,
} from "~/lib/orcid";

/** How an attribution picker query should be interpreted. */
export type AttributionSearchMode = "full_orcid" | "partial_orcid" | "text";

const ORCID_PARTIAL_PATTERN = /^[\dXx-]{4,19}$/;

/**
 * Classifies free-text attribution search input as a full ORCID iD, partial ORCID fragment, or name/institution text.
 */
export function classifyAttributionSearchQuery(raw: string): {
  mode: AttributionSearchMode;
  normalizedQuery: string;
  normalizedOrcid: string | null;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { mode: "text", normalizedQuery: "", normalizedOrcid: null };
  }

  const normalizedOrcid = normalizeOrcidUserInput(trimmed);
  if (orcidUserIdSchema.safeParse(normalizedOrcid).success) {
    return {
      mode: "full_orcid",
      normalizedQuery: trimmed,
      normalizedOrcid,
    };
  }

  const compact = normalizedOrcid.replace(/[^0-9Xx-]/g, "");
  if (ORCID_PARTIAL_PATTERN.test(compact)) {
    return {
      mode: "partial_orcid",
      normalizedQuery: trimmed,
      normalizedOrcid: compact,
    };
  }

  return { mode: "text", normalizedQuery: trimmed, normalizedOrcid: null };
}

/**
 * Returns whether a debounced query is long enough to run the unified attribution search.
 */
export function isAttributionSearchQueryReady(
  mode: AttributionSearchMode,
  query: string,
): boolean {
  const trimmed = query.trim();
  if (!trimmed) return false;
  if (mode === "full_orcid") return true;
  if (mode === "partial_orcid") {
    return trimmed.replace(/[^0-9Xx-]/g, "").length >= 4;
  }
  return trimmed.length >= 2;
}
