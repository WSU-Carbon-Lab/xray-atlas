"use client";

import { useCallback, useReducer, useState } from "react";
import type { MoleculePendingTag } from "~/components/molecules/category-tags";
import { normalizeMoleculeSynonym } from "~/lib/molecule-synonym-dedupe";
import {
  formatMoleculeFormulaForKind,
  parseRepeatUnitFormula,
  type MoleculeCompoundKind,
} from "~/lib/molecule-compound-kind";
import type { MoleculeUploadData } from "~/types/upload";
import { formatFormulaForCompoundKind } from "../utils/compound-kind-suggestion";
import {
  dedupeChemistryWarnings,
  validateChemistryConsistency,
} from "../utils/chemistry-consistency";
import {
  MOLECULE_IDENTITY_FSM_INITIAL,
  reduceMoleculeIdentityFsm,
  type MoleculeIdentityFsmAction,
  type MoleculeIdentityFsmState,
  type MoleculeIdentityPhase,
} from "../utils/identity-workflow-fsm";
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
  identityPhase: MoleculeIdentityPhase;
  identityFsm: MoleculeIdentityFsmState;
  dispatchIdentity: (action: MoleculeIdentityFsmAction) => void;
  resolvedIdentity: MoleculeResolvedIdentity | null;
  pendingLookup: MoleculePendingLookup | null;
  setPendingLookup: React.Dispatch<
    React.SetStateAction<MoleculePendingLookup | null>
  >;
  polymerKindSuggested: boolean;
  chemistryWarnings: string[];
  searchFeedback: MoleculeRegistrySearchFeedback;
  setSearchFeedback: React.Dispatch<
    React.SetStateAction<MoleculeRegistrySearchFeedback>
  >;
  clearTransientSearch: () => void;
  queuePendingLookup: (pending: MoleculePendingLookup) => void;
  applyPendingLookup: () => void;
  dismissPendingLookup: () => void;
  markIdentityDirty: () => void;
  promoteSynonym: (synonym: string) => void;
  handleCompoundKindChange: (kind: MoleculeCompoundKind) => void;
  resetWorkflow: () => void;
};

/**
 * Orchestrates registry contribute form state with an explicit identity FSM:
 * search query isolation, confirmation-before-apply, linked identity, and dirty edits.
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
  const [identityFsm, dispatchIdentity] = useReducer(
    reduceMoleculeIdentityFsm,
    MOLECULE_IDENTITY_FSM_INITIAL,
  );

  const resolvedIdentity = identityFsm.linkedIdentity;
  const pendingLookup = identityFsm.pendingLookup;
  const polymerKindSuggested = identityFsm.polymerKindSuggested;
  const chemistryWarnings = identityFsm.chemistryWarnings;
  const searchFeedback = identityFsm.searchFeedback;

  const setSearchFeedback = useCallback(
    (updater: React.SetStateAction<MoleculeRegistrySearchFeedback>) => {
      dispatchIdentity({
        type: "set_search_feedback",
        feedback:
          typeof updater === "function"
            ? updater(identityFsm.searchFeedback)
            : updater,
      });
    },
    [identityFsm.searchFeedback],
  );

  const setPendingLookup = useCallback(
    (updater: React.SetStateAction<MoleculePendingLookup | null>) => {
      const next =
        typeof updater === "function" ? updater(identityFsm.pendingLookup) : updater;
      if (next === null) {
        dispatchIdentity({ type: "dismiss_match" });
      } else {
        dispatchIdentity({ type: "queue_match", pending: next });
      }
    },
    [identityFsm.pendingLookup],
  );

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

  const clearTransientSearch = useCallback(() => {
    dispatchIdentity({ type: "clear_transient_search" });
  }, []);

  const queuePendingLookup = useCallback((pending: MoleculePendingLookup) => {
    dispatchIdentity({ type: "queue_match", pending });
  }, []);

  const applyPendingLookup = useCallback(() => {
    const pending = identityFsm.pendingLookup;
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
    const mergedForm: MoleculeUploadData = (() => {
      const merged = {
        ...formData,
        ...pending.formPatch,
        tagIds:
          pending.tagIds.length > 0 ? pending.tagIds : (formData.tagIds ?? []),
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
    })();
    if (pending.compoundKindSuggestion?.suggested) {
      dispatchIdentity({
        type: "set_polymer_kind_suggested",
        suggested: true,
      });
    }
    const chemistry = validateChemistryConsistency(mergedForm);
    const warnings = dedupeChemistryWarnings([
      ...pending.warnings,
      ...chemistry.warnings,
    ]);
    dispatchIdentity({
      type: "apply_match",
      identity: pending.identity,
      warnings,
    });
    dispatchIdentity({
      type: "set_search_query",
      query: mergedForm.commonName.trim(),
    });
  }, [formData, identityFsm.pendingLookup, recordImportedSynonyms]);

  const dismissPendingLookup = useCallback(() => {
    dispatchIdentity({ type: "dismiss_match" });
  }, []);

  const markIdentityDirty = useCallback(() => {
    dispatchIdentity({ type: "mark_dirty" });
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
    dispatchIdentity({ type: "mark_dirty" });
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
    dispatchIdentity({ type: "set_polymer_kind_suggested", suggested: false });
    dispatchIdentity({ type: "mark_dirty" });
  }, []);

  const resetWorkflow = useCallback(() => {
    setFormData(MOLECULE_REGISTRY_INITIAL_FORM);
    setPendingTags([]);
    setImportedSynonyms(new Set());
    setEditingMoleculeId(null);
    dispatchIdentity({ type: "reset" });
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
    identityPhase: identityFsm.phase,
    identityFsm,
    dispatchIdentity,
    resolvedIdentity,
    pendingLookup,
    setPendingLookup,
    polymerKindSuggested,
    chemistryWarnings,
    searchFeedback,
    setSearchFeedback,
    clearTransientSearch,
    queuePendingLookup,
    applyPendingLookup,
    dismissPendingLookup,
    markIdentityDirty,
    promoteSynonym,
    handleCompoundKindChange,
    resetWorkflow,
  };
}
