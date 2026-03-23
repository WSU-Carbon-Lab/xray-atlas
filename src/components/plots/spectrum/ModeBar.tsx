"use client";

import { memo, useCallback } from "react";
import { Tabs } from "@heroui/react";
import {
  HandRaisedIcon,
  MagnifyingGlassIcon,
  CursorArrowRaysIcon,
  PencilIcon,
  EyeIcon,
  HomeIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import type { ChartThemeColors } from "../config";

export type CursorMode = "pan" | "zoom" | "select" | "peak" | "inspect";

const MODE_CONFIG: Record<
  CursorMode,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    tooltip: string;
  }
> = {
  pan: {
    icon: HandRaisedIcon,
    label: "Pan",
    tooltip: "Pan horizontally (drag left/right)",
  },
  zoom: {
    icon: MagnifyingGlassIcon,
    label: "Zoom",
    tooltip: "Zoom with marquee selection (Shift+drag)",
  },
  select: {
    icon: CursorArrowRaysIcon,
    label: "Select",
    tooltip: "Select region for normalization",
  },
  peak: {
    icon: PencilIcon,
    label: "Peak",
    tooltip: "Add or edit peaks (click on plot)",
  },
  inspect: {
    icon: EyeIcon,
    label: "Inspect",
    tooltip: "Inspect values (hover to see data)",
  },
};

const TOOLBAR_MODES: CursorMode[] = ["zoom", "pan", "inspect"];

type ModeBarProps = {
  currentMode: CursorMode;
  onModeChange: (mode: CursorMode) => void;
  themeColors: ChartThemeColors;
  onResetZoom?: () => void;
  onExportClick?: () => void;
  showLabels?: boolean;
  className?: string;
  disabled?: boolean;
};

export const ModeBar = memo(function ModeBar({
  currentMode,
  onModeChange,
  themeColors,
  onResetZoom,
  onExportClick,
  showLabels = false,
  className = "",
  disabled = false,
}: ModeBarProps) {
  const handleSelectionChange = useCallback(
    (key: React.Key) => {
      if (disabled) return;
      queueMicrotask(() => {
        onModeChange(key as CursorMode);
      });
    },
    [onModeChange, disabled],
  );

  const selectedKey =
    TOOLBAR_MODES.includes(currentMode) ? currentMode : TOOLBAR_MODES[0];

  return (
    <div
      className={`flex items-center justify-center gap-2 ${className}`}
      role="toolbar"
      aria-label="Plot tools"
    >
      <Tabs
        selectedKey={selectedKey}
        onSelectionChange={handleSelectionChange}
        className="flex justify-center"
      >
        <Tabs.ListContainer>
          <Tabs.List
            aria-label="Plot interaction mode"
            className={`bg-(--surface-2) flex h-10 gap-0.5 rounded-full p-1 [&_.tabs__list]:flex [&_.tabs__list]:gap-0.5 [&_.tabs__list]:rounded-full ${
              disabled ? "opacity-40 pointer-events-none" : ""
            }`}
          >
            {TOOLBAR_MODES.map((mode) => {
              const config = MODE_CONFIG[mode];
              if (!config) return null;
              const Icon = config.icon;
              const isSelected = selectedKey === mode;
              return (
                <Tabs.Tab
                  key={mode}
                  id={mode}
                  aria-label={config.tooltip}
                  className="flex h-8 w-8 min-w-0 cursor-pointer items-center justify-center rounded-full transition-colors data-[selected=true]:bg-(--surface-3) data-[hovered=true]:data-[selected=false]:bg-(--surface-3)/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--border-focus) focus-visible:ring-offset-2"
                >
                  <span
                    className="flex items-center justify-center"
                    style={{
                      color: isSelected ? themeColors.text : themeColors.textSecondary,
                    }}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                  </span>
                  {showLabels ? config.label : null}
                </Tabs.Tab>
              );
            })}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
      {onExportClick != null && (
        <button
          type="button"
          onClick={onExportClick}
          aria-label="Export plot"
          title="Export plot"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-(--border-default) bg-(--surface-1) text-(--text-secondary) transition-colors hover:bg-(--surface-2) hover:text-(--text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--border-focus) focus-visible:ring-offset-2"
        >
          <ArrowDownTrayIcon className="h-5 w-5" aria-hidden />
        </button>
      )}
      {onResetZoom != null && (
        <button
          type="button"
          onClick={onResetZoom}
          aria-label="Reset zoom"
          title="Reset zoom"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-(--border-default) bg-(--surface-1) text-(--text-secondary) transition-colors hover:bg-(--surface-2) hover:text-(--text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--border-focus) focus-visible:ring-offset-2"
        >
          <HomeIcon className="h-5 w-5" aria-hidden />
        </button>
      )}
    </div>
  );
});
