import type { ReactNode } from "react";
import type { SpectrumYAxisQuantity } from "../types";

/**
 * Declarative configuration for a plot data rail: trays group channels; each channel binds a compact
 * glyph, tooltip copy, y-axis semantics, and optional availability rules. The view rail renders
 * one collapsed row per tray with a popover channel picker.
 */
export interface PlotDataRailTrayDefinition<
  TTrayId extends string = string,
  TChannelId extends string = string,
> {
  readonly id: TTrayId;
  /** Up to two Unicode characters shown on the collapsed tray segment when no channel in this tray is active or highlighted. */
  readonly trayGlyph: string;
  readonly trayLabel: string;
  readonly trayDescription: string;
  /** Preferred channel when this tray becomes active and the current selection is unavailable or in another tray. */
  readonly defaultChannelId?: TChannelId;
}

export interface PlotDataRailChannelDefinition<
  TChannelId extends string = string,
  TTrayId extends string = string,
> {
  readonly id: TChannelId;
  readonly trayId: TTrayId;
  /** Up to two Unicode characters on tray trigger (when selected) and in the tray menu. */
  readonly glyph: string;
  readonly label: string;
  readonly description: string;
  readonly yAxisQuantity: SpectrumYAxisQuantity;
}

export interface PlotDataRailDefinition<
  TChannelId extends string = string,
  TTrayId extends string = string,
> {
  readonly trays: readonly PlotDataRailTrayDefinition<TTrayId, TChannelId>[];
  readonly channels: readonly PlotDataRailChannelDefinition<
    TChannelId,
    TTrayId
  >[];
}

export interface PlotDataRailLinkDefinition<
  TChannelId extends string = string,
  TTrayId extends string = string,
> {
  readonly id: string;
  readonly insertAfterTrayId: TTrayId;
  readonly title: string;
  readonly descriptionLinked: string;
  readonly descriptionUnlinked: string;
  readonly whenDisabledDescription: string;
  readonly isLinkEnabled: (activeChannelId: TChannelId) => boolean;
  readonly resolveCompanionId: (
    activeChannelId: TChannelId,
  ) => TChannelId | null;
}

export interface PlotDataViewRailProps<
  TChannelId extends string = string,
  TTrayId extends string = string,
> {
  readonly definition: PlotDataRailDefinition<TChannelId, TTrayId>;
  readonly activeChannelId: TChannelId;
  readonly onActiveChannelChange: (id: TChannelId) => void;
  readonly isChannelAvailable: (id: TChannelId) => boolean;
  readonly links?: readonly PlotDataRailLinkDefinition<TChannelId, TTrayId>[];
  readonly linkState?: Readonly<Record<string, boolean>>;
  readonly onLinkStateChange?: (linkId: string, linked: boolean) => void;
  readonly middleSlot?: ReactNode;
  readonly hintPlacement?: "left" | "right" | "top" | "bottom";
  readonly ariaLabel?: string;
}

export function assertGlyphLength(glyph: string, context: string): void {
  const graphemes = [...glyph];
  if (graphemes.length === 0 || graphemes.length > 2) {
    throw new RangeError(
      `${context}: glyph must be 1–2 Unicode characters, got "${glyph}"`,
    );
  }
}

export function channelsForTray<
  TChannelId extends string,
  TTrayId extends string,
>(
  definition: PlotDataRailDefinition<TChannelId, TTrayId>,
  trayId: TTrayId,
): readonly PlotDataRailChannelDefinition<TChannelId, TTrayId>[] {
  return definition.channels.filter((c) => c.trayId === trayId);
}

function linkedTrayPairForLink<
  TChannelId extends string,
  TTrayId extends string,
>(
  definition: PlotDataRailDefinition<TChannelId, TTrayId>,
  link: PlotDataRailLinkDefinition<TChannelId, TTrayId>,
): { readonly primaryTrayId: TTrayId; readonly companionTrayId: TTrayId } | null {
  const index = definition.trays.findIndex((t) => t.id === link.insertAfterTrayId);
  if (index < 0 || index + 1 >= definition.trays.length) {
    return null;
  }
  return {
    primaryTrayId: link.insertAfterTrayId,
    companionTrayId: definition.trays[index + 1]!.id,
  };
}

export interface PlotDataTrayPopoverRow<
  TChannelId extends string,
  TTrayId extends string,
> {
  readonly trayId: TTrayId;
  readonly channels: readonly PlotDataRailChannelDefinition<
    TChannelId,
    TTrayId
  >[];
}

/**
 * Tray popover channel matrix: one horizontal row for a single tray, or two rows when a link
 * is active on a tray pair (primary tray channels on top, companion tray channels below).
 */
export function channelsForTrayPopover<
  TChannelId extends string,
  TTrayId extends string,
>(
  definition: PlotDataRailDefinition<TChannelId, TTrayId>,
  trayId: TTrayId,
  links: readonly PlotDataRailLinkDefinition<TChannelId, TTrayId>[] | undefined,
  linkState: Readonly<Record<string, boolean>> | undefined,
): readonly PlotDataTrayPopoverRow<TChannelId, TTrayId>[] {
  if (links != null && linkState != null) {
    for (const link of links) {
      if (!linkState[link.id]) {
        continue;
      }
      const pair = linkedTrayPairForLink(definition, link);
      if (
        pair != null &&
        (trayId === pair.primaryTrayId || trayId === pair.companionTrayId)
      ) {
        return [
          {
            trayId: pair.primaryTrayId,
            channels: channelsForTray(definition, pair.primaryTrayId),
          },
          {
            trayId: pair.companionTrayId,
            channels: channelsForTray(definition, pair.companionTrayId),
          },
        ];
      }
    }
  }
  return [{ trayId, channels: channelsForTray(definition, trayId) }];
}

