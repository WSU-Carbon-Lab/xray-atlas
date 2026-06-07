"use client";

import { cn } from "@heroui/styles";
import { ChevronDownIcon } from "lucide-react";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";
import {
  PlotViewerCheckbox,
  PlotViewerCheckboxLabel,
} from "./plot-viewer-checkbox";
import {
  PLOT_VIEWER_DESCRIPTOR_OPTIONS,
  plotViewerLegendColumnCount,
  type PlotViewerDescriptorField,
} from "./plot-viewer-legend";

export type PlotViewerDescriptorChipProps = {
  selectedFields: readonly PlotViewerDescriptorField[];
  onToggle: (field: PlotViewerDescriptorField) => void;
};

/**
 * Multi-select descriptor column picker for the plot-viewer legend table.
 */
export function PlotViewerDescriptorChip({
  selectedFields,
  onToggle,
}: PlotViewerDescriptorChipProps) {
  const selected = new Set(selectedFields);
  const columnCount = plotViewerLegendColumnCount(selectedFields);
  const triggerLabel =
    selectedFields.length > 0
      ? `Legend columns (${columnCount})`
      : "Legend columns";

  return (
    <PopoverMenu
      placement="bottom-end"
      contentClassName="w-[min(100vw-2rem,280px)]"
      renderTrigger={({ triggerProps, isOpen }) => (
        <button
          type="button"
          {...triggerProps}
          aria-label="Select legend descriptor columns"
          className={cn(
            "border-border bg-surface text-foreground hover:bg-default/40 focus-visible:ring-accent inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border px-2.5 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            selectedFields.length > 0 && "border-accent/40 bg-accent-soft text-accent",
          )}
        >
          <span className="max-w-[10rem] truncate">{triggerLabel}</span>
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
          <ul className="max-h-64 space-y-1 overflow-y-auto p-2">
            {PLOT_VIEWER_DESCRIPTOR_OPTIONS.map((option) => (
              <li key={option.id}>
                <PlotViewerCheckbox
                  isSelected={selected.has(option.id)}
                  onChange={() => onToggle(option.id)}
                >
                  <PlotViewerCheckboxLabel className="text-xs">
                    {option.label}
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
