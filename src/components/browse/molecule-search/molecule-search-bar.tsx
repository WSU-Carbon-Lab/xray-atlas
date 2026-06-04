"use client";

import { useMemo, useState, useCallback } from "react";
import { CatalogSearchChrome } from "../catalog-search-chrome";
import type { CatalogSearchToken } from "../catalog-search-chrome";
import { getTagChipClass, getTagInlineStyle } from "~/lib/tag-colors";
import type {
  MoleculeFacetToken,
  MoleculeTagFacetItem,
} from "./types";
import {
  moleculeFacetFieldFromToken,
  type UseMoleculeFacetSelectionReturn,
} from "./use-molecule-facet-selection";

const FIELD_CHIP_CLASSES: Record<
  MoleculeFacetToken["field"],
  string
> = {
  tag: "bg-surface-secondary text-foreground border-border",
  hasData:
    "bg-[color-mix(in_oklch,var(--accent)_15%,transparent)] text-accent border-[color-mix(in_oklch,var(--accent)_30%,transparent)]",
  hasCas:
    "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/25",
  hasPubchem:
    "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/25",
};

const FIELD_LABELS: Record<MoleculeFacetToken["field"], string> = {
  tag: "Tag",
  hasData: "Has data",
  hasCas: "Identifier",
  hasPubchem: "Identifier",
};

const MATERIAL_TYPE_PLACEHOLDERS = [
  { id: "small-molecule", label: "Small molecule" },
  { id: "polymer", label: "Polymer" },
  { id: "oligomer", label: "Oligomer" },
  { id: "surface-adsorbate", label: "Surface adsorbate" },
] as const;

export interface MoleculeSearchBarProps {
  facet: Pick<
    UseMoleculeFacetSelectionReturn,
    | "tokens"
    | "query"
    | "setQuery"
    | "selection"
    | "addTag"
    | "removeTag"
    | "toggleTag"
    | "toggleBooleanFacet"
    | "clearAll"
  >;
  tagFacetItems: MoleculeTagFacetItem[];
  placeholder?: string;
}

