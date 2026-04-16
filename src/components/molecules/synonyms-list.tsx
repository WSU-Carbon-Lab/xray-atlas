"use client";

import React, { useState } from "react";
import {
  TagGroup,
  Tag,
  Label,
  Button,
  EmptyState,
  Input,
  Header,
} from "@heroui/react";
import { X } from "lucide-react";

export const SYNONYM_CHIP_CLASS =
  "inline-flex items-center rounded-md border border-rose-300/70 bg-rose-100 px-2 py-0.5 text-[10px] font-medium tracking-wider text-rose-900 uppercase dark:border-rose-500/40 dark:bg-rose-500/35 dark:text-rose-100";

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
  const popupRef = React.useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const displayLabel = label ?? `+${remaining}`;

  React.useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (popupRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={popupRef}
      className="relative inline-flex shrink-0"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label={`Show all ${synonyms.length} synonyms`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="focus-visible:ring-accent inline-flex shrink-0 cursor-pointer items-center rounded-md border border-rose-300/70 bg-rose-100 px-2 py-0.5 text-[10px] font-medium tracking-wider text-rose-900 uppercase transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:border-rose-500/40 dark:bg-rose-500/35 dark:text-rose-100"
      >
        {displayLabel}
      </button>
      {isOpen ? (
        <div className="absolute z-[650] mt-7 max-w-[320px] min-w-[200px] rounded-lg border border-zinc-200 bg-zinc-100 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          <div className="max-h-[200px] overflow-y-auto overscroll-contain p-1.5">
            <Header className="px-2 py-1 text-xs font-medium">All synonyms</Header>
            {synonyms.map((syn, i) => (
              <div
                key={`${syn}-${i}`}
                className="cursor-default rounded-md px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
              >
                {syn}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
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
      ? "inline-flex max-w-[4.5rem] min-w-0 shrink truncate rounded border border-rose-300/70 bg-rose-100 px-1.5 py-0.5 text-[9px] font-medium tracking-wider text-rose-900 uppercase dark:border-rose-500/40 dark:bg-rose-500/35 dark:text-rose-100"
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
          <SynonymsPopup
            synonyms={synonyms}
            remaining={synonyms.length - truncatedSynonyms.length}
          />
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
        <div className="flex flex-wrap items-center gap-2">
          <TagGroup.List
            items={items}
            className="flex flex-wrap gap-1.5"
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
          <div className="flex min-w-[min(100%,12rem)] flex-1 basis-56 items-center gap-2">
            <Input
              type="text"
              value={newSynonym}
              onChange={(e) => setNewSynonym(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={addPlaceholder}
              aria-label="New synonym"
              className={`${inputClass} min-w-0 flex-1`}
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
      </TagGroup>
    </div>
  );
}
