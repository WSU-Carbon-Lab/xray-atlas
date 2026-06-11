import type { MoleculeCompoundKind } from "~/lib/molecule-compound-kind";
import type { PubChemCandidateSummary } from "~/lib/pubchem-compound";
import type { MoleculeUploadData } from "~/types/upload";

export type MoleculeResolvedIdentitySource = "atlas" | "pubchem" | "cas";

/**
 * Summary of an Atlas, PubChem, or CAS identifier lookup awaiting confirmation
 * or already applied on the registry contribute form.
 */
export type MoleculeResolvedIdentity = {
  source: MoleculeResolvedIdentitySource;
  displayName: string;
  chemicalFormula: string | null;
  pubChemCid: string | null;
  casNumber: string | null;
  atlasMoleculeId: string | null;
  casVerified: boolean;
  statusDetail: string | null;
  /** Connectivity SMILES or catalog SMILES when known for depiction preview. */
  previewSmiles: string | null;
};

/**
 * One row in a multi-match lookup confirmation list.
 */
export type MoleculeLookupCandidate = PubChemCandidateSummary & {
  previewSmiles: string | null;
};

/**
 * Lookup result held until the contributor confirms or dismisses.
 */
export type MoleculePendingLookup = {
  identity: MoleculeResolvedIdentity;
  formPatch: Partial<MoleculeUploadData>;
  editingMoleculeId: string | null;
  importedSynonyms: string[];
  warnings: string[];
  pubChemUrl: string | null;
  tagIds: string[];
  compoundKindSuggestion: {
    kind: MoleculeCompoundKind;
    suggested: boolean;
  } | null;
  /** When multiple PubChem rows match, user picks one before applying. */
  candidates?: MoleculeLookupCandidate[];
};

export type MoleculeIdentifierSearchMode = "name" | "id" | "structure";

export type MoleculeRegistrySearchFeedback = {
  searchError: string | null;
  searchSuccess: string | null;
  searchWarnings: string[];
  pubChemUrl: string | null;
  resolvedIdentity: MoleculeResolvedIdentity | null;
};
