"use client";

import { useCallback, useState } from "react";
import type { MoleculePendingTag } from "~/components/molecules/category-tags";
import { normalizeMoleculeSynonym } from "~/lib/molecule-synonym-dedupe";
import {
  formatMoleculeFormulaForKind,
  parseRepeatUnitFormula,
  type MoleculeCompoundKind,
} from "~/lib/molecule-compound-kind";
import type { MoleculeUploadData } from "~/types/upload";
import { formatFormulaForCompoundKind } from "../utils/compound-kind-suggestion";
import { promoteSynonymToPreferredName } from "../utils/lookup-form-helpers";
import type {
  MoleculePendingLookup,
  MoleculeRegistrySearchFeedback,
  MoleculeResolvedIdentity,
} from "../types";

export const MOLECULE_REGISTRY_INITIAL_FORM: MoleculeUploadData = {
  iupacName: "",
  commonName: "",
  synonyms: [],
  inchi: "",
  smiles: "",
  chemicalFormula: "",
  casNumber: null,
  pubchemCid: null,
  tagIds: [],
  compoundKind: "small_molecule",
  registryStub: false,
};

export type UseMoleculeRegistryWorkflowResult = {
  formData: MoleculeUploadData;
  setFormData: React.Dispatch<React.SetStateAction<MoleculeUploadData>>;
  pendingTags: MoleculePendingTag[];
  setPendingTags: React.Dispatch<React.SetStateAction<MoleculePendingTag[]>>;
  importedSynonyms: Set<string>;
  recordImportedSynonyms: (synonyms: string[]) => void;
  editingMoleculeId: string | null;
  setEditingMoleculeId: (id: string | null) => void;
  resolvedIdentity: MoleculeResolvedIdentity | null;
  pendingLookup: MoleculePendingLookup | null;
  setPendingLookup: React.Dispatch<
    React.SetStateAction<MoleculePendingLookup | null>
  >;
  polymerKindSuggested: boolean;
  searchFeedback: MoleculeRegistrySearchFeedback;
  setSearchFeedback: React.Dispatch<
    React.SetStateAction<MoleculeRegistrySearchFeedback>
  >;
  clearSearchFeedback: () => void;
  applyPendingLookup: () => void;
  dismissPendingLookup: () => void;
  promoteSynonym: (synonym: string) => void;
  handleCompoundKindChange: (kind: MoleculeCompoundKind) => void;
  resetWorkflow: () => void;
};

const EMPTY_FEEDBACK: MoleculeRegistrySearchFeedback = {
  searchError: null,
  searchSuccess: null,
  searchWarnings: [],
  pubChemUrl: null,
  resolvedIdentity: null,
};

/**
 * Orchestrates registry contribute form state: identity lookup confirmation,
 * synonym promotion, and compound-kind suggestions.
 */
