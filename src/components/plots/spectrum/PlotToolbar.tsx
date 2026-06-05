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
import { Button } from "@heroui/react";
import type { ChartThemeColors } from "../config";
import { PlotToolbarRichHint } from "../toolbars";
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
  hintTitle: string;
  hintDescription: string;
}[] = [
  {
    mode: "select",
    icon: CursorArrowRaysIcon,
    ariaLabel: "Select normalization region",
    hintTitle: "Select region",
    hintDescription:
      "Drag on the plot to choose the normalization energy window.",
  },
  {
    mode: "peak",
    icon: PencilIcon,
    ariaLabel: "Edit peaks on plot",
    hintTitle: "Edit peaks",
    hintDescription: "Click the plot to add peaks or select a peak to adjust.",
  },
  {
    mode: "inspect",
    icon: EyeIcon,
    ariaLabel: "Inspect spectrum values",
    hintTitle: "Inspect values",
    hintDescription: "Hover the spectrum to read coordinates and values.",
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
      <PlotToolbarRichHint
        title="Pan"
        description="Drag after zooming energy or absorption to shift the visible window."
      >
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
      </PlotToolbarRichHint>
      <PlotToolbarRichHint
        title="Zoom in"
        description="Narrow the energy window around the plot center."
      >
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
      </PlotToolbarRichHint>
      <PlotToolbarRichHint
        title="Zoom out"
        description="Widen the energy window toward the full range."
      >
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
      </PlotToolbarRichHint>
      {MODES.map(({ mode, icon: Icon, ariaLabel, hintTitle, hintDescription }) => {
        const isActive = currentMode === mode;
        return (
          <PlotToolbarRichHint key={mode} title={hintTitle} description={hintDescription}>
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
          </PlotToolbarRichHint>
        );
      })}
    </div>
  );
});
