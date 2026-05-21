"use client";

import { Fragment, useMemo, type Key } from "react";
import { ToggleButton, ToggleButtonGroup, Toolbar } from "@heroui/react";
import { cn } from "@heroui/styles";
import {
  PlotToolbarRichHint,
  plotToolbarAttachedShellClass,
  plotToolbarBasisToggleClass,
  plotToolbarToggleForcedSelectedClass,
} from "~/components/plots/toolbars";
import {
  channelDefinitionById,
  channelsForTray,
  computePlotDataRailTrayHighlights,
  type PlotDataRailLinkDefinition,
  type PlotDataViewRailProps,
} from "./plot-data-rail-types";

const EMPTY_HIGHLIGHTED_CHANNEL_IDS: ReadonlySet<never> = new Set();

function resolveTraySelectionChange<TChannelId extends string>(
  keys: Iterable<Key>,
  previousHighlightedIds: ReadonlySet<TChannelId>,
): TChannelId | null {
  const nextIds: string[] = [];
  for (const key of keys) {
    if (typeof key === "string") {
      nextIds.push(key);
    }
  }
  if (nextIds.length === 0) {
    return null;
  }
  if (nextIds.length === 1) {
    return nextIds[0] as TChannelId;
  }
  const previous = new Set(
    [...previousHighlightedIds].map((id) => String(id)),
  );
  const added = nextIds.find((id) => !previous.has(id));
  return (added ?? nextIds[nextIds.length - 1]) as TChannelId;
}

function PlotDataRailTrayGroup<
  TChannelId extends string,
  TTrayId extends string,
>({
  trayId,
  definition,
  highlightedChannelIds,
  trayHighlighted,
  isChannelAvailable,
  onSelectChannel,
  hintPlacement,
}: {
  trayId: TTrayId;
  definition: PlotDataViewRailProps<TChannelId, TTrayId>["definition"];
  highlightedChannelIds: ReadonlySet<TChannelId>;
  trayHighlighted: boolean;
  isChannelAvailable: (id: TChannelId) => boolean;
  onSelectChannel: (id: TChannelId) => void;
  hintPlacement: PlotDataViewRailProps<TChannelId, TTrayId>["hintPlacement"];
}) {
  const tray = definition.trays.find((t) => t.id === trayId);
  const channels = channelsForTray(definition, trayId);

  const selectedKeys = useMemo(
    () => new Set([...highlightedChannelIds].map((id) => String(id))),
    [highlightedChannelIds],
  );

  const selectionMode =
    highlightedChannelIds.size > 1 ? "multiple" : "single";

  if (!tray) {
    return null;
  }

  return (
    <Toolbar
      isAttached
      orientation="vertical"
      aria-label={tray.trayLabel}
      className={`${plotToolbarAttachedShellClass} w-fit`}
    >
      <ToggleButtonGroup
        selectionMode={selectionMode}
        orientation="vertical"
        disallowEmptySelection={trayHighlighted}
        className="w-full rounded-full"
        selectedKeys={selectedKeys}
        onSelectionChange={(keys) => {
          const next = resolveTraySelectionChange(keys, highlightedChannelIds);
          if (next != null) {
            onSelectChannel(next);
          }
        }}
      >
        {channels.map((ch, index) => {
          const available = isChannelAvailable(ch.id);
          const isHighlighted = highlightedChannelIds.has(ch.id);
          return (
            <Fragment key={ch.id}>
              {index > 0 ? <ToggleButtonGroup.Separator /> : null}
              <PlotToolbarRichHint
                title={ch.label}
                description={ch.description}
                placement={hintPlacement ?? "right"}
                whenDisabledDescription="Not available for this dataset."
                disabled={!available}
              >
                <ToggleButton
                  isIconOnly
                  aria-label={ch.label}
                  id={String(ch.id)}
                  isDisabled={!available}
                  className={cn(
                    plotToolbarBasisToggleClass,
                    isHighlighted && plotToolbarToggleForcedSelectedClass,
                  )}
                >
                  <span
                    className="font-mono text-xs font-semibold leading-none"
                    aria-hidden
                  >
                    {ch.glyph}
                  </span>
                </ToggleButton>
              </PlotToolbarRichHint>
            </Fragment>
          );
        })}
      </ToggleButtonGroup>
    </Toolbar>
  );
}

