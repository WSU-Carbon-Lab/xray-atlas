/**
 * Topology of a macromolecule for component-strip layout and future BigSMILES parsing.
 */
export type BigSmilesTopologyKind =
  | "homopolymer"
  | "block_copolymer"
  | "statistical_copolymer";

/**
 * One repeat or block fragment shown as a card in the BigSMILES components strip.
 */
export type BigSmilesBlockRecord = {
  label: string;
  fragmentSmiles: string;
  orientationHint: string | null;
  repeatRole: string | null;
  bondDescriptor: string | null;
};

/**
 * View model for the sandbox BigSMILES components display.
 */
export type BigSmilesComponentsModel = {
  topology: BigSmilesTopologyKind;
  blocks: BigSmilesBlockRecord[];
  rawNotationPreview: string | null;
  sourceLabel: string;
};
