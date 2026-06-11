/**
 * BigSMILES block-component display: typed models, fragment adapters, and
 * strip/card UI. Lives under molecule-sketcher for polymer block depiction.
 */

export type {
  BigSmilesBlockRecord,
  BigSmilesComponentsModel,
  BigSmilesTopologyKind,
} from "./types";

export { blockAccentColor, BLOCK_LABELS } from "./constants";
export {
  fragmentsToBlockRecords,
  type FragmentLikeRecord,
} from "./adapters/fragments-to-block-records";
export { BigSmilesBlockCard } from "./components/bigsmiles-block-card";
export { BigSmilesComponentsStrip } from "./components/bigsmiles-components-strip";
export { BlockStructureDepiction } from "./components/block-structure-depiction";
