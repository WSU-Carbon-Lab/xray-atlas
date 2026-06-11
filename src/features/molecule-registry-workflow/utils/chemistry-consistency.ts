import { Molecule } from "openchemlib";
import {
  formatMoleculeFormulaForKind,
  parseRepeatUnitFormula,
} from "~/lib/molecule-compound-kind";
import type { MoleculeUploadData } from "~/types/upload";

export type ChemistryConsistencyResult = {
  ok: boolean;
  warnings: string[];
};

/**
 * Removes duplicate warning strings while preserving first-seen order.
 *
 * @param warnings - Raw warning messages from lookup and chemistry validation.
 * @returns Deduped warnings safe for React list keys and UI display.
 */
export function dedupeChemistryWarnings(warnings: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const warning of warnings) {
    const trimmed = warning.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function normalizeFormula(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function formulaFromSmiles(smiles: string): string | null {
  const trimmed = smiles.trim();
  if (trimmed.length === 0) {
    return null;
  }
  try {
    const mol = Molecule.fromSmiles(trimmed);
    const formula = mol.getMolecularFormula().formula;
    return formula.trim().length > 0 ? formula : null;
  } catch {
    return null;
  }
}

/**
 * Validates SMILES, InChI, and chemical formula coherence for a registry draft.
 *
 * For polymers, compares repeat-unit formula notation against SMILES-derived
 * Hill formula when SMILES parses. Surfaces non-blocking warnings before save.
 */
export function validateChemistryConsistency(
  form: MoleculeUploadData,
): ChemistryConsistencyResult {
  const warnings: string[] = [];
  const compoundKind = form.compoundKind ?? "small_molecule";
  const smiles = form.smiles.trim();
  const inchi = form.inchi.trim();
  const storedFormula = form.chemicalFormula.trim();

  if (smiles.length === 0 && inchi.length === 0 && storedFormula.length === 0) {
    return { ok: true, warnings };
  }

  let smilesFormula: string | null = null;
  if (smiles.length > 0) {
    smilesFormula = formulaFromSmiles(smiles);
    if (smilesFormula === null) {
      warnings.push("SMILES could not be parsed for formula cross-check.");
    }
  }

  if (storedFormula.length > 0 && smilesFormula !== null) {
    const repeatUnit =
      compoundKind === "polymer" || compoundKind === "macromolecule"
        ? parseRepeatUnitFormula(storedFormula)
        : storedFormula;
    const displayStored =
      compoundKind === "polymer" || compoundKind === "macromolecule"
        ? parseRepeatUnitFormula(
            formatMoleculeFormulaForKind(repeatUnit, compoundKind),
          )
        : storedFormula;
    const normalizedStored = normalizeFormula(displayStored);
    const normalizedSmiles = normalizeFormula(smilesFormula);
    if (
      normalizedStored.length > 0 &&
      normalizedSmiles.length > 0 &&
      normalizedStored !== normalizedSmiles
    ) {
      warnings.push(
        `Formula (${displayStored}) differs from SMILES-derived formula (${smilesFormula}). Review before saving.`,
      );
    }
  }

  if (inchi.length > 0 && smiles.length === 0) {
    warnings.push(
      "InChI is set without a SMILES structure; add SMILES or confirm the stub workflow.",
    );
  }

  if (smiles.length > 0 && inchi.length === 0 && !form.registryStub) {
    warnings.push(
      "SMILES is present without InChI; lookup or paste InChI before save when possible.",
    );
  }

  return { ok: warnings.length === 0, warnings: dedupeChemistryWarnings(warnings) };
}
