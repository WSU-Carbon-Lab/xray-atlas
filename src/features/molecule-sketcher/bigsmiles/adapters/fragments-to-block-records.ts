import type { FragmentationResult } from "~/features/molecule-sketcher/utils/smiles-fragmentation";

import { BLOCK_LABELS } from "../constants";
import type { BigSmilesBlockRecord, BigSmilesComponentsModel } from "../types";

export type FragmentLikeRecord = {
  index: number;
  smiles: string;
  cutLabels: number[];
};

/**
 * Maps fragmentation-lab fragment rows to labeled block cards (A, B, C, D).
 *
 * @param fragments - Fragment records from SMILES fragmentation output.
 * @returns Block records with orientation hints derived from cut labels.
 */
export function fragmentsToBlockRecords(
  fragments: FragmentLikeRecord[],
): BigSmilesBlockRecord[] {
  return fragments.map((fragment, position) => {
    const label = BLOCK_LABELS[position] ?? String(position + 1);
    const orientationHint =
      fragment.cutLabels.length > 0
        ? `Attachment ${fragment.cutLabels.map((l) => `:${l}`).join(", ")}`
        : null;
    return {
      label,
      fragmentSmiles: fragment.smiles,
      orientationHint,
      repeatRole: `Fragment ${fragment.index + 1}`,
      bondDescriptor: fragment.cutLabels.length > 0 ? "[<]...[>]" : null,
    };
  });
}

/**
 * Builds a BigSMILES components strip model from SMILES fragmentation output.
 *
 * @param result - Fragmentation result from `fragmentMoleculeByBondIndices`.
 * @returns Strip model with topology inferred from fragment count and a joined SMILES preview.
 */
export function fragmentationResultToComponentsModel(
  result: FragmentationResult,
): BigSmilesComponentsModel {
  const blocks = fragmentsToBlockRecords(result.fragments);
  return {
    topology: blocks.length === 1 ? "homopolymer" : "block_copolymer",
    blocks,
    rawNotationPreview: result.fragments.map((fragment) => fragment.smiles).join(" | "),
    sourceLabel: `Fragmentation (${result.policyVersion})`,
  };
}
