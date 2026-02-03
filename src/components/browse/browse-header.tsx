"use client";

import { useEffect, useRef } from "react";
import { SearchField } from "@heroui/react";

export interface BrowseHeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchShortcutKey?: string;
  children: React.ReactNode;
}

export function BrowseHeader({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchShortcutKey = "K",
  children,
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

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-4 py-2">
      <div className="flex min-w-[200px] flex-1 basis-0 items-center sm:max-w-[400px]">
        <SearchField
          name="browse-search"
          value={searchValue}
          onChange={onSearchChange}
          variant="secondary"
          className="w-full"
        >
          <SearchField.Group className="flex h-12 min-h-12 w-full flex-row items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 dark:border-gray-600 dark:bg-gray-800">
            <SearchField.SearchIcon className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <SearchField.Input
              ref={inputRef}
              placeholder={searchPlaceholder}
              className="min-w-0 flex-1 border-0 bg-transparent p-0 shadow-none outline-none placeholder:text-gray-500 dark:placeholder:text-gray-400"
              aria-label="Search"
              aria-keyshortcuts="Meta+K"
            />
            {searchValue ? (
              <SearchField.ClearButton className="h-6 w-6 shrink-0 rounded p-0.5 text-gray-500 dark:text-gray-400" />
            ) : (
              <div className="flex shrink-0 items-center gap-0.5 rounded border border-gray-300/60 bg-gray-100/80 px-1.5 py-0.5 font-sans text-[10px] font-medium text-gray-600 dark:border-gray-500/60 dark:bg-gray-700/80 dark:text-gray-300">
                <span aria-hidden>⌘</span>
                <span>{searchShortcutKey}</span>
              </div>
            )}
          </SearchField.Group>
        </SearchField>
      </div>
      <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
        {children}
      </div>
    </div>
  );
}

const selectClasses =
  "focus:border-accent focus:ring-accent min-w-[9rem] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100";

export { selectClasses };
