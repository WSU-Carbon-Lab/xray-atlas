"use client";

import { useRef, useEffect, useId, useState, type ReactNode } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

export interface CatalogSearchToken {
  key: string;
  fieldLabel: string;
  label: string;
  chipClassName: string;
  onRemove: () => void;
}

export interface CatalogSearchChromeProps {
  tokens: CatalogSearchToken[];
  query: string;
  onQueryChange: (q: string) => void;
  onClearAll: () => void;
  placeholder?: string;
  ariaLabel?: string;
  showDropdown: boolean;
  dropdown: ReactNode;
  trailing?: ReactNode;
  onFocus?: () => void;
  onBlurClose?: () => void;
  onInputKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  highlightedIndex?: number;
  listboxId?: string;
  activedescendantId?: string;
}

export function CatalogSearchChrome({
  tokens,
  query,
  onQueryChange,
  onClearAll,
  placeholder = "Search catalog...",
  ariaLabel = "Search catalog",
  showDropdown,
  dropdown,
  trailing,
  onFocus,
  onBlurClose,
  onInputKeyDown,
  highlightedIndex = -1,
  listboxId: listboxIdProp,
  activedescendantId,
}: CatalogSearchChromeProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const generatedListboxId = useId();
  const listboxId = listboxIdProp ?? generatedListboxId;

  const isEmpty = tokens.length === 0 && query === "";
  const [isOpen, setIsOpen] = useState(false);

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
        onFocus?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFocus]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        onBlurClose?.();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onBlurClose]);

  const dropdownVisible = showDropdown && isOpen;

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
        onFocus={() => {
          setIsOpen(true);
          onFocus?.();
        }}
      >
        <MagnifyingGlassIcon
          className="text-muted h-4 w-4 shrink-0"
          aria-hidden
        />

        {tokens.map((token) => (
          <span
            key={token.key}
            className={[
              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
              token.chipClassName,
            ].join(" ")}
          >
            <span className="opacity-60">{token.fieldLabel}:</span>
            <span className="max-w-[10rem] truncate">{token.label}</span>
            <button
              type="button"
              aria-label={`Remove ${token.fieldLabel} filter: ${token.label}`}
              onClick={(e) => {
                e.stopPropagation();
                token.onRemove();
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
          aria-expanded={dropdownVisible}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-label={ariaLabel}
          aria-keyshortcuts="Meta+K"
          aria-activedescendant={activedescendantId}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => {
            setIsOpen(true);
            onFocus?.();
          }}
          onKeyDown={onInputKeyDown}
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

        {trailing ? (
          <>
            <span
              className="border-border/60 mx-0.5 h-5 w-px shrink-0 self-center border-l"
              aria-hidden
            />
            {trailing}
          </>
        ) : null}
      </div>

      {dropdownVisible ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          className="border-border bg-surface shadow-surface-2 absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(480px,60vh)] overflow-y-auto rounded-xl border shadow-lg"
        >
          {dropdown}
        </div>
      ) : null}
    </div>
  );
}
