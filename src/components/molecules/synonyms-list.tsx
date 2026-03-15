"use client";

import React, { useState } from "react";
import { TagGroup, Tag, Label, Button, EmptyState, Input } from "@heroui/react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
} from "@heroui/dropdown";
import { PlusIcon } from "@heroicons/react/24/outline";
import { X } from "lucide-react";

export const SYNONYM_CHIP_CLASS =
  "inline-flex items-center rounded-md border-0 px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-light";

interface SynonymTagGroupProps extends React.ComponentProps<typeof TagGroup> {
  synonyms: string[];
  maxSynonyms?: number;
  tagGroupProps?: React.ComponentProps<typeof TagGroup>;
}

function SynonymsPopup({
  synonyms,
  remaining,
  label,
}: {
  synonyms: string[];
  remaining: number;
  label?: string;
}) {
  const displayLabel = label ?? `+${remaining}`;
  return (
    <span className="inline-flex shrink-0" onClick={(e) => e.stopPropagation()}>
      <Dropdown>
        <DropdownTrigger>
          <button
            type="button"
            className="bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-light focus-visible:ring-accent inline-flex shrink-0 cursor-pointer items-center rounded-md border-0 px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
            aria-label={`Show all ${synonyms.length} synonyms`}
          >
            {displayLabel}
          </button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="All synonyms"
          className="max-w-[320px] min-w-[200px] rounded-lg border border-zinc-200 bg-zinc-100 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
          closeOnSelect={false}
        >
          <DropdownSection
            title="All synonyms"
            showDivider={false}
            className="max-h-[200px] overflow-y-auto overscroll-contain"
          >
            {synonyms.map((syn) => (
              <DropdownItem
                key={syn}
                textValue={syn}
                className="cursor-default text-sm text-zinc-900 dark:text-zinc-100"
                closeOnSelect={false}
              >
                {syn}
              </DropdownItem>
            ))}
          </DropdownSection>
        </DropdownMenu>
      </Dropdown>
    </span>
  );
}

interface SynonymChipsProps {
  synonyms: string[];
  maxSynonyms?: number;
  size?: "default" | "compact";
  className?: string;
  collapseOnly?: boolean;
}

export const SynonymChips = ({
  synonyms,
  maxSynonyms = 3,
  size = "default",
  className = "",
  collapseOnly = false,
}: SynonymChipsProps) => {
  if (synonyms.length === 0) return null;
  if (collapseOnly) {
    return (
      <div className={className}>
        <SynonymsPopup
          synonyms={synonyms}
          remaining={synonyms.length}
          label={`+${synonyms.length}`}
        />
      </div>
    );
  }
  const truncated = [...synonyms]
    .sort((a: string, b: string) => a.length - b.length)
    .slice(0, maxSynonyms);
  const remaining = synonyms.length - truncated.length;
  const chipClass =
    size === "compact"
      ? "bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-light inline-flex max-w-[4.5rem] min-w-0 shrink truncate rounded border-0 px-1.5 py-0.5 text-[9px] font-medium tracking-wider uppercase"
      : `${SYNONYM_CHIP_CLASS} min-w-0 max-w-[6rem] shrink truncate`;
  return (
    <div
      className={`flex min-w-0 flex-nowrap items-center gap-0.5 overflow-hidden sm:gap-1 ${className}`}
    >
      {truncated.map((syn: string) => (
        <span key={syn} className={chipClass} title={syn}>
          {syn}
        </span>
      ))}
      {remaining > 0 ? (
        <SynonymsPopup synonyms={synonyms} remaining={remaining} />
      ) : null}
    </div>
  );
};

export const SynonymChipsWithPopup = SynonymChips;

