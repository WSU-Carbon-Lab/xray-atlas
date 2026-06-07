"use client";

import { Label, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { cn } from "@heroui/styles";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDownIcon,
} from "lucide-react";
import { PlotToolbarRichHint } from "~/components/plots/toolbars";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";
import type {
  PlotViewerLegendDock,
  PlotViewerLegendPlacement,
} from "./plot-viewer-url-state";

export type PlotViewerLegendPlacementToggleProps = {
  placement: PlotViewerLegendPlacement;
  onPlacementChange: (placement: PlotViewerLegendPlacement) => void;
  disabled?: boolean;
};

export type PlotViewerLegendDockPickerProps = {
  legendDock: PlotViewerLegendDock;
  onLegendDockChange: (dock: PlotViewerLegendDock) => void;
  disabled?: boolean;
};

const DOCK_OPTIONS: readonly {
  id: PlotViewerLegendDock;
  shortLabel: string;
  description: string;
  icon: typeof ArrowUp;
}[] = [
  {
    id: "top",
    shortLabel: "Top",
    description: "Dock the legend above the plot.",
    icon: ArrowUp,
  },
  {
    id: "bottom",
    shortLabel: "Bottom",
    description: "Dock the legend below the plot.",
    icon: ArrowDown,
  },
  {
    id: "left",
    shortLabel: "Left",
    description: "Dock the legend to the left of the plot.",
    icon: ArrowLeft,
  },
  {
    id: "right",
    shortLabel: "Right",
    description: "Dock the legend to the right of the plot.",
    icon: ArrowRight,
  },
];

function plotViewerLegendDockOption(
  dock: PlotViewerLegendDock,
): (typeof DOCK_OPTIONS)[number] {
  return DOCK_OPTIONS.find((option) => option.id === dock) ?? DOCK_OPTIONS[3]!;
}

/**
 * Popover control that sets pop-out legend dock position with labeled options.
 */
export function PlotViewerLegendDockPicker({
  legendDock,
  onLegendDockChange,
  disabled = false,
}: PlotViewerLegendDockPickerProps) {
  const activeOption = plotViewerLegendDockOption(legendDock);
  const ActiveIcon = activeOption.icon;

  const dockTrigger = (
    <button
      type="button"
      disabled={disabled}
      aria-label={`Legend dock position: ${activeOption.shortLabel}`}
      className={cn(
        "border-border bg-surface text-foreground hover:bg-default/40 focus-visible:ring-accent inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        "border-accent/40 bg-accent-soft text-accent",
      )}
    >
      <ActiveIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>Dock: {activeOption.shortLabel}</span>
      <ChevronDownIcon className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
    </button>
  );

  return (
    <PlotToolbarRichHint
      title="Legend dock position"
      description="Choose which plot edge hosts the pop-out legend panel."
      whenDisabledDescription="Add traces to the plot before changing legend dock position."
      placement="bottom"
    >
      {disabled ? (
        dockTrigger
      ) : (
        <PopoverMenu
          placement="bottom-start"
          contentClassName="w-[min(100vw-2rem,11rem)]"
          renderTrigger={({ triggerProps, isOpen }) => (
            <button
              type="button"
              {...triggerProps}
              aria-label={`Legend dock position: ${activeOption.shortLabel}`}
              className={cn(
                "border-border bg-surface text-foreground hover:bg-default/40 focus-visible:ring-accent inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                "border-accent/40 bg-accent-soft text-accent",
                isOpen && "ring-accent/30 ring-2 ring-offset-1",
              )}
            >
              <ActiveIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>Dock: {activeOption.shortLabel}</span>
              <ChevronDownIcon
                className={cn(
                  "h-3 w-3 shrink-0 opacity-70 transition-transform",
                  isOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>
          )}
          renderContent={({ contentPositionClassName, contentProps, close }) => (
            <PopoverMenuContent
              {...contentProps}
              className={cn(contentPositionClassName, "rounded-xl py-1")}
            >
              <ul className="space-y-0.5 p-1" role="listbox" aria-label="Legend dock position">
                {DOCK_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isActive = option.id === legendDock;
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onClick={() => {
                          onLegendDockChange(option.id);
                          close();
                        }}
                        className={cn(
                          "hover:bg-default/40 focus-visible:ring-accent flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors focus:outline-none focus-visible:ring-2",
                          isActive && "bg-accent-soft text-accent font-medium",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span>{option.shortLabel}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </PopoverMenuContent>
          )}
        />
      )}
    </PlotToolbarRichHint>
  );
}

/**
 * Toggles trace legend between the in-plot table and a docked external panel list.
 */
export function PlotViewerLegendPlacementToggle({
  placement,
  onPlacementChange,
  disabled = false,
}: PlotViewerLegendPlacementToggleProps) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-muted text-[10px] font-medium uppercase tracking-wide">
        Legend
      </Label>
      <ToggleButtonGroup
        selectionMode="single"
        selectedKeys={[placement]}
        isDisabled={disabled}
        onSelectionChange={(keys) => {
          const key = [...keys][0];
          if (key === "inplot" || key === "panel") {
            onPlacementChange(key);
          }
        }}
        aria-label="Legend placement"
      >
        <ToggleButton id="inplot" size="sm">
          In plot
        </ToggleButton>
        <ToggleButton id="panel" size="sm">
          Pop out
        </ToggleButton>
      </ToggleButtonGroup>
    </div>
  );
}
