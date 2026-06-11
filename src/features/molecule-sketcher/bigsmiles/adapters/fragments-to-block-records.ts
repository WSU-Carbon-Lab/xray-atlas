import { BLOCK_LABELS } from "../constants";
import type { BigSmilesBlockRecord } from "../types";

export type FragmentLikeRecord = {
  index: number;
  smiles: string;
  cutLabels: number[];
};

/**
 * Maps polymer fragment rows to labeled block cards (A, B, C, D).
 *
 * @param fragments - Fragment records from draw-canvas block cuts or SMILES fragmentation.
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
