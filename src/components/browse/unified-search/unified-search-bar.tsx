"use client";

/**
 * Unified NEXAFS search chrome with multi-select facet tokens, popularity
 * panel, grouped typeahead, and an inline periodic-table launcher.
 *
 * Designed for use as the `searchChrome` prop of `BrowseHeader`. It manages
 * its own ⌘K global focus shortcut so callers do not need to wire keyboard
 * handling separately.
 *
 * On focus with empty query: shows the popularity panel (top-N facet chips
 * per dimension from `facetCounts`).
 * On type: shows grouped typeahead results from `searchResults`.
 * Keyboard: ArrowDown/Up navigate candidates; Enter adds highlighted match;
 * Escape clears query and closes; Backspace on empty input removes last token.
 *
 * The Periodic button is a trailing segment inside the input container so
 * edges are always reachable without a second UI row.
 */

import {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  useId,
} from "react";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import type { FacetData, FacetField, FacetItem, FacetToken } from "./types";
import { PeriodicEdgeModal } from "./periodic-edge-modal";
import type { EdgeOption } from "./periodic-edge-modal";

const FIELD_LABELS: Record<FacetField, string> = {
  edge: "Edge",
  mol: "Molecule",
  instrument: "Instrument",
  contributor: "Contributor",
};

const FIELD_CHIP_CLASSES: Record<FacetField, string> = {
  edge: "bg-[color-mix(in_oklch,var(--accent)_15%,transparent)] text-accent border-[color-mix(in_oklch,var(--accent)_30%,transparent)]",
  mol: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/25",
  instrument:
    "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/25",
  contributor:
    "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/25",
};

const FIELD_PANEL_LABEL_CLASSES: Record<FacetField, string> = {
  edge: "text-accent",
  mol: "text-green-600 dark:text-green-400",
  instrument: "text-yellow-600 dark:text-yellow-400",
  contributor: "text-purple-600 dark:text-purple-400",
};

type Candidate = FacetItem & { field: FacetField };

interface PopularitySection {
  field: FacetField;
  items: FacetItem[];
}

export interface UnifiedSearchBarProps {
  /** Active tokens to render as chips in the input area. */
  tokens: FacetToken[];
  /** Current free-text query value. */
  query: string;
  /** Called when the text input value changes. */
  onQueryChange: (q: string) => void;
  /** Add a facet selection value. */
  onAdd: (field: FacetField, id: string) => void;
  /** Remove a facet selection value. */
  onRemove: (field: FacetField, id: string) => void;
  /** Remove all active tokens and clear the query. */
  onClearAll: () => void;
  /** Facet popularity data for the panel shown on empty focus. */
  facetCounts?: FacetData | null;
  /** Grouped typeahead results for the current query. */
  searchResults?: FacetData | null;
  /** Edge list for the periodic table picker. */
  edges: EdgeOption[];
  /** Currently selected edge UUIDs (forwarded to the periodic modal). */
  selectedEdgeIds: string[];
  /** Called when the periodic modal changes the edge selection. */
  onEdgesChange: (ids: string[]) => void;
  /** Input placeholder text. */
  placeholder?: string;
}

/**
 * Renders the unified multi-facet search chrome for the NEXAFS browse catalog.
 *
 * Active tokens appear as colored chips before the text cursor. The Periodic
 * button is a trailing segment inside the bar separated by a visual divider.
 * The dropdown opens automatically on focus and switches between popularity
 * panel and typeahead depending on query content. Keyboard interactions follow
 * standard combobox accessibility patterns (aria-expanded, aria-activedescendant,
 * role=listbox). A ⌘K global handler focuses the input from anywhere on the page.
 *
 * @param tokens - Active facet tokens rendered as dismissible chips.
 * @param query - Free-text query string.
 * @param onQueryChange - Callback for text input changes.
 * @param onAdd - Add a facet id.
 * @param onRemove - Remove a facet id.
 * @param onClearAll - Clear all tokens and query.
 * @param facetCounts - Popularity panel data shown on empty focus.
 * @param searchResults - Typeahead data for the current query.
 * @param edges - All edges available for the periodic modal.
 * @param selectedEdgeIds - Currently selected edge UUIDs.
 * @param onEdgesChange - Called when periodic modal changes the edge set.
 * @param placeholder - Input placeholder; defaults to `"Search catalog..."`.
 */
