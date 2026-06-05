import type { ReferenceCurve } from "~/components/plots/types";
import { bareAtomReferenceFromMatrix } from "~/features/process-nexafs/bare-atom-representation-matrix";
import type { NexafsPlotChannelId } from "~/features/process-nexafs/nexafs-plot-channels";
import { buildBareAtomRepresentationMatrix } from "~/features/process-nexafs/bare-atom-representation-matrix";
import type { StxmIngestionPlotChannel } from "~/lib/stxm/stxm-ingestion-display";

const STXM_BARE_ATOM_CHANNEL_MAP: Partial<
  Record<StxmIngestionPlotChannel, NexafsPlotChannelId>
> = {
  mass_absorption: "mass-absorption",
  beta: "beta",
  delta: "delta",
  f1: "f1",
  chi: "im-chi",
};

/**
 * Returns whether the STXM plot channel can show a tabulated bare-atom overlay trace.
 */
export function stxmBareAtomOverlaySupportedForChannel(
  channel: StxmIngestionPlotChannel,
): boolean {
  return STXM_BARE_ATOM_CHANNEL_MAP[channel] != null;
}

/**
 * Maps an STXM ingestion channel to the NEXAFS bare-atom matrix channel key.
 */
export function stxmChannelToBareAtomMatrixChannel(
  channel: StxmIngestionPlotChannel,
): NexafsPlotChannelId | null {
  return STXM_BARE_ATOM_CHANNEL_MAP[channel] ?? null;
}

/**
 * Builds a bare-atom reference curve on the STXM energy grid when a chemical formula is available.
 */
export async function buildStxmBareAtomReferenceCurve(params: {
  chemicalFormula: string;
  energyEv: readonly number[];
  plotChannel: StxmIngestionPlotChannel;
  isDark?: boolean;
}): Promise<ReferenceCurve | null> {
  const matrixChannel = stxmChannelToBareAtomMatrixChannel(params.plotChannel);
  if (!matrixChannel || params.energyEv.length < 2) {
    return null;
  }
  const matrix = await buildBareAtomRepresentationMatrix(
    params.chemicalFormula.trim(),
    params.energyEv,
  );
  if (!matrix) {
    return null;
  }
  return bareAtomReferenceFromMatrix(
    matrix,
    matrixChannel,
    params.isDark ?? false,
  );
}
