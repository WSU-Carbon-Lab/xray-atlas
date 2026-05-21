"use client";

import { useMemo } from "react";
import { PlotDataViewRail } from "~/components/plots/data-rail";
import {
  isImaginaryChannel,
  isPlotChannelAvailable,
  isRealChannel,
  LINKED_IMAGINARY_TO_REAL,
  type NexafsImaginaryChannelId,
  type NexafsPlotChannelAvailability,
  type NexafsPlotChannelId,
  type NexafsRealChannelId,
} from "~/features/process-nexafs/nexafs-plot-channels";
import {
  NEXAFS_IMAGINARY_REAL_LINK_ID,
  NEXAFS_PLOT_DATA_RAIL_DEFINITION,
} from "~/features/process-nexafs/nexafs-plot-data-rail-config";

export interface NexafsPlotDataRailProps {
  plotChannel: NexafsPlotChannelId;
  onPlotChannelChange: (channel: NexafsPlotChannelId) => void;
  availability: NexafsPlotChannelAvailability;
  linkImaginaryReal: boolean;
  onLinkImaginaryRealChange: (linked: boolean) => void;
}

/**
 * NEXAFS browse plot left-rail data views: spectroscopy, imaginary, and real trays with optional
 * real/imaginary link overlay.
 */
export function NexafsPlotDataRail({
  plotChannel,
  onPlotChannelChange,
  availability,
  linkImaginaryReal,
  onLinkImaginaryRealChange,
}: NexafsPlotDataRailProps) {
  const links = useMemo(
    () => [
      {
        id: NEXAFS_IMAGINARY_REAL_LINK_ID,
        insertAfterTrayId: "imaginary" as const,
        title: "Link real and imaginary",
        descriptionLinked:
          "Overlay the paired channel (for example δ with β) on the same plot.",
        descriptionUnlinked: "Plot only the active tray channel.",
        whenDisabledDescription:
          "Select an imaginary or real optical constant to enable linking.",
        isLinkEnabled: (id: NexafsPlotChannelId) =>
          isImaginaryChannel(id) || isRealChannel(id),
        resolveCompanionId: (id: NexafsPlotChannelId) => {
          if (isImaginaryChannel(id)) {
            return LINKED_IMAGINARY_TO_REAL[id];
          }
          if (isRealChannel(id)) {
            const entry = (
              Object.entries(LINKED_IMAGINARY_TO_REAL) as Array<
                [NexafsImaginaryChannelId, NexafsRealChannelId]
              >
            ).find(([, real]) => real === id);
            return entry?.[0] ?? null;
          }
          return null;
        },
      },
    ],
    [],
  );

  return (
    <PlotDataViewRail
      definition={NEXAFS_PLOT_DATA_RAIL_DEFINITION}
      activeChannelId={plotChannel}
      onActiveChannelChange={onPlotChannelChange}
      isChannelAvailable={(id) => isPlotChannelAvailable(id, availability)}
      links={links}
      linkState={{ [NEXAFS_IMAGINARY_REAL_LINK_ID]: linkImaginaryReal }}
      onLinkStateChange={(_id, linked) => onLinkImaginaryRealChange(linked)}
      hintPlacement="right"
      ariaLabel="NEXAFS data views"
    />
  );
}

export function resolveLinkedCompanionChannel(
  plotChannel: NexafsPlotChannelId,
  linkImaginaryReal: boolean,
): NexafsPlotChannelId | null {
  if (!linkImaginaryReal) {
    return null;
  }
  if (isImaginaryChannel(plotChannel)) {
    return LINKED_IMAGINARY_TO_REAL[plotChannel];
  }
  if (isRealChannel(plotChannel)) {
    const entry = (
      Object.entries(LINKED_IMAGINARY_TO_REAL) as Array<
        [NexafsImaginaryChannelId, NexafsRealChannelId]
      >
    ).find(([, real]) => real === plotChannel);
    return entry?.[0] ?? null;
  }
  return null;
}
