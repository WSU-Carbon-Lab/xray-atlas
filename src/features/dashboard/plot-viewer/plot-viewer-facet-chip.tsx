"use client";

import { cn } from "@heroui/styles";
import { ChevronDownIcon } from "lucide-react";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";
import {
  PlotViewerCheckbox,
  PlotViewerCheckboxLabel,
} from "./plot-viewer-checkbox";

export type PlotViewerFacetChipProps = {
  title: string;
  items: Array<{ id: string; label: string; count?: number }>;
  selectedIds: string[];
  onToggle: (id: string) => void;
};

/**
 * Compact facet filter chip that opens a checkbox popover menu.
 */
export function PlotViewerFacetChip({
  title,
  items,
  selectedIds,
  onToggle,
}: PlotViewerFacetChipProps) {
  if (items.length === 0) {
    return null;
  }

  const selected = new Set(selectedIds);
  const selectedCount = selectedIds.length;
  const triggerLabel =
    selectedCount > 0 ? `${title} (${selectedCount})` : title;

  return (
    <PopoverMenu
      placement="bottom-start"
      contentClassName="w-[min(100vw-2rem,260px)]"
      renderTrigger={({ triggerProps, isOpen }) => (
        <button
          type="button"
          {...triggerProps}
          aria-label={`Filter by ${title}`}
          className={cn(
            "border-border bg-surface text-foreground hover:bg-default/40 focus-visible:ring-accent inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border px-2.5 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            selectedCount > 0 && "border-accent/40 bg-accent-soft text-accent",
          )}
        >
          <span className="max-w-[9rem] truncate">{triggerLabel}</span>
          <ChevronDownIcon
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform",
              isOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      )}
      renderContent={({ contentPositionClassName, contentProps }) => (
        <PopoverMenuContent
          {...contentProps}
          className={cn(contentPositionClassName, "rounded-xl py-1")}
        >
          <ul className="max-h-56 space-y-1 overflow-y-auto p-2">
            {items.map((item) => (
              <li key={item.id}>
                <PlotViewerCheckbox
                  isSelected={selected.has(item.id)}
                  onChange={() => onToggle(item.id)}
                >
                  <PlotViewerCheckboxLabel className="text-xs">
                    {item.label}
                    {typeof item.count === "number" ? (
                      <span className="text-muted ms-1 tabular-nums">
                        ({item.count})
                      </span>
                    ) : null}
                  </PlotViewerCheckboxLabel>
                </PlotViewerCheckbox>
              </li>
            ))}
          </ul>
        </PopoverMenuContent>
      )}
    />
  );
}
