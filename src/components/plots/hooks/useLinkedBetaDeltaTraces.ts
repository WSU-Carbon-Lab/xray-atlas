export type {
  OpticalLinkChannelRole as BetaDeltaLinkRole,
  OpticalLinkPlotConfig as BetaDeltaLinkPlotConfig,
  LinkedOpticalLegendRow as LinkedBetaDeltaLegendRow,
  LinkedOpticalAngleSplit as LinkedBetaDeltaAngleSplit,
} from "./useLinkedOpticalTraces";
export { resolveLinkedOpticalAngleSplit as resolveLinkedBetaDeltaAngleSplit } from "./useLinkedOpticalTraces";
export {
  buildLinkedOpticalCompanionTraces as buildLinkedBetaDeltaCompanionTraces,
  tagPrimaryTracesForOpticalLink as tagPrimaryTracesForBetaDeltaLink,
  linkedOpticalAngleColumnTitle as linkedBetaDeltaAngleColumnTitle,
  useLinkedOpticalTraces as useLinkedBetaDeltaTraces,
} from "./useLinkedOpticalTraces";
