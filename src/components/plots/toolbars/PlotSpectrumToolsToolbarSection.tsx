"use client";

import {
  Separator,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Tooltip,
} from "@heroui/react";
import {
  ArrowLeftToLine,
  ArrowRightFromLine,
  MousePointer2,
  Mountain,
  RotateCcw,
  Scaling,
  Sparkles,
} from "lucide-react";
import {
  plotToolbarAttachedShellClass,
  plotToolbarGlyphToggleGroupItemVerticalClass,
  plotToolbarGlyphToggleStandaloneClass,
} from "./plot-toolbar-chrome";

export type PlotSpectrumToolsToolbarSectionProps = {
  isNormalizationMode: boolean;
  onNormalizationModeChange: (enabled: boolean) => void;
  activeEdge: "pre" | "post";
  onActiveEdgeChange: (edge: "pre" | "post") => void;
  onResetToDefaultRegions: () => void;
  normalizationLocked: boolean;
  hasData: boolean;
  isPeakSetMode: boolean;
  onPeakSetModeChange: (enabled: boolean) => void;
  peakCount: number;
  onAutoDetectPeaks: () => void;
  onResetAllPeaks: () => void;
};

export function PlotSpectrumToolsToolbarSection({
  isNormalizationMode,
  onNormalizationModeChange,
  activeEdge,
  onActiveEdgeChange,
  onResetToDefaultRegions,
  normalizationLocked,
  hasData,
  isPeakSetMode,
  onPeakSetModeChange,
  peakCount,
  onAutoDetectPeaks,
  onResetAllPeaks,
}: PlotSpectrumToolsToolbarSectionProps) {
  const scalingDisabled = !hasData;
  const resetDisabled = scalingDisabled || normalizationLocked;
  const peakMasterDisabled = !hasData;
  const peakSubtoolsDisabled = peakMasterDisabled || !isPeakSetMode;
  const autoDetectDisabled = peakSubtoolsDisabled;
  const resetPeaksDisabled = peakSubtoolsDisabled || peakCount === 0;

  const handleRegionToolChange = (keys: Set<string | number>) => {
    if (keys.has("reset")) {
      if (!resetDisabled) {
        onResetToDefaultRegions();
      }
      return;
    }
    const next = keys.values().next().value;
    if (next === "pre" || next === "post") {
      onActiveEdgeChange(next);
    }
  };

  const handlePeakSubtoolChange = (keys: Set<string | number>) => {
    if (keys.has("auto-detect")) {
      if (!autoDetectDisabled) {
        onAutoDetectPeaks();
      }
      return;
    }
    if (keys.has("reset-peaks")) {
      if (!resetPeaksDisabled) {
        onResetAllPeaks();
      }
      return;
    }
  };

  return (
    <Toolbar
      isAttached
      orientation="vertical"
      aria-label="Spectrum plot tools"
      className={`${plotToolbarAttachedShellClass} w-fit`}
    >
      <Tooltip delay={0}>
        <ToggleButton
          isIconOnly
          aria-label="Normalization tools"
          isSelected={isNormalizationMode}
          onChange={(next) => {
            if (next !== isNormalizationMode) {
              onNormalizationModeChange(next);
            }
          }}
          isDisabled={scalingDisabled}
          className={plotToolbarGlyphToggleStandaloneClass}
        >
          <Scaling className="h-5 w-5" aria-hidden />
        </ToggleButton>
        <Tooltip.Content
          placement="right"
          className="bg-foreground text-background max-w-xs rounded-lg px-3 py-2 text-xs shadow-lg"
        >
          Pre-edge and post-edge regions for OD scaling
        </Tooltip.Content>
      </Tooltip>
      {isNormalizationMode ? (
        <>
          <Separator
            orientation="horizontal"
            className="my-1 w-full shrink-0"
          />
          <ToggleButtonGroup
            aria-label="Normalization region tools"
            selectionMode="single"
            orientation="vertical"
            selectedKeys={new Set([activeEdge])}
            onSelectionChange={handleRegionToolChange}
            isDisabled={normalizationLocked}
            className="w-full overflow-hidden rounded-full"
          >
            <ToggleButton
              id="pre"
              isIconOnly
              aria-label="Pre-edge range"
              className={plotToolbarGlyphToggleGroupItemVerticalClass}
            >
              <ArrowLeftToLine className="h-4 w-4" aria-hidden />
            </ToggleButton>
            <ToggleButton
              id="post"
              isIconOnly
              aria-label="Post-edge range"
              className={plotToolbarGlyphToggleGroupItemVerticalClass}
            >
              <ToggleButtonGroup.Separator />
              <ArrowRightFromLine className="h-4 w-4" aria-hidden />
            </ToggleButton>
            <ToggleButton
              id="reset"
              isIconOnly
              aria-label="Reset pre and post regions to defaults"
              isDisabled={resetDisabled}
              className={plotToolbarGlyphToggleGroupItemVerticalClass}
            >
              <ToggleButtonGroup.Separator />
              <RotateCcw className="h-4 w-4" aria-hidden />
            </ToggleButton>
          </ToggleButtonGroup>
        </>
      ) : null}

      <Separator orientation="horizontal" className="my-1 w-full shrink-0" />

      <Tooltip delay={0}>
        <ToggleButton
          isIconOnly
          aria-label="Peak set tools"
          isSelected={isPeakSetMode}
          onChange={(next) => {
            if (next !== isPeakSetMode) {
              onPeakSetModeChange(next);
            }
          }}
          isDisabled={peakMasterDisabled}
          className={plotToolbarGlyphToggleStandaloneClass}
        >
          <Mountain className="h-5 w-5" aria-hidden />
        </ToggleButton>
        <Tooltip.Content
          placement="right"
          className="bg-foreground text-background max-w-xs rounded-lg px-3 py-2 text-xs shadow-lg"
        >
          Select peaks on the plot or click empty area to add a peak
        </Tooltip.Content>
      </Tooltip>

      {isPeakSetMode ? (
        <>
          <Separator
            orientation="horizontal"
            className="my-1 w-full shrink-0"
          />
          <ToggleButtonGroup
            aria-label="Peak set tools"
            selectionMode="single"
            orientation="vertical"
            selectedKeys={new Set(["pointer"])}
            onSelectionChange={handlePeakSubtoolChange}
            isDisabled={peakSubtoolsDisabled}
            className="w-full overflow-hidden rounded-full"
          >
            <ToggleButton
              id="pointer"
              isIconOnly
              aria-label="Select or add peaks on the plot. Click a peak to select, or empty plot to add."
              className={plotToolbarGlyphToggleGroupItemVerticalClass}
            >
              <MousePointer2 className="h-4 w-4" aria-hidden />
            </ToggleButton>
            <ToggleButton
              id="auto-detect"
              isIconOnly
              aria-label="Auto-detect peaks from the visible spectrum"
              isDisabled={autoDetectDisabled}
              className={plotToolbarGlyphToggleGroupItemVerticalClass}
            >
              <ToggleButtonGroup.Separator />
              <Sparkles className="h-4 w-4" aria-hidden />
            </ToggleButton>
            <ToggleButton
              id="reset-peaks"
              isIconOnly
              aria-label="Clear all peaks from this dataset"
              isDisabled={resetPeaksDisabled}
              className={plotToolbarGlyphToggleGroupItemVerticalClass}
            >
              <ToggleButtonGroup.Separator />
              <RotateCcw className="h-4 w-4" aria-hidden />
            </ToggleButton>
          </ToggleButtonGroup>
        </>
      ) : null}
    </Toolbar>
  );
}
