import type { MoleculeView } from "~/types/molecule";
import { CAS_REGEX } from "./molecule-display-constants";

/**
 * Builds the PubChem compound page URL for a numeric CID.
 */
export function pubChemUrl(cid: string): string {
  return `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`;
}

/**
 * Builds the CAS Common Chemistry detail URL for a registry number.
 */
export function casUrl(casNumber: string): string {
  return `https://commonchemistry.cas.org/detail?cas_rn=${casNumber}&search=${casNumber}`;
}

/**
 * Validates CAS registry number format when non-empty; empty input is treated as valid.
 */
export function validateCas(value: string): boolean {
  if (!value.trim()) return true;
  return CAS_REGEX.test(value.trim());
}

/**
 * Validates PubChem CID format when non-empty; empty input is treated as valid.
 */
export function validatePubChemCid(value: string): boolean {
  if (!value.trim()) return true;
  return /^\d+$/.test(value.trim());
}

/**
 * Returns non-empty common names from a molecule view, or an empty list when none are set.
 */
export function getCommonNames(molecule: MoleculeView): string[] {
  const list = molecule.commonName;
  if (Array.isArray(list)) {
    const valid = list.filter(
      (name): name is string =>
        typeof name === "string" && name.trim().length > 0,
    );
    if (valid.length > 0) return valid;
  }
  return [];
}

/**
 * Copies text to the clipboard when the browser API is available.
 */
export function copyTextToClipboard(text: string): void {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    void navigator.clipboard.writeText(text);
  }
}

/**
 * Picks up to three shortest synonym labels, deprioritizing the primary display name when alternatives exist.
 */
export function shortestSynonymsFromOrdered(
  orderedSynonyms: string[],
  primaryName: string,
): string[] {
  if (orderedSynonyms.length === 0) return [];
  const sorted = [...orderedSynonyms].sort((a, b) => a.length - b.length);
  const filtered =
    sorted.length > 1 && sorted.includes(primaryName)
      ? sorted.filter((s) => s !== primaryName)
      : sorted;
  return filtered.length > 0 ? filtered.slice(0, 3) : sorted.slice(0, 3);
}
