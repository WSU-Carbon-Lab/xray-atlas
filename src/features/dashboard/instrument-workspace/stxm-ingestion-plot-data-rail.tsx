"use client";

import { useCallback } from "react";
import { SpectrumYChannelRail } from "~/components/plots/toolbars/spectrum-y-channel-rail";
import { STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION } from "~/lib/stxm/stxm-ingestion-plot-data-rail-config";
import {
  ingestionChannelUsesRawSignal,
  type StxmIngestionPlotChannel,
} from "~/lib/stxm/stxm-ingestion-display";

export type StxmIngestionPlotDataRailProps = {
  displayChannel: StxmIngestionPlotChannel;
  onDisplayChannelChange: (channel: StxmIngestionPlotChannel) => void;
  hasRawSpectra: boolean;
  hasReducedResult: boolean;
};

/**
 * STXM ingestion left vertical Y-channel rail (raw signal, spectroscopy, imaginary, real trays).
 */
export function StxmIngestionPlotDataRail({
  displayChannel,
  onDisplayChannelChange,
  hasRawSpectra,
  hasReducedResult,
}: StxmIngestionPlotDataRailProps) {
  const isChannelAvailable = useCallback(
    (id: StxmIngestionPlotChannel) => {
      if (ingestionChannelUsesRawSignal(id)) {
        return hasRawSpectra;
      }
      return hasReducedResult;
    },
    [hasRawSpectra, hasReducedResult],
  );

  return (
    <SpectrumYChannelRail
      definition={STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION}
      activeChannelId={displayChannel}
      onActiveChannelChange={onDisplayChannelChange}
      isChannelAvailable={isChannelAvailable}
      ariaLabel="STXM spectrum Y channels"
      hintPlacement="right"
    />
  );
}
