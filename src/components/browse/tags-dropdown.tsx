"use client";

import React, { useState, useCallback } from "react";
import type { Key, Selection } from "@heroui/react";
import { Dropdown, Input } from "@heroui/react";
import { TagIcon, XMarkIcon, PlusIcon } from "@heroicons/react/24/outline";
import { trpc } from "~/trpc/client";
import { getTagChipClass, getTagInlineStyle } from "~/lib/tag-colors";

export interface TagsDropdownProps {
  selectedTagIds: Set<string>;
  onSelectionChange: (keys: Set<string>) => void;
  triggerClassName?: string;
  ariaLabel?: string;
  allowCreateFromInput?: boolean;
  onCreateTag?: (name: string) => Promise<string>;
}

const searchInputClass =
  "border-border bg-surface text-foreground placeholder:text-muted rounded-lg border px-3 py-2 text-sm focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20";

export function TagsDropdown({
  selectedTagIds,
  onSelectionChange,
  triggerClassName = "",
  ariaLabel = "Filter by tags",
  allowCreateFromInput = false,
  onCreateTag,
}: TagsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const { data: tags = [], isLoading } = trpc.molecules.listTags.useQuery(
    undefined,
    { staleTime: 5 * 60 * 1000 },
  );

  const selectedKeys =
    selectedTagIds.size > 0
      ? (selectedTagIds as unknown as Set<Key>)
      : new Set<Key>();
  const hasSelection = selectedTagIds.size > 0;

  const trimmedSearch = searchInput.trim();
  const searchLower = trimmedSearch.toLowerCase();
  const filteredTags = allowCreateFromInput
    ? tags.filter((t) => t.name.toLowerCase().includes(searchLower))
    : tags;
  const exactMatch =
    trimmedSearch.length > 0 &&
    tags.some((t) => t.name.toLowerCase() === searchLower);
  const showCreateOption =
    allowCreateFromInput &&
    trimmedSearch.length > 0 &&
    !exactMatch &&
    typeof onCreateTag === "function";

  const handleCreateClick = useCallback(() => {
    if (!trimmedSearch || !onCreateTag) return;
    void onCreateTag(trimmedSearch).then((id) => {
      onSelectionChange(new Set([...selectedTagIds, id]));
      setSearchInput("");
    });
  }, [trimmedSearch, onCreateTag, onSelectionChange, selectedTagIds]);

  const handleSelectionChange = useCallback(
    (keys: Selection) => {
      if (keys === "all") {
        onSelectionChange(new Set(tags.map((t) => t.id)));
      } else {
        onSelectionChange(new Set([...keys].map(String)));
      }
    },
    [onSelectionChange, tags],
  );

  const emptyContent = isLoading ? "Loading..." : "No tags yet";

  const topContentNodes: React.ReactNode[] = [];
  if (hasSelection) {
    topContentNodes.push(
      <button
        key="clear"
        type="button"
        onClick={() => onSelectionChange(new Set())}
        className="text-muted focus-visible:ring-accent flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs transition-colors hover:bg-default focus:outline-none focus-visible:ring-2"
        aria-label="Clear all tag filters"
      >
        <XMarkIcon className="h-4 w-4 shrink-0" aria-hidden />
        Clear all filters
      </button>,
    );
  }
  if (allowCreateFromInput) {
    topContentNodes.push(
      <div
        key="search"
        className="space-y-1.5 px-2 py-1.5"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search or type new tag..."
          aria-label="Search or create tag"
          className={searchInputClass}
        />
        {showCreateOption ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCreateClick();
            }}
            className="text-accent focus-visible:ring-accent flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent/10 focus:outline-none focus-visible:ring-2"
            aria-label={`Add "${trimmedSearch}" as new tag`}
          >
            <PlusIcon className="h-4 w-4 shrink-0" aria-hidden />
            Add &quot;{trimmedSearch}&quot; as new tag
          </button>
        ) : null}
      </div>,
    );
  }

  return (
    <Dropdown isOpen={isOpen} onOpenChange={setIsOpen}>
      <Dropdown.Trigger
        aria-label={ariaLabel}
        aria-pressed={hasSelection}
        aria-expanded={isOpen}
        className={`border-border bg-surface text-foreground focus-visible:ring-accent flex h-12 min-h-12 shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 transition-colors hover:bg-default focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${hasSelection ? "border-accent/40 bg-accent-soft text-accent" : ""} ${triggerClassName}`}
      >
        <TagIcon className="h-5 w-5 shrink-0 stroke-[1.5]" aria-hidden />
        <span className="text-sm font-medium">Tags</span>
        {hasSelection ? (
          <span className="bg-accent text-accent-foreground ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums">
            {selectedTagIds.size}
          </span>
        ) : null}
      </Dropdown.Trigger>
      <Dropdown.Popover className="border-border bg-surface max-h-[min(240px,50vh)] w-[256px] overflow-hidden rounded-2xl border py-0.5 shadow-xl">
        {topContentNodes.length > 0 ? (
          <div className="border-border space-y-0.5 border-b px-0.5 py-1">
            {topContentNodes}
          </div>
        ) : null}
        <Dropdown.Menu
          aria-label={ariaLabel}
          selectionMode="multiple"
          selectedKeys={selectedKeys}
          onSelectionChange={handleSelectionChange}
          disabledKeys={
            isLoading ? new Set(tags.map((t) => t.id)) : undefined
          }
          className="max-h-[min(200px,40vh)] overflow-y-auto py-0.5 outline-none"
        >
          {filteredTags.length === 0 ? (
            <div className="text-muted px-3 py-2 text-sm">{emptyContent}</div>
          ) : (
            filteredTags.map((tag) => {
              const chipClass = getTagChipClass(tag);
              const inlineStyle = getTagInlineStyle(tag);
              return (
                <Dropdown.Item
                  key={tag.id}
                  id={tag.id}
                  textValue={tag.name}
                  className="data-[selected=true]:bg-accent-soft data-[selected=true]:ring-accent/50 dark:data-[selected=true]:bg-accent/25 min-h-0 rounded-md py-0.5 data-[selected=true]:ring-1 dark:data-[selected=true]:ring-accent/40"
                >
                  <Dropdown.ItemIndicator type="checkmark" />
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${chipClass}`}
                    style={inlineStyle}
                  >
                    {tag.name}
                  </span>
                </Dropdown.Item>
              );
            })
          )}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
