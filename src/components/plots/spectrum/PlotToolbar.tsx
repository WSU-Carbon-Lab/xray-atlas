"use client";

import { memo } from "react";
import {
  HandRaisedIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  CursorArrowRaysIcon,
  PencilIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { Button, Tooltip } from "@heroui/react";
import type { ChartThemeColors } from "../config";
import type { CursorMode } from "./ModeBar";

type PlotToolbarProps = {
  currentMode: CursorMode;
  onModeChange: (mode: CursorMode) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  themeColors: ChartThemeColors;
};

const MODES: { mode: CursorMode; icon: React.ComponentType<{ className?: string }>; tooltip: string }[] = [
  { mode: "select", icon: CursorArrowRaysIcon, tooltip: "Select region for normalization" },
  { mode: "peak", icon: PencilIcon, tooltip: "Add or edit peaks (click on plot)" },
  { mode: "inspect", icon: EyeIcon, tooltip: "Inspect values (hover to see data)" },
];

export const PlotToolbar = memo(function PlotToolbar({
  currentMode,
  onModeChange,
  onZoomIn,
  onZoomOut,
  themeColors,
}: PlotToolbarProps) {
  return (
    <div
      className="flex items-center justify-center gap-0.5 rounded-xl border border-(--border-default) bg-(--surface-1) px-1.5 py-1.5"
      role="toolbar"
      aria-label="Plot tools"
    >
      <Tooltip>
        <Button
          variant={currentMode === "pan" ? "primary" : "ghost"}
          isIconOnly
          size="md"
          onPress={() => onModeChange("pan")}
          aria-pressed={currentMode === "pan"}
          aria-label="Pan"
          className="h-9 min-w-9"
          style={{ color: themeColors.text, opacity: currentMode === "pan" ? 1 : 0.85 }}
        >
          <HandRaisedIcon className="h-5 w-5" />
        </Button>
        <Tooltip.Content>Pan horizontally (drag left/right)</Tooltip.Content>
      </Tooltip>
      <Tooltip>
        <Button
          variant="ghost"
          isIconOnly
          size="md"
          onPress={onZoomIn}
          aria-label="Zoom in"
          className="h-9 min-w-9"
          style={{ color: themeColors.text, opacity: 0.85 }}
        >
          <MagnifyingGlassPlusIcon className="h-5 w-5" />
        </Button>
        <Tooltip.Content>Zoom in</Tooltip.Content>
      </Tooltip>
      <Tooltip>
        <Button
          variant="ghost"
          isIconOnly
          size="md"
          onPress={onZoomOut}
          aria-label="Zoom out"
          className="h-9 min-w-9"
          style={{ color: themeColors.text, opacity: 0.85 }}
        >
          <MagnifyingGlassMinusIcon className="h-5 w-5" />
        </Button>
        <Tooltip.Content>Zoom out</Tooltip.Content>
      </Tooltip>
      {MODES.map(({ mode, icon: Icon, tooltip }) => {
        const isActive = currentMode === mode;
        return (
          <Tooltip key={mode}>
            <Button
              variant={isActive ? "primary" : "ghost"}
              isIconOnly
              size="md"
              onPress={() => onModeChange(mode)}
              aria-pressed={isActive}
              aria-label={tooltip}
              className="h-9 min-w-9"
              style={{ color: themeColors.text, opacity: isActive ? 1 : 0.85 }}
            >
              <Icon className="h-5 w-5" />
            </Button>
            <Tooltip.Content>{tooltip}</Tooltip.Content>
          </Tooltip>
        );
      })}
    </div>
  );
});