export function useMoleculeRegistryWorkflow(): UseMoleculeRegistryWorkflowResult {
  const [formData, setFormData] = useState<MoleculeUploadData>(
    MOLECULE_REGISTRY_INITIAL_FORM,
  );
  const [pendingTags, setPendingTags] = useState<MoleculePendingTag[]>([]);
  const [importedSynonyms, setImportedSynonyms] = useState<Set<string>>(
    () => new Set(),
  );
  const [editingMoleculeId, setEditingMoleculeId] = useState<string | null>(
    null,
  );
  const [resolvedIdentity, setResolvedIdentity] =
    useState<MoleculeResolvedIdentity | null>(null);
  const [pendingLookup, setPendingLookup] =
    useState<MoleculePendingLookup | null>(null);
  const [polymerKindSuggested, setPolymerKindSuggested] = useState(false);
  const [searchFeedback, setSearchFeedback] =
    useState<MoleculeRegistrySearchFeedback>(EMPTY_FEEDBACK);

  const recordImportedSynonyms = useCallback((synonyms: string[]) => {
    const normalized = synonyms
      .map((synonym) => normalizeMoleculeSynonym(synonym))
      .filter((synonym) => synonym.length > 0);
    if (normalized.length === 0) return;
    setImportedSynonyms((prev) => {
      const next = new Set(prev);
      for (const synonym of normalized) {
        next.add(synonym);
      }
      return next;
    });
  }, []);

  const clearSearchFeedback = useCallback(() => {
    setSearchFeedback(EMPTY_FEEDBACK);
    setResolvedIdentity(null);
    setPolymerKindSuggested(false);
    setPendingLookup(null);
  }, []);

  const applyPendingLookup = useCallback(() => {
    const pending = pendingLookup;
    if (!pending) {
      return;
    }
    if (pending.importedSynonyms.length > 0) {
      recordImportedSynonyms(pending.importedSynonyms);
    }
    setEditingMoleculeId(pending.editingMoleculeId);
    setFormData((prev) => {
      const merged = {
        ...prev,
        ...pending.formPatch,
        tagIds:
          pending.tagIds.length > 0 ? pending.tagIds : (prev.tagIds ?? []),
      };
      if (pending.compoundKindSuggestion?.suggested) {
        return {
          ...merged,
          compoundKind: pending.compoundKindSuggestion.kind,
          chemicalFormula: formatFormulaForCompoundKind(
            merged.chemicalFormula,
            pending.compoundKindSuggestion.kind,
          ),
        };
      }
      return merged;
    });
    setPolymerKindSuggested(
      pending.compoundKindSuggestion?.suggested === true,
    );
    setResolvedIdentity(pending.identity);
    setSearchFeedback({
      searchError: null,
      searchSuccess: null,
      searchWarnings: pending.warnings,
      pubChemUrl: pending.pubChemUrl,
      resolvedIdentity: pending.identity,
    });
    setPendingLookup(null);
  }, [pendingLookup, recordImportedSynonyms]);

  const dismissPendingLookup = useCallback(() => {
    setPendingLookup(null);
    setSearchFeedback((prev) => ({
      ...prev,
      searchSuccess: null,
    }));
  }, []);

  const promoteSynonym = useCallback((synonym: string) => {
    setFormData((prev) => {
      const { commonName, synonyms } = promoteSynonymToPreferredName(
        synonym,
        prev.synonyms,
        prev.commonName,
      );
      const iupac =
        prev.iupacName.trim().length > 0 &&
        prev.iupacName.toLowerCase() === prev.commonName.toLowerCase()
          ? commonName
          : prev.iupacName;
      return { ...prev, commonName, synonyms, iupacName: iupac };
    });
  }, []);

  const handleCompoundKindChange = useCallback((kind: MoleculeCompoundKind) => {
    setFormData((prev) => ({
      ...prev,
      compoundKind: kind,
      chemicalFormula: formatMoleculeFormulaForKind(
        parseRepeatUnitFormula(prev.chemicalFormula),
        kind,
      ),
    }));
    setPolymerKindSuggested(false);
  }, []);

  const resetWorkflow = useCallback(() => {
    setFormData(MOLECULE_REGISTRY_INITIAL_FORM);
    setPendingTags([]);
    setImportedSynonyms(new Set());
    setEditingMoleculeId(null);
    setPolymerKindSuggested(false);
    setPendingLookup(null);
    setSearchFeedback(EMPTY_FEEDBACK);
    setResolvedIdentity(null);
  }, []);

  return {
    formData,
    setFormData,
    pendingTags,
    setPendingTags,
    importedSynonyms,
    recordImportedSynonyms,
    editingMoleculeId,
    setEditingMoleculeId,
    resolvedIdentity,
    pendingLookup,
    setPendingLookup,
    polymerKindSuggested,
    searchFeedback,
    setSearchFeedback,
    clearSearchFeedback,
    applyPendingLookup,
    dismissPendingLookup,
    promoteSynonym,
    handleCompoundKindChange,
    resetWorkflow,
  };
}
