"use client";

import { memo, type ComponentType } from "react";
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
import { plotToolbarTooltipContentClass } from "../toolbars";
import type { CursorMode } from "./ModeBar";

type PlotToolbarProps = {
  currentMode: CursorMode;
  onModeChange: (mode: CursorMode) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  themeColors: ChartThemeColors;
};

const MODES: {
  mode: CursorMode;
  icon: ComponentType<{ className?: string }>;
  ariaLabel: string;
  tooltip: string;
}[] = [
  {
    mode: "select",
    icon: CursorArrowRaysIcon,
    ariaLabel: "Select normalization region",
    tooltip: "Select region: Drag on the plot to choose the normalization energy window.",
  },
  {
    mode: "peak",
    icon: PencilIcon,
    ariaLabel: "Edit peaks on plot",
    tooltip: "Edit peaks: Click the plot to add peaks or select a peak to adjust.",
  },
  {
    mode: "inspect",
    icon: EyeIcon,
    ariaLabel: "Inspect spectrum values",
    tooltip: "Inspect values: Hover the spectrum to read coordinates and values.",
  },
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
      <Tooltip delay={0}>
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
        <Tooltip.Content className={plotToolbarTooltipContentClass}>
          Pan plot: Drag horizontally after zooming in.
        </Tooltip.Content>
      </Tooltip>
      <Tooltip delay={0}>
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
        <Tooltip.Content className={plotToolbarTooltipContentClass}>
          Zoom in: Narrow the energy window around the plot center.
        </Tooltip.Content>
      </Tooltip>
      <Tooltip delay={0}>
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
        <Tooltip.Content className={plotToolbarTooltipContentClass}>
          Zoom out: Widen the energy window toward the full range.
        </Tooltip.Content>
      </Tooltip>
      {MODES.map(({ mode, icon: Icon, ariaLabel, tooltip }) => {
        const isActive = currentMode === mode;
        return (
          <Tooltip key={mode} delay={0}>
            <Button
              variant={isActive ? "primary" : "ghost"}
              isIconOnly
              size="md"
              onPress={() => onModeChange(mode)}
              aria-pressed={isActive}
              aria-label={ariaLabel}
              className="h-9 min-w-9"
              style={{ color: themeColors.text, opacity: isActive ? 1 : 0.85 }}
            >
              <Icon className="h-5 w-5" />
            </Button>
            <Tooltip.Content className={plotToolbarTooltipContentClass}>
              {tooltip}
            </Tooltip.Content>
          </Tooltip>
        );
      })}
    </div>
  );
});
