"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@heroui/react";

/**
 * A single active filter chip rendered in the `BrowseActiveFilters` bar.
 *
 * @param id - Unique key for React list rendering; use the filter param name.
 * @param category - Short label prefix shown before the colon, e.g. `"Edge"`.
 * @param label - Active value displayed after the category, e.g. `"Carbon K"`.
 * @param onRemove - Called when the user clicks the dismiss button on this chip.
 */
export interface ActiveFilterItem {
  id: string;
  category: string;
  label: string;
  onRemove: () => void;
}

/**
 * Generic active-filter chip row shown below the browse toolbar whenever at
 * least one filter is applied.
 *
 * Renders nothing when `items` is empty.  Each chip displays
 * `"<category>: <label>"` with a dismiss button; `onClearAll` clears everything.
 *
 * @param items - Non-empty list of active filters to display as chips.
 * @param onClearAll - Removes all filters at once.
 */
export interface BrowseActiveFiltersProps {
  items: ActiveFilterItem[];
  onClearAll: () => void;
}

export function BrowseActiveFilters({
  items,
  onClearAll,
}: BrowseActiveFiltersProps) {
  if (items.length === 0) return null;

  return (
    <div
      className="border-border bg-surface flex flex-col gap-3 rounded-xl border px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      role="region"
      aria-label="Active catalog filters"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted text-xs font-semibold uppercase tracking-wide">
          Active filters
        </span>
        {items.map((item) => (
          <span
            key={item.id}
            className="border-border bg-default text-foreground inline-flex max-w-full items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium"
          >
            <span className="truncate">
              {item.category}: {item.label}
            </span>
            <button
              type="button"
              onClick={item.onRemove}
              aria-label={`Remove ${item.category} filter: ${item.label}`}
              className="focus-visible:ring-accent shrink-0 rounded p-0.5 hover:bg-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:hover:bg-white/10"
            >
              <XMarkIcon className="h-3.5 w-3.5" aria-hidden />
            </button>
          </span>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onPress={onClearAll}
        className="shrink-0"
      >
        <XMarkIcon className="h-4 w-4" aria-hidden />
        Clear all
      </Button>
    </div>
  );
}
