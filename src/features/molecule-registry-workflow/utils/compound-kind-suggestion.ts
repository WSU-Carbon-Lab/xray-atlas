import {
  formatMoleculeFormulaForKind,
  parseRepeatUnitFormula,
  suggestCompoundKindFromIdentity,
  type MoleculeCompoundKind,
} from "~/lib/molecule-compound-kind";

/**
 * Applies compound-kind auto-suggestion after a resolved identity is applied when
 * the form still uses the default small-molecule classification.
 *
 * @param displayName - Resolved display label from lookup.
 * @param chemicalFormula - Current formula field value.
 * @param currentKind - Existing compound kind on the form.
 */
export function applyCompoundKindSuggestionIfDefault(
  displayName: string,
  chemicalFormula: string,
  currentKind: MoleculeCompoundKind | undefined,
): { kind: MoleculeCompoundKind; suggested: boolean } {
  const kind = currentKind ?? "small_molecule";
  if (kind !== "small_molecule") {
    return { kind, suggested: false };
  }
  const suggested = suggestCompoundKindFromIdentity(displayName, chemicalFormula);
  if (!suggested) {
    return { kind, suggested: false };
  }
  return { kind: suggested, suggested: true };
}

/**
 * Formats the repeat-unit formula field when a suggested compound kind is accepted.
 *
 * @param chemicalFormula - Stored formula text before kind change.
 * @param kind - Target compound kind.
 */
export function formatFormulaForCompoundKind(
  chemicalFormula: string,
  kind: MoleculeCompoundKind,
): string {
  return formatMoleculeFormulaForKind(
    parseRepeatUnitFormula(chemicalFormula),
    kind,
  );
}
