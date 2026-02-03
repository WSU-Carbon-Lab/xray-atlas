"use client";

import type { Key } from "@heroui/react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { TagIcon } from "@heroicons/react/24/outline";
import { TagIcon as TagIconSolid } from "@heroicons/react/24/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { trpc } from "~/trpc/client";
import { getTagChipClass, getTagInlineStyle } from "~/lib/tag-colors";

export interface TagsDropdownProps {
  selectedTagIds: Set<string>;
  onSelectionChange: (keys: Set<string>) => void;
  triggerClassName?: string;
  ariaLabel?: string;
}

export function TagsDropdown({
  selectedTagIds,
  onSelectionChange,
  triggerClassName = "",
  ariaLabel = "Filter by tags",
}: TagsDropdownProps) {
  const { data: tags = [], isLoading } = trpc.molecules.listTags.useQuery(
    undefined,
    { staleTime: 5 * 60 * 1000 },
  );

  const selectedKeys =
    selectedTagIds.size > 0 ? selectedTagIds : new Set<Key>();
  const hasSelection = selectedTagIds.size > 0;

  const handleSelectionChange = (keys: "all" | Set<Key>) => {
    if (keys === "all") {
      onSelectionChange(new Set(tags.map((t) => t.id)));
    } else {
      onSelectionChange(new Set([...keys].map(String)));
    }
  };

  const emptyContent = isLoading ? "Loading…" : "No tags yet";

  return (
    <Dropdown closeOnSelect={false}>
      <DropdownTrigger>
        <button
          type="button"
          className={`focus-visible:ring-accent flex h-12 min-h-12 cursor-pointer items-center gap-2 rounded-lg border px-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
            hasSelection
              ? "border-accent bg-accent/10 text-accent dark:border-accent dark:bg-accent/20 dark:text-accent-light"
              : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          } ${triggerClassName}`}
          aria-label={ariaLabel}
          aria-pressed={hasSelection}
        >
          {hasSelection ? (
            <TagIconSolid className="h-5 w-5 shrink-0" aria-hidden />
          ) : (
            <TagIcon className="h-5 w-5 shrink-0 stroke-[1.5]" aria-hidden />
          )}
          <span className="text-sm font-medium">Tags</span>
          {hasSelection ? (
            <span className="bg-accent/30 text-accent dark:bg-accent/40 dark:text-accent-light ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums">
              {selectedTagIds.size}
            </span>
          ) : null}
        </button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label={ariaLabel}
        selectionMode="multiple"
        selectedKeys={selectedKeys}
        onSelectionChange={handleSelectionChange}
        disabledKeys={isLoading ? tags.map((t) => t.id) : []}
        emptyContent={emptyContent}
        hideSelectedIcon={false}
        topContent={
          hasSelection ? (
            <button
              type="button"
              onClick={() => onSelectionChange(new Set())}
              className="focus-visible:ring-accent flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs text-gray-600 transition-colors hover:bg-gray-200/80 focus:outline-none focus-visible:ring-2 dark:text-gray-400 dark:hover:bg-gray-700/80"
              aria-label="Clear all tag filters"
            >
              <XMarkIcon className="h-4 w-4 shrink-0" aria-hidden />
              Clear all filters
            </button>
          ) : null
        }
        className="max-h-[min(240px,50vh)] w-[256px] overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-100 py-0.5 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
        itemClasses={{
          base: "min-h-0 py-1 data-[selected=true]:bg-accent/15 data-[selected=true]:ring-1 data-[selected=true]:ring-accent/50 dark:data-[selected=true]:bg-accent/25 dark:data-[selected=true]:ring-accent/40",
          wrapper: "py-0.5",
          selectedIcon: "text-accent dark:text-accent-light",
        }}
      >
        {tags.map((tag) => {
          const chipClass = getTagChipClass(tag);
          const inlineStyle = getTagInlineStyle(tag);
          return (
            <DropdownItem
              key={tag.id}
              id={tag.id}
              textValue={tag.name}
              className="min-h-0 rounded-md py-0.5"
            >
              <span
                className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${chipClass}`}
                style={inlineStyle}
              >
                {tag.name}
              </span>
            </DropdownItem>
          );
        })}
      </DropdownMenu>
    </Dropdown>
  );
}
