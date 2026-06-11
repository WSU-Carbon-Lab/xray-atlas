/**
 * Client-side compound classification for molecule registry contribute flows.
 * Persists formatted formula text in `molecules.chemicalformula` until a dedicated
 * schema field exists.
 */

export const MOLECULE_COMPOUND_KINDS = [
  "small_molecule",
  "polymer",
  "oligomer",
  "macromolecule",
] as const;

export type MoleculeCompoundKind = (typeof MOLECULE_COMPOUND_KINDS)[number];

const COMPOUND_KIND_LABELS: Record<MoleculeCompoundKind, string> = {
  small_molecule: "Small molecule",
  polymer: "Polymer",
  oligomer: "Oligomer",
  macromolecule: "Macromolecule",
};

/**
 * Returns reader-facing copy for a compound kind selector option.
 *
 * @param kind - Registry compound classification value.
 */
export function moleculeCompoundKindLabel(kind: MoleculeCompoundKind): string {
  return COMPOUND_KIND_LABELS[kind];
}

/**
 * Reports whether the compound kind uses repeat-unit formula notation and
 * polymer-style structure depiction rules on the contribute form.
 *
 * @param kind - Registry compound classification value.
 */
export function isPolymerLikeCompoundKind(kind: MoleculeCompoundKind): boolean {
  return kind === "polymer" || kind === "macromolecule";
}

/**
 * Formats a repeat-unit or Hill formula for display and persistence when the
 * compound is classified as a polymer or macromolecule.
 *
 * @param repeatUnitFormula - Elemental formula for one repeat unit (e.g. `C8H8`).
 * @param kind - Selected compound kind; only polymer-like kinds receive `(formula)n`.
 */
export function formatMoleculeFormulaForKind(
  repeatUnitFormula: string,
  kind: MoleculeCompoundKind,
): string {
  const trimmed = repeatUnitFormula.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }
  if (kind === "polymer" || kind === "macromolecule") {
    const inner = trimmed.startsWith("(") && trimmed.endsWith(")")
      ? trimmed
      : `(${trimmed})`;
    return `${inner}n`;
  }
  return trimmed;
}

/**
 * Strips a trailing polymer repeat notation `(…)n` for editing the repeat unit.
 *
 * @param storedFormula - Value from the form or database.
 */
export function parseRepeatUnitFormula(storedFormula: string): string {
  const trimmed = storedFormula.trim();
  const polymerMatch = /^\((.+)\)n$/.exec(trimmed);
  if (polymerMatch?.[1]) {
    return polymerMatch[1];
  }
  if (trimmed.endsWith("n") && trimmed.includes("(")) {
    return trimmed.replace(/n$/, "").trim();
  }
  return trimmed;
}

const POLYMER_IDENTITY_NAME_PATTERNS: ReadonlyArray<RegExp> = [
  /\bpoly(?:mer|styrene|ethylene|propylene|amide|ester|urethane|siloxane|carbonate|imide|acrylate|vinyl)\b/i,
  /\b(?:PMMA|P3HT|PTFE|PVC|PDMS|PET|PEEK|PS|PE|PP|PAN|PI|PVA|PVP)\b/,
  /\bPM6\b/i,
  /\brepeat[- ]unit\b/i,
  /\b(?:homo|co|block|graft)polymer\b/i,
  /\bmacromolecule\b/i,
  /\boligomer\b/i,
  /\bhigh[- ]molecular[- ]weight\b/i,
  /\bMw\b.*\b(?:kDa|Da|g\/mol)\b/i,
];

/**
 * Suggests a compound kind from PubChem or Atlas display text when the form
 * still uses the default small-molecule classification.
 *
 * @param displayName - Resolved title, IUPAC, or catalog label.
 * @param chemicalFormula - Hill or repeat-unit formula from lookup.
 */
export function suggestCompoundKindFromIdentity(
  displayName: string,
  chemicalFormula: string,
): MoleculeCompoundKind | null {
  const name = displayName.trim();
  const formula = chemicalFormula.trim();

  if (/\boligomer\b/i.test(name)) {
    return "oligomer";
  }
  if (/\bmacromolecule\b/i.test(name)) {
    return "macromolecule";
  }
  if (
    POLYMER_IDENTITY_NAME_PATTERNS.some((pattern) => pattern.test(name)) ||
    /^\(.+\)n$/i.test(formula) ||
    /\)\s*n$/i.test(formula)
  ) {
    return "polymer";
  }
  return null;
}
