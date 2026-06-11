export type {
  MoleculeIdentifierSearchMode,
  MoleculeLookupCandidate,
  MoleculePendingLookup,
  MoleculeRegistrySearchFeedback,
  MoleculeResolvedIdentity,
  MoleculeResolvedIdentitySource,
} from "./types";

export {
  MOLECULE_REGISTRY_INITIAL_FORM,
  useMoleculeRegistryWorkflow,
} from "./hooks/use-molecule-registry-workflow";

export { MoleculeLookupConfirmation } from "./components/molecule-lookup-confirmation";
export { MoleculePreferredIdentity } from "./components/molecule-preferred-identity";
export { MoleculeStructureSearchTab } from "./components/molecule-structure-search-tab";
export { RegistryDepictionThumbnail } from "./components/registry-depiction-thumbnail";

export {
  applyPubChemResultToForm,
  firstTrimmedNonEmpty,
  promoteSynonymToPreferredName,
  trimmedOrNull,
} from "./utils/lookup-form-helpers";

export {
  readPubChemCidCache,
  writePubChemCidCache,
} from "./utils/pubchem-session-cache";

export { createLookupRequestGeneration } from "./utils/lookup-request-generation";

export type {
  MoleculeIdentityPreviewSnapshot,
  MoleculeIdentityPhase,
  MoleculeIdentityFsmAction,
  MoleculeIdentityFsmState,
} from "./utils/identity-workflow-fsm";

export {
  MOLECULE_IDENTITY_FSM_INITIAL,
  reduceMoleculeIdentityFsm,
} from "./utils/identity-workflow-fsm";

export {
  dedupeChemistryWarnings,
  validateChemistryConsistency,
} from "./utils/chemistry-consistency";

export type { StructureLookupOptions } from "./utils/structure-lookup-pubchem";
export { mergePubChemCandidatesForComponents } from "./utils/structure-lookup-pubchem";

export {
  rankAtlasAutosuggestHits,
  autosuggestMatchTypeLabel,
  isExactNameMatch,
} from "./utils/search-result-ranking";

export {
  buildRegistryDepictionFromSmiles,
  REGISTRY_THUMBNAIL_SIZE,
} from "./utils/registry-depiction";

export {
  applyCompoundKindSuggestionIfDefault,
  formatFormulaForCompoundKind,
} from "./utils/compound-kind-suggestion";
