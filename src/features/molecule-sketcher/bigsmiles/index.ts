/**
 * BigSMILES block-component display: typed models, mock presets, SMILES
 * fragmentation adapter, and strip/card UI. Lives under molecule-sketcher;
 * excludes persistence and contribute flows until the upload pipeline lands.
 */

export type {
  BigSmilesBlockRecord,
  BigSmilesComponentsModel,
  BigSmilesTopologyKind,
} from "./types";

export { BIGSMILES_MOCK_PRESETS } from "./mock-presets";
export { blockAccentColor, BLOCK_LABELS } from "./constants";
export {
  fragmentationResultToComponentsModel,
  fragmentsToBlockRecords,
} from "./adapters/fragments-to-block-records";
export { BigSmilesBlockCard } from "./components/bigsmiles-block-card";
export { BigSmilesComponentsStrip } from "./components/bigsmiles-components-strip";
export { BlockStructureDepiction } from "./components/block-structure-depiction";
