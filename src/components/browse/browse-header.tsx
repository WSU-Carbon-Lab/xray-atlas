"use client";

import { useEffect, useRef } from "react";
import { ScrollShadow, SearchField } from "@heroui/react";

export interface BrowseHeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchShortcutKey?: string;
  /** Filter controls; scroll horizontally when they do not fit the row. */
  children?: React.ReactNode;
  /** Controls pinned at the trailing edge (for example Sort) so they do not orphan on wrap. */
  toolbarTrailing?: React.ReactNode;
}

export function BrowseHeader({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchShortcutKey = "K",
  children,
  toolbarTrailing,
}: BrowseHeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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
  }, [searchShortcutKey]);

  const hasToolbar =
    (children != null && children !== false) ||
    (toolbarTrailing != null && toolbarTrailing !== false);

  return (
    <div className="flex w-full flex-col gap-3 py-2 sm:flex-row sm:items-center sm:gap-4">
      <div
        className={
          hasToolbar
            ? "flex min-h-12 w-full min-w-0 items-center sm:w-auto sm:max-w-md sm:shrink-0"
            : "flex min-h-12 w-full min-w-0 items-center"
        }
      >
        <SearchField
          name="browse-search"
          value={searchValue}
          onChange={onSearchChange}
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
      {hasToolbar ? (
        <div className="flex min-h-12 min-w-0 w-full items-center gap-2 sm:min-w-0 sm:flex-1 sm:gap-3">
          {children != null && children !== false ? (
            <ScrollShadow
              orientation="horizontal"
              className="min-w-0 flex-1"
              tabIndex={0}
              aria-label="Browse filters"
            >
              <div className="flex w-max max-w-full flex-nowrap items-center gap-2 sm:gap-3">
                {children}
              </div>
            </ScrollShadow>
          ) : null}
          {toolbarTrailing != null && toolbarTrailing !== false ? (
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {toolbarTrailing}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const selectClasses =
  "border-border bg-surface text-foreground focus:border-accent focus:ring-accent min-w-[9rem] rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none";

export { selectClasses };
