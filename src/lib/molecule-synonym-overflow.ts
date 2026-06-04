import { slugifyMoleculeSynonym } from "~/lib/molecule-slug";

/**
 * Normalizes a synonym string for duplicate detection (trim + lowercase).
 */
export function normalizeMoleculeSynonymKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Returns whether `synonym` denotes the same label as `reference`, using
 * case-insensitive text match and optional slug equality.
 */
export function moleculeSynonymMatchesReference(
  synonym: string,
  reference: string,
  options?: { slugMatch?: boolean },
): boolean {
  const a = synonym.trim();
  const b = reference.trim();
  if (!a || !b) {
    return false;
  }
  if (normalizeMoleculeSynonymKey(a) === normalizeMoleculeSynonymKey(b)) {
    return true;
  }
  if (options?.slugMatch ?? true) {
    return slugifyMoleculeSynonym(a) === slugifyMoleculeSynonym(b);
  }
  return false;
}

function isExcludedSynonym(
  synonym: string,
  excludeNames: readonly string[],
): boolean {
  return excludeNames.some(
    (ref) => ref.trim().length > 0 && moleculeSynonymMatchesReference(synonym, ref),
  );
}

/**
 * Lists synonyms that are not the primary/canonical display name and not already
 * shown in `excludeNames`, preserving input order and dropping case-insensitive
 * duplicates within the overflow set.
 */
export function moleculeOverflowSynonyms(
  synonyms: readonly string[],
  options: {
    primaryName?: string;
    excludeNames?: readonly string[];
  },
): string[] {
  const excludeNames = [
    ...(options.primaryName ? [options.primaryName] : []),
    ...(options.excludeNames ?? []),
  ];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const syn of synonyms) {
    const trimmed = syn.trim();
    if (!trimmed || isExcludedSynonym(trimmed, excludeNames)) {
      continue;
    }
    const key = normalizeMoleculeSynonymKey(trimmed);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}
