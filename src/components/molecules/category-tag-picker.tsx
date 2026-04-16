"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { parseColor, type Color } from "react-aria-components";
import {
  ColorArea,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPicker,
  Input,
  Label,
} from "@heroui/react";
import {
  ChevronDownIcon,
  PlusIcon,
  TagIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { trpc } from "~/trpc/client";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";
import {
  getTagChipClass,
  getTagInlineStyle,
  TAG_COLOR_PRESET_HEX,
  pickRandomTagHex,
} from "~/lib/tag-colors";

export type CategoryTagPickerTag = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
};

export type MoleculePendingTag = {
  clientKey: string;
  name: string;
  color: string;
};

function tagColorIsHex(color: string | null | undefined): boolean {
  return typeof color === "string" && /^#[0-9A-Fa-f]{6}$/.test(color.trim());
}

function PendingTagColorPicker({
  name,
  hex,
  onHexChange,
}: {
  name: string;
  hex: string;
  onHexChange: (next: string) => void;
}) {
  const safeHex = tagColorIsHex(hex) ? hex : TAG_COLOR_PRESET_HEX[0];
  const [color, setColor] = useState<Color>(() => parseColor(safeHex));

  useEffect(() => {
    setColor(parseColor(tagColorIsHex(hex) ? hex : TAG_COLOR_PRESET_HEX[0]));
  }, [hex]);

  return (
    <ColorPicker
      value={color}
      onChange={(c) => {
        setColor(c);
        let s = c.toString("hex");
        if (!s.startsWith("#")) s = `#${s}`;
        onHexChange(s.toLowerCase());
      }}
    >
      <ColorPicker.Trigger
        type="button"
        className="border-border focus-visible:ring-accent inline-flex h-7 shrink-0 items-center gap-1 rounded-md border bg-transparent p-0.5 focus:outline-none focus-visible:ring-2"
        aria-label={`Color for ${name}`}
      >
        <ColorSwatch size="sm" />
      </ColorPicker.Trigger>
      <ColorPicker.Popover className="max-w-[min(100vw-1rem,18rem)] p-2">
        <ColorArea
          aria-label="Color area"
          className="max-w-full"
          colorSpace="hsb"
          xChannel="saturation"
          yChannel="brightness"
        >
          <ColorArea.Thumb />
        </ColorArea>
        <ColorSlider
          aria-label="Hue slider"
          channel="hue"
          className="gap-1 px-1"
          colorSpace="hsb"
        >
          <Label>Hue</Label>
          <ColorSlider.Output className="text-muted" />
          <ColorSlider.Track>
            <ColorSlider.Thumb />
          </ColorSlider.Track>
        </ColorSlider>
        <ColorSwatchPicker className="justify-center px-1" size="xs">
          {TAG_COLOR_PRESET_HEX.map((preset) => (
            <ColorSwatchPicker.Item key={preset} color={preset}>
              <ColorSwatchPicker.Swatch />
            </ColorSwatchPicker.Item>
          ))}
        </ColorSwatchPicker>
      </ColorPicker.Popover>
    </ColorPicker>
  );
}