export const SynonymTagGroup = ({
  synonyms,
  maxSynonyms = 5,
  tagGroupProps,
}: SynonymTagGroupProps) => {
  if (synonyms.length === 0) return null;
  const truncatedSynonyms = [...synonyms]
    .sort((a: string, b: string) => a.length - b.length)
    .slice(0, maxSynonyms);

  return (
    <TagGroup {...tagGroupProps}>
      <Label>Synonyms</Label>
      <TagGroup.List
        renderEmptyState={() => (
          <EmptyState className="p-1">No synonyms</EmptyState>
        )}
      >
        {truncatedSynonyms.map((synonym: string) => (
          <Tag key={synonym} id={synonym} textValue={synonym}>
            {synonym}
          </Tag>
        ))}
        {truncatedSynonyms.length < synonyms.length && (
          <Dropdown>
            <DropdownTrigger>
              <Button variant="ghost" size="sm" aria-label="Show all synonyms">
                <PlusIcon className="h-4 w-4" />
                <span>+{synonyms.length - truncatedSynonyms.length}</span>
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="All Synonyms"
              className="max-w-sm min-w-[220px]"
              closeOnSelect={false}
            >
              <DropdownSection
                title="All Synonyms"
                showDivider={false}
                className="px-2"
              >
                <div className="mt-2 flex flex-wrap gap-1">
                  {synonyms.map((synonym) => (
                    <Tag key={synonym} id={synonym} textValue={synonym}>
                      {synonym}
                    </Tag>
                  ))}
                </div>
              </DropdownSection>
            </DropdownMenu>
          </Dropdown>
        )}
      </TagGroup.List>
    </TagGroup>
  );
};

const inputClass =
  "border-border bg-field-background text-field-foreground placeholder:text-muted focus-visible:border-accent focus-visible:ring-accent-soft-hover h-11 w-full min-w-0 rounded-xl border px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0";

export interface SynonymTagGroupEditableProps extends Omit<
  React.ComponentProps<typeof TagGroup>,
  "onRemove"
> {
  synonyms: string[];
  onSynonymsChange: (synonyms: string[]) => void;
  allowRemove?: boolean;
  label?: React.ReactNode;
  addPlaceholder?: string;
  description?: React.ReactNode;
}

export function SynonymTagGroupEditable({
  synonyms,
  onSynonymsChange,
  allowRemove = false,
  label = "Synonyms",
  addPlaceholder = "Add a synonym (press Enter)…",
  description,
  className,
  ...tagGroupProps
}: SynonymTagGroupEditableProps) {
  const [newSynonym, setNewSynonym] = useState("");

  const handleRemove = (keys: Set<React.Key>) => {
    const indices = new Set(Array.from(keys).map((k) => Number(k)));
    onSynonymsChange(synonyms.filter((_, i) => !indices.has(i)));
  };

  const addSynonym = () => {
    const trimmed = newSynonym.trim();
    if (trimmed && !synonyms.includes(trimmed)) {
      onSynonymsChange([...synonyms, trimmed]);
      setNewSynonym("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSynonym();
    }
  };

  const items = synonyms.map((name, i) => ({ id: String(i), name }));

  return (
    <div className={className}>
      <TagGroup
        {...tagGroupProps}
        selectionMode="none"
        onRemove={allowRemove ? handleRemove : undefined}
      >
        {description ? (
          <div className="mb-1.5 flex items-center gap-1">
            <Label className="text-foreground text-sm font-medium">
              {label}
            </Label>
            {description}
          </div>
        ) : (
          <Label className="text-foreground mb-1.5 text-sm font-medium">
            {label}
          </Label>
        )}
        <TagGroup.List
          items={items}
          className="mb-2 flex flex-wrap gap-1.5"
          renderEmptyState={() => (
            <EmptyState className="p-1">No synonyms</EmptyState>
          )}
        >
          {(item) => (
            <Tag
              key={item.id}
              id={item.id}
              textValue={item.name}
              className={`${SYNONYM_CHIP_CLASS} gap-1`}
            >
              <span className="min-w-0 truncate">{item.name}</span>
              {allowRemove && (
                <Tag.RemoveButton
                  className="text-muted hover:text-foreground focus-visible:ring-accent ml-1 rounded-md bg-surface-secondary p-0.5 transition-colors hover:bg-surface-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                  aria-label={`Remove ${item.name}`}
                >
                  <X className="h-3 w-3" aria-hidden />
                </Tag.RemoveButton>
              )}
            </Tag>
          )}
        </TagGroup.List>
      </TagGroup>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={newSynonym}
          onChange={(e) => setNewSynonym(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={addPlaceholder}
          aria-label="New synonym"
          className={inputClass}
        />
        <Button
          type="button"
          onPress={addSynonym}
          isDisabled={!newSynonym.trim()}
          className="h-11 shrink-0 rounded-xl px-4 whitespace-nowrap"
          aria-label="Add synonym"
        >
          Add
        </Button>
      </div>
    </div>
  );
}