export function UnifiedSearchBar({
  tokens,
  query,
  onQueryChange,
  onAdd,
  onRemove,
  onClearAll,
  facetCounts,
  searchResults,
  edges,
  selectedEdgeIds,
  onEdgesChange,
  placeholder = "Search catalog...",
}: UnifiedSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [periodicOpen, setPeriodicOpen] = useState(false);

  const hasQuery = query.trim().length > 0;
  const isEmpty = tokens.length === 0 && query === "";

  const popularitySections = useMemo<PopularitySection[]>(() => {
    if (!facetCounts) return [];
    const sections: PopularitySection[] = [];
    if (facetCounts.edges.length > 0) {
      sections.push({ field: "edge", items: facetCounts.edges.slice(0, 8) });
    }
    if (facetCounts.molecules.length > 0) {
      sections.push({ field: "mol", items: facetCounts.molecules.slice(0, 6) });
    }
    if (facetCounts.instruments.length > 0) {
      sections.push({
        field: "instrument",
        items: facetCounts.instruments.slice(0, 5),
      });
    }
    if (facetCounts.contributors.length > 0) {
      sections.push({
        field: "contributor",
        items: facetCounts.contributors.slice(0, 5),
      });
    }
    return sections;
  }, [facetCounts]);

  const typeaheadCandidates = useMemo<Candidate[]>(() => {
    if (!hasQuery || !searchResults) return [];
    const fields: FacetField[] = ["edge", "mol", "instrument", "contributor"];
    return fields.flatMap((field) => {
      const list =
        field === "edge"
          ? searchResults.edges
          : field === "mol"
            ? searchResults.molecules
            : field === "instrument"
              ? searchResults.instruments
              : searchResults.contributors;
      return list.map((item) => ({ ...item, field }));
    });
  }, [hasQuery, searchResults]);

  const showDropdown =
    isOpen &&
    (hasQuery
      ? typeaheadCandidates.length > 0
      : popularitySections.length > 0);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "k" &&
        !e.altKey &&
        !e.shiftKey
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!showDropdown) return;
        const max = hasQuery ? typeaheadCandidates.length - 1 : -1;
        setHighlightedIndex((i) => Math.min(i + 1, max));
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
          onAdd(c.field, c.id);
          onQueryChange("");
          setHighlightedIndex(-1);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onQueryChange("");
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        return;
      }
      if (e.key === "Backspace" && query === "" && tokens.length > 0) {
        const last = tokens[tokens.length - 1];
        if (last) onRemove(last.field, last.id);
      }
    },
    [
      showDropdown,
      hasQuery,
      typeaheadCandidates,
      highlightedIndex,
      query,
      tokens,
      onAdd,
      onQueryChange,
      onRemove,
    ],
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={[
          "border-border bg-surface flex min-h-12 w-full flex-wrap items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-shadow",
          isOpen
            ? "ring-accent ring-2 ring-offset-0"
            : "hover:border-border/80",
        ].join(" ")}
        onClick={() => inputRef.current?.focus()}
        onFocus={() => setIsOpen(true)}
      >
        <MagnifyingGlassIcon
          className="text-muted h-4 w-4 shrink-0"
          aria-hidden
        />

        {tokens.map((token) => (
          <span
            key={`${token.field}-${token.id}`}
            className={[
              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
              FIELD_CHIP_CLASSES[token.field],
            ].join(" ")}
          >
            <span className="opacity-60">{FIELD_LABELS[token.field]}:</span>
            <span className="max-w-[10rem] truncate">{token.label}</span>
            <button
              type="button"
              aria-label={`Remove ${FIELD_LABELS[token.field]} filter: ${token.label}`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(token.field, token.id);
              }}
              className="focus-visible:ring-accent ml-0.5 rounded p-px focus:outline-none focus-visible:ring-1"
            >
              <XMarkIcon className="h-3 w-3" aria-hidden />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-label="Search catalog"
          aria-keyshortcuts="Meta+K"
          aria-activedescendant={
            highlightedIndex >= 0 && typeaheadCandidates[highlightedIndex]
              ? `candidate-${highlightedIndex}`
              : undefined
          }
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={tokens.length === 0 ? placeholder : ""}
          className="text-foreground placeholder:text-muted min-w-[120px] flex-1 bg-transparent text-sm outline-none"
        />

        {!isEmpty ? (
          <button
            type="button"
            aria-label="Clear all filters and search"
            onClick={(e) => {
              e.stopPropagation();
              onClearAll();
              onQueryChange("");
              setIsOpen(false);
            }}
            className="text-muted hover:text-foreground focus-visible:ring-accent shrink-0 rounded p-0.5 focus:outline-none focus-visible:ring-1"
          >
            <XMarkIcon className="h-4 w-4" aria-hidden />
          </button>
        ) : !isOpen ? (
          <kbd
            className="border-border bg-default text-muted flex shrink-0 items-center gap-0.5 rounded-md border px-2 py-1 font-sans text-[11px] font-medium tabular-nums shadow-sm"
            aria-hidden
          >
            <span>⌘</span>
            <span>K</span>
          </kbd>
        ) : null}

        <span
          className="border-border/60 mx-0.5 h-5 w-px shrink-0 self-center border-l"
          aria-hidden
        />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            setPeriodicOpen(true);
          }}
          aria-label="Open periodic table to select absorption edges"
          className="text-muted hover:text-foreground focus-visible:ring-accent flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium focus:outline-none focus-visible:ring-1"
        >
          <TableCellsIcon className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Periodic</span>
        </button>
      </div>

      {showDropdown ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          className="border-border bg-surface shadow-surface-2 absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(480px,60vh)] overflow-y-auto rounded-xl border shadow-lg"
        >
          {hasQuery ? (
            <div className="py-1">
              {typeaheadCandidates.map((c, i) => (
                <button
                  key={`${c.field}-${c.id}`}
                  id={`candidate-${i}`}
                  role="option"
                  aria-selected={i === highlightedIndex}
                  type="button"
                  onMouseEnter={() => setHighlightedIndex(i)}
                  onClick={() => {
                    onAdd(c.field, c.id);
                    onQueryChange("");
                    setHighlightedIndex(-1);
                    inputRef.current?.focus();
                  }}
                  className={[
                    "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                    i === highlightedIndex
                      ? "bg-accent/10"
                      : "hover:bg-default",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "shrink-0 rounded px-1.5 py-0.5 text-xs font-medium",
                      FIELD_CHIP_CLASSES[c.field],
                    ].join(" ")}
                  >
                    {FIELD_LABELS[c.field]}
                  </span>
                  <span className="text-foreground min-w-0 flex-1 truncate">
                    {c.label}
                  </span>
                  <span className="text-muted shrink-0 tabular-nums text-xs">
                    {c.count}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-2">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setPeriodicOpen(true);
                  setIsOpen(false);
                }}
                className="hover:bg-default flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
              >
                <TableCellsIcon
                  className="text-accent h-4 w-4 shrink-0"
                  aria-hidden
                />
                <span className="text-foreground font-medium">
                  Periodic table
                </span>
                <span className="text-muted text-xs">pick edges by element</span>
              </button>

              {popularitySections.map((section) => (
                <div key={section.field} className="mt-2">
                  <p
                    className={[
                      "mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide",
                      FIELD_PANEL_LABEL_CLASSES[section.field],
                    ].join(" ")}
                  >
                    {FIELD_LABELS[section.field]}
                  </p>
                  <div className="flex flex-wrap gap-1.5 px-3 pb-1">
                    {section.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onAdd(section.field, item.id);
                          inputRef.current?.focus();
                        }}
                        className={[
                          "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80",
                          FIELD_CHIP_CLASSES[section.field],
                        ].join(" ")}
                      >
                        {item.label}
                        <span className="opacity-60 tabular-nums">
                          {item.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <PeriodicEdgeModal
        isOpen={periodicOpen}
        onClose={() => setPeriodicOpen(false)}
        edges={edges}
        selectedEdgeIds={selectedEdgeIds}
        onChange={onEdgesChange}
      />
    </div>
  );
}
