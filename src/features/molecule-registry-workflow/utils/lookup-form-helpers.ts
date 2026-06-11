import {
  appendUniqueMoleculeSynonym,
  normalizeMoleculeSynonym,
} from "~/lib/molecule-synonym-dedupe";
import type { MoleculeUploadData } from "~/types/upload";

export function firstTrimmedNonEmpty(
  ...values: Array<string | null | undefined>
): string {
  for (const value of values) {
    const trimmed = value?.trim() ?? "";
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "";
}

export function trimmedOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export type PubChemLookupResult = {
  title?: string;
  iupacName?: string;
  commonName?: string;
  synonyms?: string[];
  inchi?: string;
  smiles?: string;
  chemicalFormula?: string;
  casNumber?: string | null;
  pubChemCid?: string;
};

function mergeImportedSynonyms(
  existing: readonly string[],
  imported: readonly string[],
): string[] {
  let merged = [...existing];
  for (const synonym of imported) {
    merged = appendUniqueMoleculeSynonym(merged, synonym);
  }
  return merged;
}

/**
 * Maps a PubChem compound detail payload onto registry upload form fields.
 *
 * @param result - PubChem property row normalized by the external router.
 * @param lookupQuery - User-typed label used when PubChem omits a title.
 * @param options.preserveDrawnSmiles - Keeps sketcher SMILES when enriching from structure search.
 * @param options.fillEmptyFieldsOnly - Merges into existing manual edits without overwriting.
 */
export function applyPubChemResultToForm(
  result: PubChemLookupResult,
  lookupQuery: string,
  options?: { preserveDrawnSmiles?: string; fillEmptyFieldsOnly?: boolean },
): (prev: MoleculeUploadData) => MoleculeUploadData {
  const displayName =
    result.title?.trim() ??
    result.iupacName?.trim() ??
    result.commonName?.trim() ??
    lookupQuery.trim();
  const commonName =
    lookupQuery.trim().length > 0 &&
    lookupQuery.trim().toLowerCase() !== displayName.toLowerCase()
      ? lookupQuery.trim()
      : (result.commonName?.trim() ?? lookupQuery.trim());

  const importedSynonyms =
    result.synonyms?.filter(
      (synonym): synonym is string =>
        typeof synonym === "string" && synonym.trim().length > 0,
    ) ?? [];
  const drawnSmiles = options?.preserveDrawnSmiles?.trim() ?? "";
  const fillEmptyOnly = options?.fillEmptyFieldsOnly === true;

  return (prev) => {
    if (!fillEmptyOnly) {
      return {
        ...prev,
        iupacName: displayName,
        commonName:
          prev.commonName.trim().length > 0 ? prev.commonName : commonName,
        synonyms: importedSynonyms.length > 0 ? importedSynonyms : prev.synonyms,
        inchi: result.inchi ?? prev.inchi,
        smiles: result.smiles ?? prev.smiles,
        chemicalFormula: result.chemicalFormula ?? prev.chemicalFormula,
        casNumber: result.casNumber ?? prev.casNumber,
        pubchemCid: result.pubChemCid ?? prev.pubchemCid,
      };
    }

    return {
      ...prev,
      iupacName: prev.iupacName.trim().length > 0 ? prev.iupacName : displayName,
      commonName:
        prev.commonName.trim().length > 0 ? prev.commonName : commonName,
      synonyms:
        importedSynonyms.length > 0
          ? mergeImportedSynonyms(prev.synonyms, importedSynonyms)
          : prev.synonyms,
      inchi: prev.inchi.trim().length > 0 ? prev.inchi : (result.inchi ?? ""),
      smiles:
        drawnSmiles.length > 0
          ? drawnSmiles
          : prev.smiles.trim().length > 0
            ? prev.smiles
            : (result.smiles ?? ""),
      chemicalFormula:
        prev.chemicalFormula.trim().length > 0
          ? prev.chemicalFormula
          : (result.chemicalFormula ?? ""),
      casNumber: prev.casNumber ?? result.casNumber ?? null,
      pubchemCid: prev.pubchemCid ?? result.pubChemCid ?? null,
    };
  };
}

/**
 * Promotes a synonym to the preferred display name while deduping the synonym list.
 *
 * @param preferredName - Synonym text to become `commonName`.
 * @param synonyms - Current synonym chips excluding the promoted label.
 * @param previousPreferred - Prior preferred name reinserted as a synonym when non-empty.
 */
export function promoteSynonymToPreferredName(
  preferredName: string,
  synonyms: string[],
  previousPreferred: string,
): { commonName: string; synonyms: string[] } {
  const normalizedPreferred = normalizeMoleculeSynonym(preferredName);
  const prior = normalizeMoleculeSynonym(previousPreferred);
  let nextSynonyms = synonyms.filter(
    (synonym) =>
      normalizeMoleculeSynonym(synonym).toLowerCase() !==
      normalizedPreferred.toLowerCase(),
  );
  if (prior.length > 0 && prior.toLowerCase() !== normalizedPreferred.toLowerCase()) {
    nextSynonyms = appendUniqueMoleculeSynonym(nextSynonyms, prior);
  }
  return { commonName: normalizedPreferred, synonyms: nextSynonyms };
}
