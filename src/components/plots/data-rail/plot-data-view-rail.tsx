"use client";

import { ChevronRightIcon } from "@heroicons/react/24/outline";
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ToggleButton, ToggleButtonGroup, Toolbar } from "@heroui/react";
import { cn } from "@heroui/styles";
import {
  PlotToolbarRichHint,
  plotToolbarAttachedHorizontalPickerShellClass,
  plotToolbarAttachedToolbarVerticalClass,
  plotToolbarAttachedVerticalStackTrayPopoverClass,
  plotToolbarAttachedToggleGroupHorizontalClass,
  plotToolbarBasisSegmentClass,
  plotToolbarGlyphToggleGroupItemHorizontalClass,
  plotToolbarLinkSegmentClass,
  plotToolbarToggleForcedSelectedClass,
  type PlotToolbarBasisSegmentPosition,
} from "~/components/plots/toolbars";
import {
  activePlotChannelInTray,
  channelDefinitionById,
  channelsForTrayPopover,
  computePlotDataRailTrayHighlights,
  defaultPlotChannelForTray,
  type PlotDataRailLinkDefinition,
  type PlotDataRailDefinition,
  type PlotDataViewRailProps,
} from "./plot-data-rail-types";

/**
 * Glyph on a collapsed tray segment: the active plot channel when it belongs to this tray; when a link
 * maps the active channel's companion into this tray, that companion's glyph; otherwise the tray
 * default channel glyph (or tray fallback glyph when no default is configured).
 */
export function trayTriggerGlyph<
  TChannelId extends string,
  TTrayId extends string,
>(
  definition: PlotDataRailDefinition<TChannelId, TTrayId>,
  trayId: TTrayId,
  activeChannelId: TChannelId,
  links?: readonly PlotDataRailLinkDefinition<TChannelId, TTrayId>[],
  linkState?: Readonly<Record<string, boolean>>,
): string {
  const activeInTray = activePlotChannelInTray(
    definition,
    trayId,
    activeChannelId,
  );
  if (activeInTray != null) {
    return channelDefinitionById(definition, activeInTray).glyph;
  }

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
      const companion = channelDefinitionById(definition, companionId);
      if (companion.trayId === trayId) {
        return companion.glyph;
      }
    }
  }

  const tray = definition.trays.find((t) => t.id === trayId);
  if (tray == null) {
    throw new RangeError(`Unknown plot data tray: ${trayId}`);
  }
  if (tray.defaultChannelId != null) {
    return channelDefinitionById(definition, tray.defaultChannelId).glyph;
  }
  return tray.trayGlyph;
}

function basisSegmentPosition(
  index: number,
  count: number,
): PlotToolbarBasisSegmentPosition {
  if (count <= 1) {
    return "only";
  }
  if (index === 0) {
    return "first";
  }
  if (index === count - 1) {
    return "last";
  }
  return "middle";
}

function PlotDataRailTrayTrigger<
  TChannelId extends string,
  TTrayId extends string,