export function channelDefinitionById<
  TChannelId extends string,
  TTrayId extends string,
>(
  definition: PlotDataRailDefinition<TChannelId, TTrayId>,
  id: TChannelId,
): PlotDataRailChannelDefinition<TChannelId, TTrayId> {
  const found = definition.channels.find((c) => c.id === id);
  if (!found) {
    throw new RangeError(`Unknown plot data channel: ${id}`);
  }
  return found;
}

export function trayIdForChannel<
  TChannelId extends string,
  TTrayId extends string,
>(
  definition: PlotDataRailDefinition<TChannelId, TTrayId>,
  channelId: TChannelId,
): TTrayId {
  return channelDefinitionById(definition, channelId).trayId;
}

/**
 * Returns the active plot channel when it belongs to `trayId`; otherwise `null` (another tray owns the plot).
 */
export function activePlotChannelInTray<
  TChannelId extends string,
  TTrayId extends string,
>(
  definition: PlotDataRailDefinition<TChannelId, TTrayId>,
  trayId: TTrayId,
  activeChannelId: TChannelId,
): TChannelId | null {
  const active = channelDefinitionById(definition, activeChannelId);
  return active.trayId === trayId ? activeChannelId : null;
}

/**
 * Resolves the preferred channel when focusing a tray: tray `defaultChannelId` when available, else the first available channel in tray order.
 */
export function defaultPlotChannelForTray<
  TChannelId extends string,
  TTrayId extends string,
>(
  definition: PlotDataRailDefinition<TChannelId, TTrayId>,
  trayId: TTrayId,
  isAvailable: (id: TChannelId) => boolean,
): TChannelId | null {
  const tray = definition.trays.find((t) => t.id === trayId);
  const preferred = tray?.defaultChannelId;
  if (preferred != null && isAvailable(preferred)) {
    return preferred;
  }
  for (const ch of channelsForTray(definition, trayId)) {
    if (isAvailable(ch.id)) {
      return ch.id;
    }
  }
  return null;
}

/** Per-tray highlight state when link overlays pair channels across trays. */
export interface PlotDataRailTrayHighlightState<
  TChannelId extends string,
  TTrayId extends string,
> {
  /** Tray ids that should show active/accent chrome (active tray plus linked companion tray). */
  readonly highlightedTrayIds: ReadonlySet<TTrayId>;
  /**
   * Channel ids to show as selected within each tray (active channel plus linked companion when
   * both belong to the same tray; otherwise one id per tray across a link pair).
   */
  readonly highlightedChannelIdsByTray: ReadonlyMap<
    TTrayId,
    ReadonlySet<TChannelId>
  >;
}

function addHighlightedChannelForTray<
  TChannelId extends string,
  TTrayId extends string,
>(
  definition: PlotDataRailDefinition<TChannelId, TTrayId>,
  highlightedTrayIds: Set<TTrayId>,
  highlightedChannelIdsByTray: Map<TTrayId, Set<TChannelId>>,
  channelId: TChannelId,
): void {
  const trayId = trayIdForChannel(definition, channelId);
  highlightedTrayIds.add(trayId);
  let channelIds = highlightedChannelIdsByTray.get(trayId);
  if (channelIds == null) {
    channelIds = new Set<TChannelId>();
    highlightedChannelIdsByTray.set(trayId, channelIds);
  }
  channelIds.add(channelId);
}

/**
 * Derives which trays and channel glyphs should appear selected when link toggles pair channels
 * across trays (for example β with δ while imaginary/real link is on).
 */
export function computePlotDataRailTrayHighlights<
  TChannelId extends string,
  TTrayId extends string,
>(
  definition: PlotDataRailDefinition<TChannelId, TTrayId>,
  activeChannelId: TChannelId,
  links: readonly PlotDataRailLinkDefinition<TChannelId, TTrayId>[] | undefined,
  linkState: Readonly<Record<string, boolean>> | undefined,
): PlotDataRailTrayHighlightState<TChannelId, TTrayId> {
  const highlightedTrayIds = new Set<TTrayId>();
  const highlightedChannelIdsByTray = new Map<TTrayId, Set<TChannelId>>();

  addHighlightedChannelForTray(
    definition,
    highlightedTrayIds,
    highlightedChannelIdsByTray,
    activeChannelId,
  );

  if (links != null && linkState != null) {
    for (const link of links) {
      if (!linkState[link.id]) {
        continue;
      }
      if (!link.isLinkEnabled(activeChannelId)) {
        continue;
      }
      const companionId = link.resolveCompanionId(activeChannelId);
      if (companionId == null) {
        continue;
      }
      addHighlightedChannelForTray(
        definition,
        highlightedTrayIds,
        highlightedChannelIdsByTray,
        companionId,
      );
    }
  }

  return { highlightedTrayIds, highlightedChannelIdsByTray };
}