export function MoleculeSearchBar({
  facet,
  tagFacetItems,
  placeholder = "Search catalog...",
}: MoleculeSearchBarProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const hasQuery = facet.query.trim().length > 0;

  const tagColorById = useMemo(
    () => new Map(tagFacetItems.map((t) => [t.id, t.color])),
    [tagFacetItems],
  );

  const filteredTags = useMemo(() => {
    const q = facet.query.trim().toLowerCase();
    const list = tagFacetItems;
    if (!q) return list.slice(0, 12);
    return list
      .filter((t) => t.label.toLowerCase().includes(q))
      .slice(0, 12);
  }, [facet.query, tagFacetItems]);

  const typeaheadCandidates = useMemo(
    () =>
      hasQuery
        ? filteredTags.map((t) => ({ kind: "tag" as const, item: t }))
        : [],
    [hasQuery, filteredTags],
  );

  const popularityTags = useMemo(
    () => tagFacetItems.slice(0, 10),
    [tagFacetItems],
  );

  const catalogTokens: CatalogSearchToken[] = useMemo(
    () =>
      facet.tokens.map((token) => {
        const tagColor = token.field === "tag" ? tagColorById.get(token.id) : null;
        const chipClassName =
          token.field === "tag"
            ? getTagChipClass({ color: tagColor ?? null })
            : FIELD_CHIP_CLASSES[token.field];
        return {
          key: `${token.field}-${token.id}`,
          fieldLabel: FIELD_LABELS[token.field],
          label: token.label,
          chipClassName,
          onRemove: () => {
            if (token.field === "tag") {
              facet.removeTag(token.id);
              return;
            }
            const boolField = moleculeFacetFieldFromToken(token.field);
            if (boolField) facet.toggleBooleanFacet(boolField);
          },
        };
      }),
    [facet, tagColorById],
  );

  const showDropdown = hasQuery
    ? typeaheadCandidates.length > 0
    : true;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!hasQuery || typeaheadCandidates.length === 0) return;
        setHighlightedIndex((i) =>
          Math.min(i + 1, typeaheadCandidates.length - 1),
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, -1));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (
          hasQuery &&
          highlightedIndex >= 0 &&
          typeaheadCandidates[highlightedIndex]
        ) {
          const c = typeaheadCandidates[highlightedIndex];
          facet.toggleTag(c.item.id);
          facet.setQuery("");
          setHighlightedIndex(-1);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        facet.setQuery("");
        setHighlightedIndex(-1);
        return;
      }
      if (e.key === "Backspace" && facet.query === "" && facet.tokens.length > 0) {
        const last = facet.tokens[facet.tokens.length - 1];
        if (!last) return;
        if (last.field === "tag") {
          facet.removeTag(last.id);
        } else {
          const boolField = moleculeFacetFieldFromToken(last.field);
          if (boolField) facet.toggleBooleanFacet(boolField);
        }
      }
    },
    [facet, hasQuery, typeaheadCandidates, highlightedIndex],
  );

  const dropdown = hasQuery ? (
    <div className="py-1">
      {typeaheadCandidates.map((c, i) => (
        <button
          key={c.item.id}
          id={`mol-candidate-${i}`}
          role="option"
          aria-selected={i === highlightedIndex}
          type="button"
          onMouseEnter={() => setHighlightedIndex(i)}
          onClick={() => {
            facet.toggleTag(c.item.id);
            facet.setQuery("");
            setHighlightedIndex(-1);
          }}
          className={[
            "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
            i === highlightedIndex ? "bg-accent/10" : "hover:bg-default",
          ].join(" ")}
        >
          <span
            className={[
              "inline-flex shrink-0 rounded-md border px-1.5 py-0.5 text-xs font-medium",
              getTagChipClass({ color: c.item.color }),
            ].join(" ")}
            style={getTagInlineStyle({ color: c.item.color })}
          >
            Tag
          </span>
          <span className="text-foreground min-w-0 flex-1 truncate">
            {c.item.label}
          </span>
          <span className="text-muted shrink-0 tabular-nums text-xs">
            {c.item.count}
          </span>
        </button>
      ))}
    </div>
  ) : (
    <div className="py-2">
      {popularityTags.length > 0 ? (
        <div className="mt-1">
          <p className="text-muted mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide">
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5 px-3 pb-2">
            {popularityTags.map((item) => {
              const selected = facet.selection.tagIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => facet.toggleTag(item.id)}
                  aria-pressed={selected}
                  className={[
                    "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80",
                    getTagChipClass({ color: item.color }),
                    selected ? "ring-accent ring-1" : "",
                  ].join(" ")}
                  style={getTagInlineStyle({ color: item.color })}
                >
                  {item.label}
                  <span className="opacity-60 tabular-nums">{item.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-2">
        <p className="text-accent mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide">
          Has data
        </p>
        <div className="flex flex-wrap gap-1.5 px-3 pb-1">
          <FacetToggleChip
            label="Has NEXAFS data"
            active={facet.selection.hasExperimentData}
            chipClassName={FIELD_CHIP_CLASSES.hasData}
            onToggle={() => facet.toggleBooleanFacet("hasData")}
          />
        </div>
      </div>

      <div className="mt-2">
        <p className="text-yellow-600 dark:text-yellow-400 mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide">
          Identifiers
        </p>
        <div className="flex flex-wrap gap-1.5 px-3 pb-1">
          <FacetToggleChip
            label="CAS number"
            active={facet.selection.hasCas}
            chipClassName={FIELD_CHIP_CLASSES.hasCas}
            onToggle={() => facet.toggleBooleanFacet("hasCas")}
          />
          <FacetToggleChip
            label="PubChem ID"
            active={facet.selection.hasPubchem}
            chipClassName={FIELD_CHIP_CLASSES.hasPubchem}
            onToggle={() => facet.toggleBooleanFacet("hasPubchem")}
          />
        </div>
      </div>

      <div className="mt-2 pb-1">
        <p className="text-muted mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide">
          Material type
        </p>
        <div className="flex flex-wrap gap-1.5 px-3">
          {MATERIAL_TYPE_PLACEHOLDERS.map((item) => (
            <span
              key={item.id}
              title="Coming soon"
              className="border-border bg-default text-muted inline-flex cursor-not-allowed items-center rounded-md border px-2 py-0.5 text-xs font-medium opacity-50"
              aria-disabled="true"
            >
              {item.label}
            </span>
          ))}
        </div>
        <p className="text-muted px-3 pt-2 text-xs">Coming soon</p>
      </div>
    </div>
  );

  return (
    <CatalogSearchChrome
      tokens={catalogTokens}
      query={facet.query}
      onQueryChange={(q) => {
        facet.setQuery(q);
        setHighlightedIndex(-1);
      }}
      onClearAll={() => {
        facet.clearAll();
        setHighlightedIndex(-1);
      }}
      placeholder={placeholder}
      ariaLabel="Search molecules catalog"
      showDropdown={showDropdown}
      dropdown={dropdown}
      onInputKeyDown={handleKeyDown}
      highlightedIndex={highlightedIndex}
      activedescendantId={
        highlightedIndex >= 0
          ? `mol-candidate-${highlightedIndex}`
          : undefined
      }
    />
  );
}

function FacetToggleChip({
  label,
  active,
  chipClassName,
  onToggle,
}: {
  label: string;
  active: boolean;
  chipClassName: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onToggle}
      aria-pressed={active}
      className={[
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80",
        chipClassName,
        active ? "ring-accent ring-1" : "",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
