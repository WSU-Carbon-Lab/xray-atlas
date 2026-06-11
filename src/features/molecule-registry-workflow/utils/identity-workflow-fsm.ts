import type { MoleculeCompoundKind } from "~/lib/molecule-compound-kind";
import type {
  MoleculeIdentifierSearchMode,
  MoleculePendingLookup,
  MoleculeRegistrySearchFeedback,
  MoleculeResolvedIdentity,
} from "../types";

/**
 * Identity lookup phases for the molecule registry contribute form.
 *
 * `idle` — no active typeahead or confirmation.
 * `querying` — an async lookup is in flight.
 * `results` — live dropdown suggestions for the current query.
 * `matched` — a candidate is held in {@link MoleculePendingLookup} awaiting confirm.
 * `linked` — identity fields were applied from Atlas, PubChem, or CAS.
 * `dirty` — contributor edited registry fields after a link without starting a new search.
 */
export type MoleculeIdentityPhase =
  | "idle"
  | "querying"
  | "results"
  | "matched"
  | "linked"
  | "dirty";

/** Snapshot used to keep match-card thumbnails stable across phase transitions. */
export type MoleculeIdentityPreviewSnapshot = {
  previewSmiles: string | null;
  openBond: number | null;
  closeBond: number | null;
};

export type MoleculeIdentityFsmState = {
  phase: MoleculeIdentityPhase;
  searchQuery: string;
  searchMode: MoleculeIdentifierSearchMode;
  linkedIdentity: MoleculeResolvedIdentity | null;
  pendingLookup: MoleculePendingLookup | null;
  previewSnapshot: MoleculeIdentityPreviewSnapshot | null;
  chemistryWarnings: string[];
  searchFeedback: MoleculeRegistrySearchFeedback;
  polymerKindSuggested: boolean;
};

export type MoleculeIdentityFsmAction =
  | { type: "set_search_mode"; mode: MoleculeIdentifierSearchMode }
  | { type: "set_search_query"; query: string }
  | { type: "begin_query"; queryKey: string }
  | { type: "show_results"; queryKey: string }
  | { type: "queue_match"; pending: MoleculePendingLookup }
  | { type: "apply_match"; identity: MoleculeResolvedIdentity; warnings: string[] }
  | { type: "dismiss_match" }
  | { type: "mark_dirty" }
  | { type: "set_search_feedback"; feedback: MoleculeRegistrySearchFeedback }
  | { type: "set_chemistry_warnings"; warnings: string[] }
  | { type: "set_polymer_kind_suggested"; suggested: boolean }
  | { type: "clear_transient_search" }
  | { type: "reset" };

export const MOLECULE_IDENTITY_FSM_INITIAL: MoleculeIdentityFsmState = {
  phase: "idle",
  searchQuery: "",
  searchMode: "name",
  linkedIdentity: null,
  pendingLookup: null,
  previewSnapshot: null,
  chemistryWarnings: [],
  searchFeedback: {
    searchError: null,
    searchSuccess: null,
    searchWarnings: [],
    pubChemUrl: null,
    resolvedIdentity: null,
  },
  polymerKindSuggested: false,
};

function previewFromPending(
  pending: MoleculePendingLookup,
): MoleculeIdentityPreviewSnapshot {
  return {
    previewSmiles: pending.identity.previewSmiles,
    openBond: null,
    closeBond: null,
  };
}

function previewFromIdentity(
  identity: MoleculeResolvedIdentity,
): MoleculeIdentityPreviewSnapshot {
  return {
    previewSmiles: identity.previewSmiles,
    openBond: null,
    closeBond: null,
  };
}

/**
 * Reduces identity workflow events into the next FSM snapshot.
 *
 * Tab switches only update `searchMode` and never demote `linked` or `matched`.
 * Transient search clears reset errors and pending confirmation without unlinking.
 */
export function reduceMoleculeIdentityFsm(
  state: MoleculeIdentityFsmState,
  action: MoleculeIdentityFsmAction,
): MoleculeIdentityFsmState {
  switch (action.type) {
    case "set_search_mode":
      return { ...state, searchMode: action.mode };

    case "set_search_query":
      return {
        ...state,
        searchQuery: action.query,
        phase:
          state.phase === "linked" || state.phase === "dirty"
            ? state.phase
            : action.query.trim().length >= 2
              ? "results"
              : "idle",
        searchFeedback: {
          ...state.searchFeedback,
          searchError: null,
          searchSuccess: null,
        },
      };

    case "begin_query":
      return {
        ...state,
        phase: "querying",
        searchFeedback: {
          ...state.searchFeedback,
          searchError: null,
          searchSuccess: null,
        },
      };

    case "show_results":
      return {
        ...state,
        phase: action.queryKey.trim().length >= 2 ? "results" : "idle",
      };

    case "queue_match":
      return {
        ...state,
        phase: "matched",
        pendingLookup: action.pending,
        previewSnapshot: previewFromPending(action.pending),
        searchFeedback: {
          searchError: null,
          searchSuccess: null,
          searchWarnings: action.pending.warnings,
          pubChemUrl: action.pending.pubChemUrl,
          resolvedIdentity: null,
        },
      };

    case "apply_match":
      return {
        ...state,
        phase: "linked",
        linkedIdentity: action.identity,
        pendingLookup: null,
        previewSnapshot: previewFromIdentity(action.identity),
        chemistryWarnings: action.warnings,
        searchFeedback: {
          searchError: null,
          searchSuccess: null,
          searchWarnings: action.warnings,
          pubChemUrl: null,
          resolvedIdentity: action.identity,
        },
      };

    case "dismiss_match":
      return {
        ...state,
        phase: state.linkedIdentity !== null ? "linked" : "idle",
        pendingLookup: null,
        searchFeedback: {
          ...state.searchFeedback,
          searchSuccess: null,
        },
      };

    case "mark_dirty":
      if (state.phase !== "linked" && state.phase !== "dirty") {
        return state;
      }
      return { ...state, phase: "dirty" };

    case "set_search_feedback":
      return { ...state, searchFeedback: action.feedback };

    case "set_chemistry_warnings":
      return { ...state, chemistryWarnings: action.warnings };

    case "set_polymer_kind_suggested":
      return { ...state, polymerKindSuggested: action.suggested };

    case "clear_transient_search":
      return {
        ...state,
        pendingLookup: null,
        searchFeedback: {
          ...state.searchFeedback,
          searchError: null,
          searchSuccess: null,
          searchWarnings: [],
          pubChemUrl: null,
          resolvedIdentity: state.linkedIdentity,
        },
        phase:
          state.linkedIdentity !== null
            ? state.phase === "dirty"
              ? "dirty"
              : "linked"
            : state.searchQuery.trim().length >= 2
              ? "results"
              : "idle",
      };

    case "reset":
      return { ...MOLECULE_IDENTITY_FSM_INITIAL };

    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export type CompoundKindInferenceSource =
  | "pubchem_record_type"
  | "polymer_smiles"
  | "cas"
  | "manual";

/**
 * Describes why the UI suggested a compound kind override.
 */
export function compoundKindInferenceLabel(
  source: CompoundKindInferenceSource,
  kind: MoleculeCompoundKind,
): string {
  switch (source) {
    case "pubchem_record_type":
      return `PubChem record suggests ${kind.replace("_", " ")}`;
    case "polymer_smiles":
      return "Polymer SMILES pattern detected";
    case "cas":
      return "CAS metadata suggests polymer";
    case "manual":
      return `Set to ${kind.replace("_", " ")}`;
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}
