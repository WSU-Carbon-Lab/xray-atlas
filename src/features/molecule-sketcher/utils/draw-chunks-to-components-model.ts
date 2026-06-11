import { fragmentsToBlockRecords } from "../bigsmiles/adapters/fragments-to-block-records";
import type { BigSmilesComponentsModel } from "../bigsmiles/types";

import type { ChunkCutResult } from "./polymer-bookends";

/**
 * Maps draw-canvas block cuts into the BigSMILES components strip view model.
 *
 * @param result - Successful chunk cut from {@link cutChunkFragments}.
 * @returns Strip model with topology from fragment count and chained notation preview.
 */
export function chunkCutResultToComponentsModel(
  result: Extract<ChunkCutResult, { ok: true }>,
): BigSmilesComponentsModel {
  const blocks = fragmentsToBlockRecords(result.fragments);
  return {
    topology: blocks.length === 1 ? "homopolymer" : "block_copolymer",
    blocks,
    rawNotationPreview: result.chainNotation,
    sourceLabel: "Draw canvas blocks",
  };
}
