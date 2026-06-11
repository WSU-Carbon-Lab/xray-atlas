import type { AutosuggestMatchType } from "~/lib/molecule-autosuggest";

const MATCH_TYPE_RANK: Record<string, number> = {
  cas_exact: 0,
  pubchem_exact: 1,
  name_exact: 2,
  name_prefix: 3,
  smiles_exact: 4,
  molecule_fts: 5,
  synonym_fts: 6,
};

export type RankableAutosuggestHit = {
  matchType: string;
  commonName: string | null;
  iupacName: string | null;
  textScore?: number;
  overallScore?: number;
};

/**
 * Sorts Atlas autosuggest rows so exact and prefix name hits rank above substring
 * synonym matches while preserving server popularity tie-breakers when present.
 */
export function rankAtlasAutosuggestHits<T extends RankableAutosuggestHit>(
  hits: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  return [...hits].sort((a, b) => {
    const rankA = MATCH_TYPE_RANK[a.matchType] ?? 99;
    const rankB = MATCH_TYPE_RANK[b.matchType] ?? 99;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    const labelA = (a.commonName ?? a.iupacName ?? "").trim().toLowerCase();
    const labelB = (b.commonName ?? b.iupacName ?? "").trim().toLowerCase();
    const exactA = labelA === q ? 0 : labelA.startsWith(q) ? 1 : 2;
    const exactB = labelB === q ? 0 : labelB.startsWith(q) ? 1 : 2;
    if (exactA !== exactB) {
      return exactA - exactB;
    }
    const scoreA = a.overallScore ?? a.textScore ?? 0;
    const scoreB = b.overallScore ?? b.textScore ?? 0;
    return scoreB - scoreA;
  });
}

export function isExactNameMatch(
  hit: RankableAutosuggestHit,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) {
    return false;
  }
  const labels = [hit.commonName, hit.iupacName]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase());
  return labels.some((label) => label === q);
}

export function autosuggestMatchTypeLabel(matchType: string): string | null {
  switch (matchType as AutosuggestMatchType) {
    case "name_exact":
      return "Exact name";
    case "name_prefix":
      return "Name prefix";
    case "synonym_fts":
      return "Synonym";
    case "molecule_fts":
      return "Catalog match";
    case "cas_exact":
      return "CAS";
    case "pubchem_exact":
      return "PubChem ID";
    default:
      return null;
  }
}
