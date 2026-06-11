import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  MOLECULE_IDENTITY_FSM_INITIAL,
  reduceMoleculeIdentityFsm,
} from "./identity-workflow-fsm";
import type { MoleculePendingLookup } from "../types";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const PENDING: MoleculePendingLookup = {
  identity: {
    source: "pubchem",
    displayName: "Polystyrene",
    chemicalFormula: "(C8H8)n",
    pubChemCid: "7501",
    casNumber: null,
    atlasMoleculeId: null,
    casVerified: false,
    statusDetail: null,
    previewSmiles: "CC(c1ccccc1)",
  },
  formPatch: { commonName: "Polystyrene" },
  editingMoleculeId: null,
  importedSynonyms: [],
  warnings: [],
  pubChemUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/7501",
  tagIds: [],
  compoundKindSuggestion: null,
};

describe("reduceMoleculeIdentityFsm", () => {
  it("keeps linked phase when search mode changes", () => {
    const linked = reduceMoleculeIdentityFsm(
      {
        ...MOLECULE_IDENTITY_FSM_INITIAL,
        phase: "linked",
        linkedIdentity: PENDING.identity,
      },
      { type: "set_search_mode", mode: "id" },
    );
    expect(linked.phase).toBe("linked");
    expect(linked.linkedIdentity?.displayName).toBe("Polystyrene");
  });

  it("does not demote linked identity when typing a new query", () => {
    const linked = reduceMoleculeIdentityFsm(
      {
        ...MOLECULE_IDENTITY_FSM_INITIAL,
        phase: "linked",
        linkedIdentity: PENDING.identity,
        searchQuery: "",
      },
      { type: "set_search_query", query: "poly" },
    );
    expect(linked.phase).toBe("linked");
    expect(linked.searchQuery).toBe("poly");
    expect(linked.linkedIdentity).toEqual(PENDING.identity);
  });

  it("transitions matched to linked on apply", () => {
    const matched = reduceMoleculeIdentityFsm(
      MOLECULE_IDENTITY_FSM_INITIAL,
      { type: "queue_match", pending: PENDING },
    );
    expect(matched.phase).toBe("matched");
    const linked = reduceMoleculeIdentityFsm(matched, {
      type: "apply_match",
      identity: PENDING.identity,
      warnings: ["note"],
    });
    expect(linked.phase).toBe("linked");
    expect(linked.pendingLookup).toBe(null);
    expect(linked.chemistryWarnings).toEqual(["note"]);
  });

  it("clear_transient_search preserves linked identity", () => {
    const linked = reduceMoleculeIdentityFsm(
      {
        ...MOLECULE_IDENTITY_FSM_INITIAL,
        phase: "linked",
        linkedIdentity: PENDING.identity,
      },
      { type: "clear_transient_search" },
    );
    expect(linked.phase).toBe("linked");
    expect(linked.linkedIdentity?.displayName).toBe("Polystyrene");
    expect(linked.searchFeedback.resolvedIdentity).toEqual(PENDING.identity);
  });

  it("marks dirty after linked edits", () => {
    const dirty = reduceMoleculeIdentityFsm(
      {
        ...MOLECULE_IDENTITY_FSM_INITIAL,
        phase: "linked",
        linkedIdentity: PENDING.identity,
      },
      { type: "mark_dirty" },
    );
    expect(dirty.phase).toBe("dirty");
  });
});