export interface CategoryTagsMultiSelectProps {
  allTags: CategoryTagPickerTag[];
  selectedTagIds: Set<string>;
  onSelectedTagIdsChange: (ids: Set<string>) => void;
  pendingTags?: MoleculePendingTag[];
  onPendingTagsChange?: (pending: MoleculePendingTag[]) => void;
  deferNewTagPersistence?: boolean;
  isLoading?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function CategoryTagsMultiSelect({
  allTags,
  selectedTagIds,
  onSelectedTagIdsChange,
  pendingTags: pendingTagsProp = [],
  onPendingTagsChange,
  deferNewTagPersistence = false,
  isLoading = false,
  className = "",
  ariaLabel = "Category tags",
}: CategoryTagsMultiSelectProps) {
  const [search, setSearch] = useState("");

  const utils = trpc.useUtils();
  const findOrCreateTag = trpc.molecules.findOrCreateTag.useMutation();

  const trimmed = search.trim();
  const qLower = trimmed.toLowerCase();

  const addPending = useCallback(
    (name: string) => {
      if (!onPendingTagsChange) return;
      const key =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      onPendingTagsChange([
        ...pendingTagsProp,
        { clientKey: key, name: name.trim(), color: pickRandomTagHex() },
      ]);
      setSearch("");
    },
    [pendingTagsProp, onPendingTagsChange],
  );

  const filteredMenuTags = useMemo(() => {
    if (!trimmed) return allTags.slice(0, 120);
    return allTags
      .filter((t) => t.name.toLowerCase().includes(qLower))
      .slice(0, 120);
  }, [allTags, trimmed, qLower]);

  const exactExisting = useMemo(
    () => allTags.find((t) => t.name.toLowerCase() === qLower),
    [allTags, qLower],
  );

  const pendingLower = new Set(
    pendingTagsProp.map((p) => p.name.trim().toLowerCase()),
  );

  const showCreate =
    trimmed.length > 0 &&
    !exactExisting &&
    !pendingLower.has(qLower) &&
    !findOrCreateTag.isPending;

  const totalCount = selectedTagIds.size + pendingTagsProp.length;

  const removeServer = (id: string) => {
    onSelectedTagIdsChange(
      new Set([...selectedTagIds].filter((x) => x !== id)),
    );
  };

  const removePending = (clientKey: string) => {
    onPendingTagsChange?.(
      pendingTagsProp.filter((p) => p.clientKey !== clientKey),
    );
  };

  const setPendingTagColor = useCallback(
    (clientKey: string, nextHex: string) => {
      const normalized = nextHex.startsWith("#")
        ? nextHex.toLowerCase()
        : `#${nextHex.toLowerCase()}`;
      if (!/^#[0-9a-f]{6}$/.test(normalized)) return;
      onPendingTagsChange?.(
        pendingTagsProp.map((p) =>
          p.clientKey === clientKey ? { ...p, color: normalized } : p,
        ),
      );
    },
    [pendingTagsProp, onPendingTagsChange],
  );

  const handleCreateOrAddExisting = useCallback(async () => {
    if (!trimmed) return;
    if (exactExisting) {
      if (!selectedTagIds.has(exactExisting.id)) {
        onSelectedTagIdsChange(
          new Set([...selectedTagIds, exactExisting.id]),
        );
      }
      setSearch("");
      return;
    }
    if (!showCreate) return;
    if (deferNewTagPersistence) {
      addPending(trimmed);
      return;
    }
    try {
      const tag = await findOrCreateTag.mutateAsync({ name: trimmed });
      void utils.molecules.listTags.invalidate();
      onSelectedTagIdsChange(new Set([...selectedTagIds, tag.id]));
      setSearch("");
    } catch {
      return;
    }
  }, [
    trimmed,
    exactExisting,
    selectedTagIds,
    showCreate,
    deferNewTagPersistence,
    findOrCreateTag,
    utils.molecules.listTags,
    onSelectedTagIdsChange,
    addPending,
  ]);

  const tagById = useMemo(
    () => new Map(allTags.map((t) => [t.id, t])),
    [allTags],
  );

  const selectedServerTags = useMemo(
    () =>
      [...selectedTagIds]
        .map((id) => tagById.get(id))
        .filter((t): t is CategoryTagPickerTag => t != null)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [selectedTagIds, tagById],
  );

  const topBlock = (
    <div
      className="border-border space-y-2 border-b px-2 py-2"
      onClick={(e) => e.stopPropagation()}
    >
      <Input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && trimmed && showCreate) {
            e.preventDefault();
            void handleCreateOrAddExisting();
          }
        }}
        placeholder="Filter tags…"
        aria-label="Filter tag list"
        className="border-border bg-field-background text-field-foreground placeholder:text-muted h-9 w-full rounded-lg border px-2 text-sm focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
      />
      {exactExisting && !selectedTagIds.has(exactExisting.id) ? (
        <button
          type="button"
          className="text-accent hover:bg-accent/10 focus-visible:ring-accent flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs focus:outline-none focus-visible:ring-2"
          onClick={() => {
            onSelectedTagIdsChange(
              new Set([...selectedTagIds, exactExisting.id]),
            );
            setSearch("");
          }}
        >
          <PlusIcon className="h-4 w-4 shrink-0" aria-hidden />
          <span>Add existing &quot;{exactExisting.name}&quot;</span>
        </button>
      ) : null}
      {showCreate ? (
        <button
          type="button"
          className="text-accent hover:bg-accent/10 focus-visible:ring-accent flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs focus:outline-none focus-visible:ring-2"
          onClick={() => void handleCreateOrAddExisting()}
        >
          <PlusIcon className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            {deferNewTagPersistence
              ? `Add new tag "${trimmed}" (saved with molecule)`
              : `Create tag "${trimmed}"`}
          </span>
        </button>
      ) : null}
    </div>
  );

  const tagStrip =
    totalCount > 0 ? (
      <div className="border-border bg-surface-2 shadow-sm flex min-h-10 min-w-0 flex-1 items-center rounded-lg border">
        <div className="scrollshadow-tags-x flex max-h-11 min-h-10 min-w-0 flex-1 flex-nowrap items-center gap-1.5 px-2 py-1">
          {selectedServerTags.map((tag) => {
            const chipClass = getTagChipClass(tag);
            const inlineStyle = getTagInlineStyle(tag);
            return (
              <span
                key={tag.id}
                className="border-border bg-surface inline-flex max-w-[11rem] shrink-0 items-center gap-1 rounded-md border py-0.5 pl-1 pr-0.5"
              >
                <span
                  className={`inline-flex min-w-0 max-w-[9rem] items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${chipClass}`}
                  style={inlineStyle}
                >
                  <span className="truncate">{tag.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => removeServer(tag.id)}
                  className="text-muted hover:text-foreground shrink-0 rounded p-0.5"
                  aria-label={`Remove ${tag.name}`}
                >
                  <XMarkIcon className="h-3 w-3" aria-hidden />
                </button>
              </span>
            );
          })}
          {pendingTagsProp.map((p) => (
            <span
              key={p.clientKey}
              className="border-border bg-surface inline-flex max-w-[11rem] shrink-0 items-center gap-1 rounded-md border border-dashed py-0.5 pl-0.5 pr-0.5"
            >
              <PendingTagColorPicker
                name={p.name}
                hex={p.color}
                onHexChange={(h) => setPendingTagColor(p.clientKey, h)}
              />
              <span className="text-foreground min-w-0 truncate text-xs font-medium">
                {p.name}
              </span>
              <button
                type="button"
                onClick={() => removePending(p.clientKey)}
                className="text-muted hover:text-foreground shrink-0 rounded p-0.5"
                aria-label={`Remove ${p.name}`}
              >
                <XMarkIcon className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div className={className}>
      <div className="flex w-full min-w-0 flex-nowrap items-stretch gap-2">
        <div className="max-w-xs shrink-0">
          <PopoverMenu
            align="start"
            contentClassName="w-[min(100vw-2rem,20rem)]"
            renderTrigger={({ triggerProps, isOpen }) => (
              <button
                {...triggerProps}
                aria-label={ariaLabel}
                className={`border-border bg-surface text-foreground focus-visible:ring-accent flex h-10 min-w-[10rem] cursor-pointer items-center gap-2 rounded-xl border px-3 text-left transition-colors hover:bg-default focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${totalCount > 0 ? "border-accent/30 bg-accent/5" : ""}`}
              >
                <TagIcon
                  className="text-muted h-5 w-5 shrink-0"
                  aria-hidden
                />
                <span
                  className="text-sm font-medium"
                  title={
                    deferNewTagPersistence
                      ? "Search and select tags. New names stay local until you upload the molecule."
                      : "Search and select tags. New names create a tag in the database when added."
                  }
                >
                  Tags
                </span>
                {totalCount > 0 ? (
                  <span className="bg-accent text-accent-foreground ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums">
                    {totalCount}
                  </span>
                ) : null}
                <ChevronDownIcon className="text-muted ml-auto h-4 w-4 shrink-0" />
                <span className="sr-only">
                  {isOpen ? "Close category tag menu" : "Open category tag menu"}
                </span>
              </button>
            )}
            renderContent={({ contentPositionClassName, contentProps }) => (
              <PopoverMenuContent
                {...contentProps}
                className={`${contentPositionClassName} max-h-[min(320px,60vh)] w-[min(100vw-2rem,20rem)] py-1`}
              >
                {topBlock ? (
                  <div className="border-border border-b px-1 py-1">{topBlock}</div>
                ) : null}
                <div
                  aria-label={ariaLabel}
                  className="max-h-[min(220px,45vh)] overflow-y-auto py-0.5"
                >
                  {filteredMenuTags.length === 0 ? (
                    <div className="text-muted min-h-0 cursor-default px-3 py-2 text-sm">
                      {isLoading ? "Loading…" : "No tags"}
                    </div>
                  ) : (
                    filteredMenuTags.map((tag) => {
                      const chipClass = getTagChipClass(tag);
                      const inlineStyle = getTagInlineStyle(tag);
                      const selected = selectedTagIds.has(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            const next = new Set(selectedTagIds);
                            if (next.has(tag.id)) {
                              next.delete(tag.id);
                            } else {
                              next.add(tag.id);
                            }
                            onSelectedTagIdsChange(next);
                          }}
                          className={`min-h-0 w-full rounded-md px-3 py-1 text-left ${
                            selected
                              ? "bg-accent/15 ring-accent/40 ring-1"
                              : "hover:bg-default"
                          }`}
                        >
                          <span className="mr-2 inline-block w-3 text-xs">
                            {selected ? "✓" : ""}
                          </span>
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${chipClass}`}
                            style={inlineStyle}
                          >
                            {tag.name}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </PopoverMenuContent>
            )}
          />
        </div>
        {tagStrip}
      </div>
    </div>
  );
}
