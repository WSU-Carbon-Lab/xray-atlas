import type { SpectrumYChannelId } from "~/components/plots/spectrum-y-channel-types";
import type { StxmIngestionPlotChannel } from "./stxm-ingestion-display";

const STXM_TO_SPECTRUM_Y_CHANNEL: Record<
  StxmIngestionPlotChannel,
  SpectrumYChannelId
> = {
  signal_i0: "i0",
  signal_it: "it",
  signal_ie: "ie",
  od: "od",
  od_normalized: "norm-od",
  mass_absorption: "mass-abs",
  beta: "beta",
  f2: "f2",
  "im-epsilon": "im-epsilon",
  "im-chi": "im-chi",
  delta: "delta",
  f1: "f1",
  "re-epsilon": "re-epsilon",
  "re-chi": "re-chi",
  bare_atom: "bare-atom",
};

const SPECTRUM_Y_CHANNEL_TO_STXM: Record<
  SpectrumYChannelId,
  StxmIngestionPlotChannel
> = {
  i0: "signal_i0",
  it: "signal_it",
  ie: "signal_ie",
  sample: "signal_it",
  "inv-i0": "signal_i0",
  od: "od",
  "norm-od": "od_normalized",
  "mass-abs": "mass_absorption",
  beta: "beta",
  f2: "f2",
  "im-epsilon": "im-epsilon",
  "im-chi": "im-chi",
  delta: "delta",
  f1: "f1",
  "re-epsilon": "re-epsilon",
  "re-chi": "re-chi",
  "bare-atom": "bare_atom",
};

/**
 * Maps an STXM ingestion plot channel to the shared spectrum Y-channel id namespace.
 */
export function stxmChannelToSpectrumYChannel(
  channel: StxmIngestionPlotChannel,
): SpectrumYChannelId {
  return STXM_TO_SPECTRUM_Y_CHANNEL[channel];
}

/**
 * Maps a shared spectrum Y-channel id to the STXM ingestion plot channel key.
 */
export function spectrumYChannelToStxmChannel(
  channelId: SpectrumYChannelId,
): StxmIngestionPlotChannel {
  return SPECTRUM_Y_CHANNEL_TO_STXM[channelId];
}
