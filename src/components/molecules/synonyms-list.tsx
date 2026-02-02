"use client";

import React from "react";
import { TagGroup, Tag, Label, Button, EmptyState } from "@heroui/react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
} from "@heroui/dropdown";
import { PlusIcon } from "@heroicons/react/24/outline";

interface SynonymTagGroupProps extends React.ComponentProps<typeof TagGroup> {
  synonyms: string[];
  maxSynonyms?: number;
  tagGroupProps?: React.ComponentProps<typeof TagGroup>;
}

function SynonymsPopup({
  synonyms,
  remaining,
}: {
  synonyms: string[];
  remaining: number;
}) {
  return (
    <span className="inline-flex shrink-0" onClick={(e) => e.stopPropagation()}>
      <Dropdown>
        <DropdownTrigger>
          <button
            type="button"
            className="bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-light focus-visible:ring-accent inline-flex shrink-0 cursor-pointer items-center rounded-md border-0 px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
            aria-label={`Show all ${synonyms.length} synonyms`}
          >
            +{remaining}
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
  className?: string;
}

export const SynonymChips = ({
  synonyms,
  maxSynonyms = 3,
  className = "",
}: SynonymChipsProps) => {
  if (synonyms.length === 0) return null;
  const truncated = [...synonyms]
    .sort((a: string, b: string) => a.length - b.length)
    .slice(0, maxSynonyms);
  const remaining = synonyms.length - truncated.length;
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {truncated.map((syn: string) => (
        <span
          key={syn}
          className="bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-light inline-flex items-center rounded-md border-0 px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase"
        >
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
