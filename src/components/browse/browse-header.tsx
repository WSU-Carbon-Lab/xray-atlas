"use client";

import { useEffect, useRef } from "react";
import { ScrollShadow, SearchField } from "@heroui/react";

/**
 * Top-of-page search + filter toolbar shared across all browse modes.
 *
 * Accepts either a custom `searchChrome` node (for unified multi-facet search)
 * or the legacy built-in `SearchField` driven by `searchValue` /
 * `onSearchChange` / `searchPlaceholder`. Exactly one of these two forms must
 * be provided — the discriminated union enforces this at the type level.
 *
 * Layout: `[search | searchChrome] [filters (scrollable)] [trailing (sort, view toggle)]`
 *
 * - When `searchChrome` is provided the chrome manages its own ⌘K focus
 *   shortcut and the toolbar section becomes `shrink-0` so the chrome can
 *   expand to fill the remaining row width.
 * - When using the built-in search field, the field is constrained to
 *   `sm:max-w-md` and the toolbar is `flex-1`.
 * - `filters` renders in a horizontal `ScrollShadow` rail that scrolls on
 *   narrow viewports.
 * - `trailing` is pinned to the right end and never wraps alone.
 */

interface BrowseHeaderBase {
  filters?: React.ReactNode;
  trailing?: React.ReactNode;
}

/**
 * Variant that accepts a fully controlled search chrome component.
 *
 * The chrome (e.g. `UnifiedSearchBar`) owns text input state, ⌘K focus,
 * token chips, and dropdown. `BrowseHeader` does not register any keyboard
 * shortcut and does not render a `SearchField`.
 *
 * @param searchChrome - Custom search chrome rendered in the search slot.
 * @param filters - Filter trigger nodes rendered in the scrollable rail.
 * @param trailing - Nodes pinned at the trailing edge (sort button, view toggle).
 */
interface BrowseHeaderWithChrome extends BrowseHeaderBase {
  searchChrome: React.ReactNode;
  searchValue?: never;
  onSearchChange?: never;
  searchPlaceholder?: never;
  searchShortcutKey?: never;
}

/**
 * Variant that uses the built-in single-line search field.
 *
 * @param searchValue - Controlled search input value.
 * @param onSearchChange - Called on every keystroke with the new value.
 * @param searchPlaceholder - Placeholder text for the search input.
 * @param searchShortcutKey - Keyboard shortcut key paired with Meta/Ctrl; defaults to `"K"`.
 * @param filters - Filter trigger nodes rendered in the scrollable rail.
 * @param trailing - Nodes pinned at the trailing edge (sort button, view toggle).
 */
interface BrowseHeaderWithBuiltinSearch extends BrowseHeaderBase {
  searchChrome?: never;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchShortcutKey?: string;
}

export type BrowseHeaderProps =
  | BrowseHeaderWithChrome
  | BrowseHeaderWithBuiltinSearch;

export function BrowseHeader({
  searchChrome,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchShortcutKey = "K",
  filters,
  trailing,
}: BrowseHeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchChrome) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === searchShortcutKey.toLowerCase() &&
        !e.altKey &&
        !e.shiftKey
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchShortcutKey, searchChrome]);

  const hasToolbar =
    (filters != null && filters !== false) ||
    (trailing != null && trailing !== false);

  return (
    <div className="flex w-full flex-col gap-3 py-2 sm:flex-row sm:items-center sm:gap-4">
      {searchChrome ? (
        <div className="flex min-h-12 w-full min-w-0 flex-1 items-center">
          {searchChrome}
        </div>
      ) : (
        <div
          className={
            hasToolbar
              ? "flex min-h-12 w-full min-w-0 items-center sm:w-auto sm:max-w-md sm:shrink-0"
              : "flex min-h-12 w-full min-w-0 items-center"
          }
        >
          <SearchField
            name="browse-search"
            value={searchValue ?? ""}
            onChange={onSearchChange ?? (() => undefined)}
            variant="secondary"
            className="w-full"
          >
            <SearchField.Group className="border-border bg-surface flex h-12 min-h-12 w-full flex-row items-center gap-2 rounded-lg border px-4">
              <SearchField.SearchIcon className="text-muted h-4 w-4 shrink-0" />
              <SearchField.Input
                ref={inputRef}
                placeholder={searchPlaceholder}
                className="text-foreground placeholder:text-muted min-w-0 flex-1 border-0 bg-transparent p-0 shadow-none outline-none"
                aria-label="Search"
                aria-keyshortcuts="Meta+K"
              />
              {searchValue ? (
                <SearchField.ClearButton className="text-muted h-6 w-6 shrink-0 rounded p-0.5" />
              ) : (
                <kbd
                  className="border-border bg-default text-muted flex shrink-0 items-center gap-0.5 rounded-md border px-2 py-1 font-sans text-[11px] font-medium tabular-nums shadow-sm"
                  aria-hidden
                >
                  <span>⌘</span>
                  <span>{searchShortcutKey}</span>
                </kbd>
              )}
            </SearchField.Group>
          </SearchField>
        </div>
      )}
      {hasToolbar ? (
        <div
          className={
            searchChrome
              ? "flex min-h-12 shrink-0 items-center gap-2 sm:gap-3"
              : "flex min-h-12 w-full min-w-0 items-center gap-2 sm:min-w-0 sm:flex-1 sm:gap-3"
          }
        >
          {filters != null && filters !== false ? (
            <ScrollShadow
              orientation="horizontal"
              className="min-w-0 flex-1"
              tabIndex={0}
              aria-label="Browse filters"
            >
              <div className="flex w-max max-w-full flex-nowrap items-center gap-2 sm:gap-3">
                {filters}
              </div>
            </ScrollShadow>
          ) : null}
          {trailing != null && trailing !== false ? (
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {trailing}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
