import type { StxmIngestionPlotChannel } from "./stxm-ingestion-display";
import { STXM_RAW_SPECTROSCOPY_TRAY_CHANNEL_IDS } from "./stxm-ingestion-plot-data-rail-config";
import {
  isStxmImaginaryChannel,
  isStxmRealChannel,
} from "./stxm-optical-link";

const SPECTROSCOPY_TRAY_CHANNEL_SET = new Set<StxmIngestionPlotChannel>(
  STXM_RAW_SPECTROSCOPY_TRAY_CHANNEL_IDS,
);

/**
 * Returns true when the plot channel belongs to the unified raw spectroscopy tray.
 */
export function isStxmSpectroscopyPlotChannel(
  channel: StxmIngestionPlotChannel,
): boolean {
  return SPECTROSCOPY_TRAY_CHANNEL_SET.has(channel);
}

/**
 * Normalizes spectroscopy multi-select keys to available channels; falls back to `fallback`
 * when the set would be empty.
 */
export function normalizeStxmSpectroscopyChannelSelection(
  selected: ReadonlySet<StxmIngestionPlotChannel>,
  isAvailable: (id: StxmIngestionPlotChannel) => boolean,
  fallback: StxmIngestionPlotChannel,
): ReadonlySet<StxmIngestionPlotChannel> {
  const next = new Set<StxmIngestionPlotChannel>();
  for (const id of selected) {
    if (SPECTROSCOPY_TRAY_CHANNEL_SET.has(id) && isAvailable(id)) {
      next.add(id);
    }
  }
  if (next.size === 0 && isAvailable(fallback)) {
    next.add(fallback);
  }
  return next;
}

/**
 * Resolves plot channels from the active tray channel and spectroscopy multi-select.
 * Spectroscopy tray uses `selectedSpectroscopyChannels` when non-empty; other trays use a single channel.
 */
export function resolveStxmPlotChannels(
  activeChannel: StxmIngestionPlotChannel,
  selectedSpectroscopyChannels: ReadonlySet<StxmIngestionPlotChannel>,
): readonly StxmIngestionPlotChannel[] {
  if (
    isStxmSpectroscopyPlotChannel(activeChannel) &&
    selectedSpectroscopyChannels.size > 0
  ) {
    return [...selectedSpectroscopyChannels];
  }
  return [activeChannel];
}

/**
 * Returns true when split view should be offered for the current plot channel selection.
 */
export function stxmPlotSplitAvailable(
  plotChannels: readonly StxmIngestionPlotChannel[],
  linkImaginaryReal: boolean,
  activeChannel: StxmIngestionPlotChannel,
): boolean {
  if (plotChannels.length >= 2) {
    return true;
  }
  if (!linkImaginaryReal) {
    return false;
  }
  return isStxmImaginaryChannel(activeChannel) || isStxmRealChannel(activeChannel);
}