>({
  trayId,
  definition,
  activeChannelId,
  trayHighlighted,
  isChannelAvailable,
  onSelectChannel,
  hintPlacement,
  isTrayOpen,
  onTrayOpenChange,
  segmentClassName,
  links,
  linkState,
  renderPopoverTrailing,
  channelUnavailableDescription,
  multiSelectMode = false,
  traySelectedChannelIds,
  onTraySelectedChannelIdsChange,
}: {
  trayId: TTrayId;
  definition: PlotDataViewRailProps<TChannelId, TTrayId>["definition"];
  activeChannelId: TChannelId;
  trayHighlighted: boolean;
  isChannelAvailable: (id: TChannelId) => boolean;
  onSelectChannel: (id: TChannelId) => void;
  hintPlacement: PlotDataViewRailProps<TChannelId, TTrayId>["hintPlacement"];
  isTrayOpen: boolean;
  onTrayOpenChange: (open: boolean) => void;
  segmentClassName: string;
  links: PlotDataViewRailProps<TChannelId, TTrayId>["links"];
  linkState: PlotDataViewRailProps<TChannelId, TTrayId>["linkState"];
  renderPopoverTrailing?: ReactNode;
  channelUnavailableDescription?: (id: TChannelId) => string | undefined;
  multiSelectMode?: boolean;
  traySelectedChannelIds?: ReadonlySet<TChannelId>;
  onTraySelectedChannelIdsChange?: (
    ids: ReadonlySet<TChannelId>,
  ) => void;
}) {
  const tray = definition.trays.find((t) => t.id === trayId);
  const popoverRows = useMemo(
    () => channelsForTrayPopover(definition, trayId, links, linkState),
    [definition, trayId, links, linkState],
  );
  const isLinkedPopover = popoverRows.length > 1;
  const rowGlyph = trayTriggerGlyph(
    definition,
    trayId,
    activeChannelId,
    links,
    linkState,
  );

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

  const pickerSelectedKeys = useMemo(() => {
    if (multiSelectMode && traySelectedChannelIds != null) {
      return new Set([...traySelectedChannelIds].map(String));
    }
    if (isLinkedPopover) {
      const ids = new Set<string>();
      for (const channelSet of trayHighlights.highlightedChannelIdsByTray.values()) {
        for (const id of channelSet) {
          ids.add(String(id));
        }
      }
      return ids;
    }
    const activeInTray = activePlotChannelInTray(
      definition,
      trayId,
      activeChannelId,
    );
    if (activeInTray != null) {
      return new Set([String(activeInTray)]);
    }
    const fallback = defaultPlotChannelForTray(
      definition,
      trayId,
      isChannelAvailable,
    );
    return fallback != null ? new Set([String(fallback)]) : new Set<string>();
  }, [
    multiSelectMode,
    traySelectedChannelIds,
    isLinkedPopover,
    definition,
    trayId,
    activeChannelId,
    trayHighlights,
    isChannelAvailable,
  ]);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pickerContentId = useId();
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );

  const updateMenuPos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    setMenuPos({
      top: rect.top + rect.height / 2,
      left: rect.right + 4,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isTrayOpen) {
      setMenuPos(null);
      return;
    }
    updateMenuPos();
  }, [isTrayOpen, updateMenuPos]);

  useEffect(() => {
    if (!isTrayOpen) {
      return;
    }
    const onResizeOrScroll = () => {
      updateMenuPos();
    };
    window.addEventListener("resize", onResizeOrScroll);
    window.addEventListener("scroll", onResizeOrScroll, true);
    return () => {
      window.removeEventListener("resize", onResizeOrScroll);
      window.removeEventListener("scroll", onResizeOrScroll, true);
    };
  }, [isTrayOpen, updateMenuPos]);

  useEffect(() => {
    if (!isTrayOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      onTrayOpenChange(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onTrayOpenChange(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isTrayOpen, onTrayOpenChange]);

  const closePicker = useCallback(() => {
    onTrayOpenChange(false);
  }, [onTrayOpenChange]);

  const handleSelectionChange = useCallback(
    (keys: Set<string | number>) => {
      if (multiSelectMode && onTraySelectedChannelIdsChange != null) {
        const next = new Set<TChannelId>();
        for (const key of keys) {
          if (typeof key === "string") {
            next.add(key as TChannelId);
          }
        }
        if (next.size === 0) {
          return;
        }
        onTraySelectedChannelIdsChange(next);
        const last = [...keys].at(-1);
        if (typeof last === "string") {
          onSelectChannel(last as TChannelId);
        }
        return;
      }
      const next = keys.values().next().value;
      if (typeof next !== "string") {
        return;
      }
      onSelectChannel(next as TChannelId);
      closePicker();
    },
    [
      closePicker,
      multiSelectMode,
      onSelectChannel,
      onTraySelectedChannelIdsChange,
    ],
  );

  if (tray == null) {
    return null;
  }

  const pickerShellClass = isLinkedPopover
    ? cn(plotToolbarAttachedToolbarVerticalClass, "gap-0 rounded-2xl")
    : cn(
        plotToolbarAttachedHorizontalPickerShellClass,
        renderPopoverTrailing != null && "flex flex-row items-center gap-1",
      );

  const pickerPortal =
    isTrayOpen &&
    menuPos != null &&
    typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            id={pickerContentId}
            role="listbox"
            aria-label={`${tray.trayLabel} channels`}
            className="pointer-events-auto fixed z-[650] -translate-y-1/2"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <div className={pickerShellClass}>
              {popoverRows.map((row) => (
                <ToggleButtonGroup
                  key={String(row.trayId)}
                  selectionMode={multiSelectMode ? "multiple" : "single"}
                  orientation="horizontal"
                  disallowEmptySelection={pickerSelectedKeys.size > 0}
                  className={plotToolbarAttachedToggleGroupHorizontalClass}
                  selectedKeys={pickerSelectedKeys}
                  onSelectionChange={handleSelectionChange}
                >
                  {row.channels.map((ch, index) => {
                    const available = isChannelAvailable(ch.id);
                    return (
                      <Fragment key={ch.id}>
                        {index > 0 ? <ToggleButtonGroup.Separator /> : null}
                        <PlotToolbarRichHint
                          title={ch.label}
                          description={ch.description}
                          placement={hintPlacement ?? "right"}
                          whenDisabledDescription={
                            channelUnavailableDescription?.(ch.id) ??
                            "Not available for this dataset."
                          }
                          disabled={!available}
                        >
                          <ToggleButton
                            isIconOnly
                            aria-label={ch.label}
                            id={String(ch.id)}
                            isDisabled={!available}
                            className={
                              plotToolbarGlyphToggleGroupItemHorizontalClass
                            }
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
              ))}
              {renderPopoverTrailing}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative w-full shrink-0">
      <PlotToolbarRichHint
        title={tray.trayLabel}
        description={tray.trayDescription}
        placement={hintPlacement ?? "right"}
      >
        <button
          ref={triggerRef}
          type="button"
          data-selected={trayHighlighted || isTrayOpen ? true : undefined}
          aria-controls={isTrayOpen ? pickerContentId : undefined}
          aria-expanded={isTrayOpen}
          aria-haspopup="listbox"
          aria-label={`${tray.trayLabel}, ${isTrayOpen ? "close" : "open"} channel menu`}
          onClick={() => onTrayOpenChange(!isTrayOpen)}
          className={cn(
            segmentClassName,
            "relative flex w-full cursor-pointer items-center justify-center p-0",
            (trayHighlighted || isTrayOpen) &&
              plotToolbarToggleForcedSelectedClass,
          )}
        >
          <span
            className="font-mono text-xs font-semibold leading-none"
            aria-hidden
          >
            {rowGlyph}
          </span>
          <ChevronRightIcon
            className={cn(
              "pointer-events-none absolute top-1/2 right-0.5 h-2.5 w-2.5 -translate-y-1/2 opacity-60 transition-transform duration-150",
              isTrayOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </PlotToolbarRichHint>
      {pickerPortal}
    </div>
  );
}

function PlotDataRailLinkSegment<
  TChannelId extends string,
  TTrayId extends string,
>({
  link,
  linked,
  onLinkedChange,
  activeChannelId,
  hintPlacement,
  segmentPosition,
}: {
  link: PlotDataRailLinkDefinition<TChannelId, TTrayId>;
  linked: boolean;
  onLinkedChange: (next: boolean) => void;
  activeChannelId: TChannelId;
  hintPlacement: PlotDataViewRailProps<TChannelId, TTrayId>["hintPlacement"];
  segmentPosition: PlotToolbarBasisSegmentPosition;
}) {
  const enabled = link.isLinkEnabled(activeChannelId);
  return (
    <PlotToolbarRichHint
      title={linked ? `Unlink: ${link.title}` : link.title}
      description={linked ? link.descriptionLinked : link.descriptionUnlinked}
      whenDisabledDescription={link.whenDisabledDescription}
      placement={hintPlacement ?? "right"}
      disabled={!enabled}
    >
      <button
        type="button"
        data-selected={linked ? true : undefined}
        aria-label={linked ? `Unlink ${link.title}` : link.title}
        aria-pressed={linked}
        disabled={!enabled}
        onClick={() => onLinkedChange(!linked)}
        className={cn(
          plotToolbarLinkSegmentClass(segmentPosition),
          linked && plotToolbarToggleForcedSelectedClass,
        )}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3 w-3 shrink-0 stroke-[1.5]"
          fill="none"
          stroke="currentColor"
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
              <path d="M8 8l8 8" />
            </>
          )}
        </svg>
      </button>
    </PlotToolbarRichHint>
  );
}

/**
 * Reusable vertical data-view rail: one attached toolbar with tray segments (spectroscopy / imaginary / real),
 * compact chevrons, horizontal channel pickers, and an inline link strip between paired trays when configured.
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
  renderTrayPopoverTrailing,
  channelUnavailableDescription,
  multiSelectTrayIds,
  traySelectedChannelIds,
  onTraySelectedChannelIdsChange,
}: PlotDataViewRailProps<TChannelId, TTrayId>) {
  const [openTrayId, setOpenTrayId] = useState<TTrayId | null>(null);

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

  const showLinkSegments =
    linkState != null &&
    onLinkStateChange != null &&
    (links?.length ?? 0) > 0;

  type StackSegment =
    | { kind: "tray"; trayId: TTrayId }
    | {
        kind: "link";
        link: PlotDataRailLinkDefinition<TChannelId, TTrayId>;
      }
    | { kind: "middle"; node: ReactNode };

  const stackSegments = useMemo(() => {
    const segments: StackSegment[] = [];
    definition.trays.forEach((tray, index) => {
      segments.push({ kind: "tray", trayId: tray.id });
      if (showLinkSegments) {
        for (const link of links ?? []) {
          if (link.insertAfterTrayId === tray.id) {
            segments.push({ kind: "link", link });
          }
        }
      }
      if (index === 1 && middleSlot != null) {
        segments.push({ kind: "middle", node: middleSlot });
      }
    });
    return segments;
  }, [definition.trays, links, middleSlot, showLinkSegments]);

  const basisSegmentCount = useMemo(
    () =>
      stackSegments.filter((s) => s.kind === "tray" || s.kind === "link")
        .length,
    [stackSegments],
  );

  let basisSegmentIndex = 0;

  return (
    <Toolbar
      isAttached
      orientation="vertical"
      aria-label={ariaLabel}
      className={cn(
        plotToolbarAttachedToolbarVerticalClass,
        "items-center overflow-visible",
      )}
    >
      <div className={plotToolbarAttachedVerticalStackTrayPopoverClass}>
        {stackSegments.map((segment) => {
          if (segment.kind === "tray") {
            const trayId = segment.trayId;
            const segmentClassName = plotToolbarBasisSegmentClass(
              basisSegmentPosition(basisSegmentIndex++, basisSegmentCount),
            );
            const isMultiSelectTray = multiSelectTrayIds?.includes(trayId) ?? false;
            const multiSelectedForTray = traySelectedChannelIds?.[trayId];
            return (
              <PlotDataRailTrayTrigger
                key={`tray-${trayId}`}
                trayId={trayId}
                definition={definition}
                activeChannelId={activeChannelId}
                trayHighlighted={
                  trayHighlights.highlightedTrayIds.has(trayId) ||
                  (isMultiSelectTray && (multiSelectedForTray?.size ?? 0) > 0)
                }
                isChannelAvailable={isChannelAvailable}
                onSelectChannel={onActiveChannelChange}
                hintPlacement={hintPlacement}
                links={links}
                linkState={linkState}
                isTrayOpen={openTrayId === trayId}
                onTrayOpenChange={(open) => {
                  if (!open) {
                    setOpenTrayId(null);
                    return;
                  }
                  setOpenTrayId(trayId);
                  if (
                    !isMultiSelectTray &&
                    activePlotChannelInTray(
                      definition,
                      trayId,
                      activeChannelId,
                    ) == null
                  ) {
                    const next = defaultPlotChannelForTray(
                      definition,
                      trayId,
                      isChannelAvailable,
                    );
                    if (next != null) {
                      onActiveChannelChange(next);
                    }
                  }
                }}
                segmentClassName={segmentClassName}
                renderPopoverTrailing={
                  renderTrayPopoverTrailing?.(trayId, () => setOpenTrayId(null)) ??
                  null
                }
                channelUnavailableDescription={channelUnavailableDescription}
                multiSelectMode={isMultiSelectTray}
                traySelectedChannelIds={multiSelectedForTray}
                onTraySelectedChannelIdsChange={
                  isMultiSelectTray && onTraySelectedChannelIdsChange != null
                    ? (ids) => onTraySelectedChannelIdsChange(trayId, ids)
                    : undefined
                }
              />
            );
          }
          if (segment.kind === "link") {
            const { link } = segment;
            const segmentPosition = basisSegmentPosition(
              basisSegmentIndex++,
              basisSegmentCount,
            );
            return (
              <PlotDataRailLinkSegment
                key={`link-${link.id}`}
                link={link}
                linked={linkState![link.id] ?? false}
                onLinkedChange={(next) => onLinkStateChange!(link.id, next)}
                activeChannelId={activeChannelId}
                hintPlacement={hintPlacement}
                segmentPosition={segmentPosition}
              />
            );
          }
          return (
            <div key="middle-slot" className="w-full shrink-0">
              {segment.node}
            </div>
          );
        })}
      </div>
    </Toolbar>
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
