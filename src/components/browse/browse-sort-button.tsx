"use client";

import { type ReactNode } from "react";
import { ArrowsUpDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";

/**
 * A single entry in the sort options list.
 *
 * @template K - The string union of valid sort keys for the browse mode.
 */
export interface BrowseSortOption<K extends string> {
  key: K;
  label: string;
  icon: ReactNode;
}

/**
 * Generic sort popover button shared across all browse modes.
 *
 * Renders a `Sort` trigger button that opens a `PopoverMenu` listing all
 * `options`.  Selecting an option calls `onChange(key)` and closes the panel.
 * Hide this component (render `null`) when search is active — callers control
 * visibility from the outside.
 *
 * @template K - The string union of valid sort keys.
 * @param options - Ordered list of sort choices, each with a key, label, and icon.
 * @param value - Currently active sort key.
 * @param onChange - Called with the newly selected key; also closes the panel.
 * @param ariaLabel - Full accessible label; defaults to describing the current sort.
 * @param contentWidth - Tailwind width class for the popover panel; defaults to `"w-[min(100vw-2rem,280px)]"`.
 */
export interface BrowseSortButtonProps<K extends string> {
  options: BrowseSortOption<K>[];
  value: K;
  onChange: (key: K) => void;
  ariaLabel?: string;
  contentWidth?: string;
}

export function BrowseSortButton<K extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  contentWidth = "w-[min(100vw-2rem,280px)]",
}: BrowseSortButtonProps<K>) {
  const currentLabel = options.find((o) => o.key === value)?.label ?? "Sort";

  return (
    <PopoverMenu
      contentClassName={contentWidth}
      renderTrigger={({ triggerProps, isOpen }) => (
        <button
          {...triggerProps}
          type="button"
          aria-label={
            ariaLabel ?? `Sort results; current order is ${currentLabel}`
          }
          className="border-border bg-surface text-muted focus-visible:ring-accent hover:bg-default hover:text-foreground flex h-12 min-h-12 shrink-0 items-center gap-2 rounded-lg border px-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <ArrowsUpDownIcon
            className="h-5 w-5 shrink-0 stroke-[1.5]"
            aria-hidden
          />
          <span className="text-sm font-medium">Sort</span>
          <span className="sr-only">
            {isOpen ? "Close sort options" : "Open sort options"}
          </span>
        </button>
      )}
      renderContent={({ contentPositionClassName, contentProps, close }) => (
        <PopoverMenuContent
          {...contentProps}
          className={`${contentPositionClassName} ${contentWidth} rounded-xl py-1`}
        >
          <div className="space-y-0.5 p-1">
            {options.map((option) => {
              const isSelected = option.key === value;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    onChange(option.key);
                    close();
                  }}
                  aria-label={`Sort by ${option.label}`}
                  className={`focus-visible:ring-accent flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 ${
                    isSelected
                      ? "bg-accent-soft text-foreground ring-accent/35 ring-1"
                      : "text-muted hover:bg-default hover:text-foreground"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {option.icon}
                    <span className="truncate">{option.label}</span>
                  </span>
                  {isSelected ? (
                    <CheckIcon
                      className="text-accent h-4 w-4 shrink-0"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </PopoverMenuContent>
      )}
    />
  );
}
