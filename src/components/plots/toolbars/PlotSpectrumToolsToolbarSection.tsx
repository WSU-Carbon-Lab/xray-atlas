"use client";

import {
  Separator,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
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
import { PlotToolbarRichHint } from "./plot-toolbar-rich-hint";

export type PlotSpectrumToolsToolbarSectionProps = {
  /**
   * When false, omits the normalization master toggle and pre/post region tools so callers can place
   * normalization-only or peak-only segments on separate plot rails.
   */
  normalizationToolsEnabled?: boolean;
  isNormalizationMode: boolean;
  onNormalizationModeChange: (enabled: boolean) => void;
  activeEdge: "pre" | "post";
  onActiveEdgeChange: (edge: "pre" | "post") => void;
  onResetToDefaultRegions: () => void;
  normalizationLocked: boolean;
  hasData: boolean;
  /**
   * When false, omits the in-rail "reset regions" control (caller places it elsewhere, e.g. top plot rail).
   * Defaults to true for contribute flows that keep reset beside pre/post edge pickers.
   */
  normalizationRegionResetInRail?: boolean;
  /** When false, hides peak-set controls so only normalization tools render (browse dataset editor). */
  peakToolsEnabled?: boolean;
  isPeakSetMode: boolean;
  onPeakSetModeChange: (enabled: boolean) => void;
  peakCount: number;
  onAutoDetectPeaks: () => void;
  onResetAllPeaks: () => void;
};

export function PlotSpectrumToolsToolbarSection({
  normalizationToolsEnabled = true,
  isNormalizationMode,
  onNormalizationModeChange,
  activeEdge,
  onActiveEdgeChange,
  onResetToDefaultRegions,
  normalizationLocked,
  hasData,
  normalizationRegionResetInRail = true,
  peakToolsEnabled = true,
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
    if (normalizationRegionResetInRail && keys.has("reset")) {
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

  const showNorm = normalizationToolsEnabled;
  const showPeaks = peakToolsEnabled;

  if (!showNorm && !showPeaks) {
    return null;
  }

  return (
    <Toolbar
      isAttached
      orientation="vertical"
      aria-label="Spectrum plot tools"
      className={`${plotToolbarAttachedShellClass} w-fit`}
    >
      {showNorm ? (
        <>
          <PlotToolbarRichHint
            title="Normalization"
            description="Turn on pre-edge and post-edge bands for OD scaling."
            whenDisabledDescription="Upload or select a spectrum with measured points first."
            placement="left"
          >
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
          </PlotToolbarRichHint>
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
                className="w-full rounded-full"
              >
                <PlotToolbarRichHint
                  title="Pre-edge"
                  description="Choose the low-energy window used for normalization."
                  whenDisabledDescription="Normalization regions are locked for this dataset."
                  disabled={normalizationLocked}
                  placement="left"
                >
                  <ToggleButton
                    id="pre"
                    isIconOnly
                    aria-label="Pre-edge range"
                    className={plotToolbarGlyphToggleGroupItemVerticalClass}
                  >
                    <ArrowLeftToLine className="h-4 w-4" aria-hidden />
                  </ToggleButton>
                </PlotToolbarRichHint>
                <PlotToolbarRichHint
                  title="Post-edge"
                  description="Choose the high-energy window used for normalization."
                  whenDisabledDescription="Normalization regions are locked for this dataset."
                  disabled={normalizationLocked}
                  placement="left"
                >
                  <ToggleButton
                    id="post"
                    isIconOnly
                    aria-label="Post-edge range"
                    className={plotToolbarGlyphToggleGroupItemVerticalClass}
                  >
                    <ToggleButtonGroup.Separator />
                    <ArrowRightFromLine className="h-4 w-4" aria-hidden />
                  </ToggleButton>
                </PlotToolbarRichHint>
                {normalizationRegionResetInRail ? (
                  <PlotToolbarRichHint
                    title="Reset regions"
                    description="Restore default pre-edge and post-edge spans."
                    whenDisabledDescription={
                      scalingDisabled
                        ? "Upload or select a spectrum with measured points first."
                        : "Normalization regions are locked for this dataset."
                    }
                    placement="left"
                    disabled={resetDisabled}
                  >
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
                  </PlotToolbarRichHint>
                ) : null}
              </ToggleButtonGroup>
            </>
          ) : null}
        </>
      ) : null}

      {showNorm && showPeaks ? (
        <Separator orientation="horizontal" className="my-1 w-full shrink-0" />
      ) : null}

      {showPeaks ? (
        <>
          <PlotToolbarRichHint
            title="Peak mode"
            description="Click the plot to add peaks or select peaks to edit."
            whenDisabledDescription="Upload or select a spectrum with measured points first."
            placement="left"
          >
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
          </PlotToolbarRichHint>

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
                className="w-full rounded-full"
              >
                <PlotToolbarRichHint
                  title="Peak pointer"
                  description="Select a peak marker or click empty space to add one."
                  whenDisabledDescription={
                    peakMasterDisabled
                      ? "Upload or select a spectrum with measured points first."
                      : "Turn on peak mode first."
                  }
                  disabled={peakSubtoolsDisabled}
                  placement="left"
                >
                  <ToggleButton
                    id="pointer"
                    isIconOnly
                    aria-label="Select or add peaks on the plot. Click a peak to select, or empty plot to add."
                    className={plotToolbarGlyphToggleGroupItemVerticalClass}
                  >
                    <MousePointer2 className="h-4 w-4" aria-hidden />
                  </ToggleButton>
                </PlotToolbarRichHint>
                <PlotToolbarRichHint
                  title="Auto peaks"
                  description="Run automatic peak picking on the visible trace."
                  whenDisabledDescription={
                    peakMasterDisabled
                      ? "Upload or select a spectrum with measured points first."
                      : "Turn on peak mode first."
                  }
                  placement="left"
                  disabled={autoDetectDisabled}
                >
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
                </PlotToolbarRichHint>
                <PlotToolbarRichHint
                  title="Reset peaks"
                  description="Remove every peak from this spectrum."
                  whenDisabledDescription={
                    peakMasterDisabled
                      ? "Upload or select a spectrum with measured points first."
                      : !isPeakSetMode
                        ? "Turn on peak mode first."
                        : "Add at least one peak before clearing all peaks."
                  }
                  placement="left"
                  disabled={resetPeaksDisabled}
                >
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
                </PlotToolbarRichHint>
              </ToggleButtonGroup>
            </>
          ) : null}
        </>
      ) : null}
    </Toolbar>
  );
}
