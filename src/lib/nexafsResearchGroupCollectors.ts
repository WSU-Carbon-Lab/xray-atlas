import { isValidOrcidUserId } from "~/lib/orcid";

function normalizeGroupToken(raw: string | null | undefined): string {
  return (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Returns collector ORCID iDs inferred from a filename or metadata research-group token.
 * Legacy internal user UUIDs are not returned; map real ORCIDs here when beamtime credit is known.
 */
export function collectorOrcidsForResearchGroupToken(
  token: string | null | undefined,
): string[] {
  if (!token) return [];
  if (normalizeGroupToken(token) === "collins") {
    return [];
  }
  return [];
}

/**
 * Merges attribution collector lists and keeps only valid bare ORCID iDs.
 */
export function mergeUniqueCollectorOrcids(
  ...lists: Array<string[] | undefined>
): string[] {
  const out = new Set<string>();
  for (const list of lists) {
    for (const id of list ?? []) {
      if (typeof id === "string" && isValidOrcidUserId(id)) {
        out.add(id.trim());
      }
    }
  }
  return [...out];
}
