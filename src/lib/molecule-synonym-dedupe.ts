/**
 * Normalizes synonym strings for contribute-form comparison and persistence.
 */

/**
 * Trims whitespace and collapses internal runs of spaces to a single space.
 *
 * @param value - Raw synonym text from user input or an external lookup.
 */
export function normalizeMoleculeSynonym(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Returns whether `candidate` duplicates an existing synonym using
 * case-insensitive comparison after normalization.
 *
 * @param candidate - Proposed synonym text.
 * @param existing - Synonyms already attached to the registry draft.
 */
export function moleculeSynonymIsDuplicate(
  candidate: string,
  existing: readonly string[],
): boolean {
  const normalized = normalizeMoleculeSynonym(candidate).toLowerCase();
  if (normalized.length === 0) return true;
  return existing.some(
    (synonym) => normalizeMoleculeSynonym(synonym).toLowerCase() === normalized,
  );
}

/**
 * Appends a synonym when it is non-empty and not already present; returns the
 * original array reference when unchanged.
 *
 * @param existing - Current synonym list on the draft.
 * @param candidate - Proposed synonym text.
 */
export function appendUniqueMoleculeSynonym(
  existing: readonly string[],
  candidate: string,
): string[] {
  const normalized = normalizeMoleculeSynonym(candidate);
  if (normalized.length === 0 || moleculeSynonymIsDuplicate(normalized, existing)) {
    return [...existing];
  }
  return [...existing, normalized];
}
