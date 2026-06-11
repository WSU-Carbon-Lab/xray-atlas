/** CAS registry number pattern (XXX-XX-X). */
const CAS_REGISTRY_REGEX = /^\d{1,7}-\d{2}-\d$/;

/** PubChem PUG property names requested for compound metadata lookups. */
export const PUBCHEM_COMPOUND_PROPERTY_NAMES = [
  "Title",
  "IUPACName",
  "SMILES",
  "ConnectivitySMILES",
  "IsomericSMILES",
  "CanonicalSMILES",
  "InChI",
  "InChIKey",
  "MolecularFormula",
] as const;

/** Summary row for PubChem candidate picker menus. */
export interface PubChemCandidateSummary {
  cid: string;
  title: string;
  formula: string | null;
}

/** Comma-separated property list for PubChem PUG REST `property` endpoints. */
export const PUBCHEM_COMPOUND_PROPERTY_QUERY =
  PUBCHEM_COMPOUND_PROPERTY_NAMES.join(",");

/** One row from PubChem `PropertyTable.Properties`. */
export interface PubChemPropertyRow {
  CID?: number | null;
  Title?: string | null;
  IUPACName?: string | null;
  SMILES?: string | null;
  ConnectivitySMILES?: string | null;
  IsomericSMILES?: string | null;
  CanonicalSMILES?: string | null;
  InChI?: string | null;
  InChIKey?: string | null;
  MolecularFormula?: string | null;
}

const HILL_FORMULA_REGEX = /^([A-Z][a-z]?\d*)+$/;

/**
 * Returns true when `query` resembles a Hill-system molecular formula (e.g.
 * `C74H94Br2F2O2S8Sn2`) rather than a common name or identifier token.
 *
 * @param query - Raw user search text.
 * @returns True when the string is element/count sequences with at least one digit.
 */
export function isLikelyChemicalFormula(query: string): boolean {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return false;
  }
  if (!/\d/.test(trimmed)) {
    return false;
  }
  return HILL_FORMULA_REGEX.test(trimmed);
}

/**
 * Picks the reader-facing compound title PubChem exposes for list rows.
 *
 * Prefers the PubChem `Title` field, then `IUPACName`, then `fallback`.
 *
 * @param props - Property row from a PubChem compound lookup.
 * @param fallback - Label when PubChem omitted both title fields.
 * @returns Non-empty display title for menus and form population.
 */
export function pickPubChemDisplayTitle(
  props: PubChemPropertyRow | null | undefined,
  fallback: string,
): string {
  const title = trimmedString(props?.Title);
  if (title.length > 0) {
    return title;
  }
  const iupac = trimmedString(props?.IUPACName);
  if (iupac.length > 0) {
    return iupac;
  }
  const trimmedFallback = fallback.trim();
  return trimmedFallback.length > 0 ? trimmedFallback : "PubChem compound";
}

function trimmedString(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Selects the best available SMILES string from a PubChem property row.
 *
 * Prefers `ConnectivitySMILES` (modern canonical connectivity), then `SMILES`,
 * then `IsomericSMILES`, then legacy `CanonicalSMILES`. Multi-component salts
 * and polymer precursors keep PubChem's dot-disconnected notation unchanged.
 *
 * @param props - First property row from a PubChem compound lookup.
 * @returns Trimmed SMILES, or an empty string when PubChem omitted structure notation.
 */
export function pickPubChemSmiles(
  props: PubChemPropertyRow | null | undefined,
): string {
  if (!props) {
    return "";
  }
  const candidates = [
    props.ConnectivitySMILES,
    props.SMILES,
    props.IsomericSMILES,
    props.CanonicalSMILES,
  ];
  for (const candidate of candidates) {
    const trimmed = trimmedString(candidate);
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "";
}

/**
 * Extracts the first CAS registry number embedded in PubChem synonym strings.
 *
 * PubChem often lists CAS RNs as synonyms when xref endpoints are unavailable.
 *
 * @param synonyms - Synonym list from PubChem compound metadata.
 * @returns First valid CAS RN, or `null` when none match the CAS registry pattern.
 */
export function extractCasRegistryFromSynonyms(
  synonyms: readonly string[],
): string | null {
  for (const synonym of synonyms) {
    const trimmed = synonym.trim();
    if (CAS_REGISTRY_REGEX.test(trimmed)) {
      return trimmed;
    }
  }
  return null;
}
