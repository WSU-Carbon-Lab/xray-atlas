import type { MoleculeSearchResult } from "~/features/nexafs-contribute";

export type AutosuggestMatchType =
  | "cas_exact"
  | "pubchem_exact"
  | "name_exact"
  | "name_prefix"
  | "molecule_fts"
  | "synonym_fts";

export interface AutosuggestItem {
  id: string;
  iupacName: string;
  commonName: string;
  synonyms: string[];
  inchi: string;
  smiles: string;
  chemicalFormula: string;
  casNumber: string | null;
  pubChemCid: string | null;
  imageUrl?: string;
  favoriteCount: number;
  viewCount: number;
  matchType: AutosuggestMatchType;
  textScore: number;
  popularityScore: number;
  overallScore: number;
}

export function toMoleculeSearchResult(
  item: AutosuggestItem,
): MoleculeSearchResult {
  return {
    id: item.id,
    iupacName: item.iupacName,
    commonName: item.commonName,
    synonyms: item.synonyms,
    inchi: item.inchi,
    smiles: item.smiles,
    chemicalFormula: item.chemicalFormula,
    casNumber: item.casNumber,
    pubChemCid: item.pubChemCid,
    imageUrl: item.imageUrl,
  };
}

export function toSimpleHeaderResult(item: AutosuggestItem): {
  id: string;
  commonName: string;
  iupacName: string;
  chemicalFormula: string;
} {
  return {
    id: item.id,
    commonName: item.commonName,
    iupacName: item.iupacName,
    chemicalFormula: item.chemicalFormula,
  };
}