function PlotDataRailLinkControl<
  TChannelId extends string,
  TTrayId extends string,
>({
  link,
  linked,
  onLinkedChange,
  activeChannelId,
  hintPlacement,
}: {
  link: PlotDataRailLinkDefinition<TChannelId, TTrayId>;
  linked: boolean;
  onLinkedChange: (next: boolean) => void;
  activeChannelId: TChannelId;
  hintPlacement: PlotDataViewRailProps<TChannelId, TTrayId>["hintPlacement"];
}) {
  const enabled = link.isLinkEnabled(activeChannelId);
  return (
    <Toolbar
      isAttached
      orientation="vertical"
      aria-label={link.title}
      className={`${plotToolbarAttachedShellClass} w-fit`}
    >
      <PlotToolbarRichHint
        title={linked ? `Unlink: ${link.title}` : link.title}
        description={linked ? link.descriptionLinked : link.descriptionUnlinked}
        whenDisabledDescription={link.whenDisabledDescription}
        placement={hintPlacement ?? "right"}
        disabled={!enabled}
      >
        <ToggleButton
          isIconOnly
          aria-label={linked ? `Unlink ${link.title}` : link.title}
          isSelected={linked}
          isDisabled={!enabled}
          className={plotToolbarBasisToggleClass}
          onPress={() => onLinkedChange(!linked)}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            {linked ? (
              <>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </>
            ) : (
              <>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                <path d="M8 8l8 8" strokeWidth="2.25" />
              </>
            )}
          </svg>
        </ToggleButton>
      </PlotToolbarRichHint>
    </Toolbar>
  );
}

/**
 * Reusable vertical data-view rail: one attached grey toolbar per tray with inline channel toggles
 * and accent selection highlighting (same chrome as legacy OD/μ/β/δ rails).
 */
export function PlotDataViewRail<
  TChannelId extends string,
  TTrayId extends string,
>({
  definition,
  activeChannelId,
  onActiveChannelChange,
  isChannelAvailable,
  links,
  linkState,
  onLinkStateChange,
  middleSlot,
  hintPlacement = "right",
  ariaLabel = "Data view trays",
}: PlotDataViewRailProps<TChannelId, TTrayId>) {
  const trayHighlights = useMemo(
    () =>
      computePlotDataRailTrayHighlights(
        definition,
        activeChannelId,
        links,
        linkState,
      ),
    [definition, activeChannelId, links, linkState],
  );

  const linksAfterTray = (trayId: TTrayId) =>
    (links ?? []).filter((l) => l.insertAfterTrayId === trayId);

  return (
    <div
      className="flex w-fit flex-col gap-2"
      role="group"
      aria-label={ariaLabel}
    >
      {definition.trays.map((tray, index) => (
        <Fragment key={tray.id}>
          <PlotDataRailTrayGroup
            trayId={tray.id}
            definition={definition}
            trayHighlighted={trayHighlights.highlightedTrayIds.has(tray.id)}
            highlightedChannelIds={
              trayHighlights.highlightedChannelIdsByTray.get(tray.id) ??
              (EMPTY_HIGHLIGHTED_CHANNEL_IDS as ReadonlySet<TChannelId>)
            }
            isChannelAvailable={isChannelAvailable}
            onSelectChannel={onActiveChannelChange}
            hintPlacement={hintPlacement}
          />
          {linksAfterTray(tray.id).map((link) =>
            linkState != null && onLinkStateChange != null ? (
              <PlotDataRailLinkControl
                key={link.id}
                link={link}
                linked={linkState[link.id] ?? false}
                onLinkedChange={(next) => onLinkStateChange(link.id, next)}
                activeChannelId={activeChannelId}
                hintPlacement={hintPlacement}
              />
            ) : null,
          )}
          {index === 1 && middleSlot ? middleSlot : null}
        </Fragment>
      ))}
    </div>
  );
}

export function activeChannelGlyph<
  TChannelId extends string,
  TTrayId extends string,
>(
  definition: PlotDataViewRailProps<TChannelId, TTrayId>["definition"],
  channelId: TChannelId,
): string {
  return channelDefinitionById(definition, channelId).glyph;
}
