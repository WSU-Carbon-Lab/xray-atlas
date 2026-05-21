"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SpectrumPoint, SpectrumYAxisQuantity } from "../types";
import {
  channelDefinitionById,
  channelsForTray,
  type PlotDataRailDefinition,
} from "./plot-data-rail-types";

export interface UsePlotDataRailArgs<
  TChannelId extends string,
  TTrayId extends string,
> {
  readonly definition: PlotDataRailDefinition<TChannelId, TTrayId>;
  readonly isChannelAvailable: (id: TChannelId) => boolean;
  readonly buildPlotPoints: (id: TChannelId) => SpectrumPoint[];
  readonly initialChannelId?: TChannelId;
  readonly onUnavailableSelect?: (id: TChannelId, message: string) => void;
}

export interface UsePlotDataRailResult<TChannelId extends string> {
  readonly activeChannelId: TChannelId;
  readonly setActiveChannelId: (id: TChannelId) => void;
  readonly plotPoints: SpectrumPoint[];
  readonly yAxisQuantity: SpectrumYAxisQuantity;
  readonly activeChannelLabel: string;
  readonly activeChannelGlyph: string;
}

function firstAvailableInTray<
  TChannelId extends string,
  TTrayId extends string,
>(
  definition: PlotDataRailDefinition<TChannelId, TTrayId>,
  trayId: TTrayId,
  isAvailable: (id: TChannelId) => boolean,
): TChannelId | null {
  for (const ch of channelsForTray(definition, trayId)) {
    if (isAvailable(ch.id)) {
      return ch.id;
    }
  }
  return null;
}

function firstAvailableChannel<
  TChannelId extends string,
  TTrayId extends string,
>(
  definition: PlotDataRailDefinition<TChannelId, TTrayId>,
  isAvailable: (id: TChannelId) => boolean,
): TChannelId | null {
  for (const tray of definition.trays) {
    const id = firstAvailableInTray(definition, tray.id, isAvailable);
    if (id != null) {
      return id;
    }
  }
  return null;
}

/**
 * Manages active plot channel selection, availability fallbacks, plot points, and y-axis quantity
 * for a {@link PlotDataRailDefinition}.
 */
export function usePlotDataRail<
  TChannelId extends string,
  TTrayId extends string,
>({
  definition,
  isChannelAvailable,
  buildPlotPoints,
  initialChannelId,
  onUnavailableSelect,
}: UsePlotDataRailArgs<TChannelId, TTrayId>): UsePlotDataRailResult<TChannelId> {
  const fallbackId = useMemo(
    () =>
      initialChannelId != null && isChannelAvailable(initialChannelId)
        ? initialChannelId
        : (firstAvailableChannel(definition, isChannelAvailable) ??
          definition.channels[0]!.id),
    [definition, initialChannelId, isChannelAvailable],
  );

  const [activeChannelId, setActiveChannelIdState] =
    useState<TChannelId>(fallbackId);

  useEffect(() => {
    if (isChannelAvailable(activeChannelId)) {
      return;
    }
    const trayId = channelDefinitionById(definition, activeChannelId).trayId;
    const next =
      firstAvailableInTray(definition, trayId, isChannelAvailable) ??
      firstAvailableChannel(definition, isChannelAvailable);
    if (next != null && next !== activeChannelId) {
      setActiveChannelIdState(next);
    }
  }, [activeChannelId, definition, isChannelAvailable]);

  const setActiveChannelId = useCallback(
    (id: TChannelId) => {
      if (!isChannelAvailable(id)) {
        onUnavailableSelect?.(id, "This data view is not available for this dataset.");
        return;
      }
      setActiveChannelIdState(id);
    },
    [isChannelAvailable, onUnavailableSelect],
  );

  const plotPoints = useMemo(
    () => buildPlotPoints(activeChannelId),
    [activeChannelId, buildPlotPoints],
  );

  const activeDef = channelDefinitionById(definition, activeChannelId);

  return {
    activeChannelId,
    setActiveChannelId,
    plotPoints,
    yAxisQuantity: activeDef.yAxisQuantity,
    activeChannelLabel: activeDef.label,
    activeChannelGlyph: activeDef.glyph,
  };
}
