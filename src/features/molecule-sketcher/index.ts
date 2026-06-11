/**
 * Molecule sketcher feature: in-app structure authoring, cached SVG depictions,
 * SMILES outputs, block-component display, and sandbox labs. Surfaces are composed
 * from `src/app` routes; contribute integration UI lands in later pipeline phases.
 */

export { MoleculeDrawCanvas } from "./components/molecule-draw-canvas";
export { MoleculeDrawLab } from "./components/molecule-draw-lab";
export { MoleculeDrawToolbar } from "./components/molecule-draw-toolbar";
export { MoleculeSketcherLab } from "./components/molecule-sketcher-lab";
export {
  BigSmilesBlockCard,
  BigSmilesComponentsStrip,
  BlockStructureDepiction,
  BIGSMILES_MOCK_PRESETS,
  BLOCK_LABELS,
  blockAccentColor,
  fragmentationResultToComponentsModel,
  fragmentsToBlockRecords,
} from "./bigsmiles";
export type {
  BigSmilesBlockRecord,
  BigSmilesComponentsModel,
  BigSmilesTopologyKind,
} from "./bigsmiles";
export { useMoleculeDrawState } from "./hooks/use-molecule-draw-state";
export type {
  MoleculeDrawState,
  BookendMarksState,
  DatabaseSnapshotResult,
  DatabaseSnapshotSuccess,
  DatabaseSnapshotFailure,
} from "./hooks/use-molecule-draw-state";
export { ColoredElementSymbol } from "./components/colored-element-symbol";
export { DatabaseBuildWorkflowHint } from "./components/database-build-workflow-hint";
export type {
  DatabaseBuildWorkflowHintProps,
  DatabaseBuildWorkflowHintVariant,
} from "./components/database-build-workflow-hint";
export type {
  DrawBondKind,
  DrawBondKindOption,
  DrawBondMark,
  DrawTool,
  AbbreviatedAlkylTailSpec,
  AlkylTailPreset,
  RingTemplatePreset,
} from "./molecule-draw-types";
export {
  ALKYL_TAIL_PRESETS,
  CAGE_TEMPLATE_PRESETS,
  DRAW_BOND_KIND_OPTIONS,
  MACROCYCLE_TEMPLATE_PRESETS,
  RING_TEMPLATE_PRESETS,
  SMALL_RING_TEMPLATE_PRESETS,
} from "./molecule-draw-types";
export {
  cageSmilesForCarbonCount,
  parseCageCarbonCountFromInput,
  SUPPORTED_CAGE_CARBON_COUNTS,
} from "./utils/cage-smiles";
export type { CageSmilesFailure, CageSmilesResult, CageSmilesSuccess } from "./utils/cage-smiles";
export { chunkCutResultToComponentsModel } from "./utils/draw-chunks-to-components-model";
export {
  buildDatabaseDepictionSvg,
  buildDrawCanvasOclDepiction,
} from "./utils/molecule-2d-ocl-depiction";
export { buildDatabasePrepSnapshotSvg } from "./utils/build-database-prep-snapshot-svg";
export type { BuildDatabasePrepSnapshotSvgParams } from "./utils/build-database-prep-snapshot-svg";
export {
  remapBookendMarksAfterMolEdit,
  remapDrawBondMarkAfterMolEdit,
} from "./utils/remap-draw-bond-marks";
export type { RemapBookendMarksInput } from "./utils/remap-draw-bond-marks";
export {
  assessMoleculeDatabasePrep,
  prepareMoleculeForDatabase,
  COMMON_HETEROATOM_SYMBOLS,
} from "./utils/molecule-graph-editing";
export type {
  MoleculeDatabasePrepAssessment,
  PrepareForDatabaseCounts,
} from "./utils/molecule-graph-editing";

export {
  FRAGMENTATION_POLICY_VERSION,
  formatBondLabel,
  fragmentMoleculeByBondIndices,
  listCandidateCutBonds,
} from "./utils/smiles-fragmentation";
export {
  snapshotConformerToFlatSvg,
  removeOccludedBondsFromMolecule,
} from "./utils/snapshot-conformer-to-flat-svg";
export type {
  ConformerSnapshotMetadata,
  SnapshotConformerToFlatSvgResult,
} from "./utils/snapshot-conformer-to-flat-svg";
export {
  buildProjectedBonds,
  computeBondVisibility,
  projectSessionAtoms,
} from "./utils/molecule-3d-projection";
