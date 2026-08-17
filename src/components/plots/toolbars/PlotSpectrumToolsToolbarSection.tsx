"use client";

import { ToggleButton, ToggleButtonGroup, Toolbar } from "@heroui/react";
import {
  ArrowLeftToLine,
  ArrowRightFromLine,
  Columns2,
  Eye,
  EyeOff,
  MousePointer2,
  Mountain,
  PanelLeft,
  PanelRight,
  RotateCcw,
  Scaling,
  Sparkles,
} from "lucide-react";
import type { NormalizationBandMode } from "~/lib/nexafs/normalization-band-mode";
import {
  plotToolbarAttachedToolbarVerticalClass,
  plotToolbarAttachedToggleGroupVerticalClass,
  plotToolbarGlyphToggleGroupItemVerticalClass,
  plotToolbarGlyphToggleStandaloneClass,
} from "./plot-toolbar-chrome";
import { PlotToolbarGroupSeparator } from "./plot-toolbar-group-separator";
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
  /**
   * Which edge windows participate in the live fit. When omitted with no change handler, band-mode
   * controls are hidden (callers that only need region brush tools).
   */
  bandMode?: NormalizationBandMode;
  onBandModeChange?: (mode: NormalizationBandMode) => void;
  /**
   * Hatched pre/post preview visibility. When omitted with no change handler, the preview toggle is
   * hidden.
   */
  showBandPreview?: boolean;
  onShowBandPreviewChange?: (show: boolean) => void;
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
  bandMode,
  onBandModeChange,
  showBandPreview,
  onShowBandPreviewChange,
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
  const bandModeControls =
    bandMode != null && typeof onBandModeChange === "function";
  const previewControls =
    showBandPreview != null && typeof onShowBandPreviewChange === "function";

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

  const handleBandModeChange = (keys: Set<string | number>) => {
    const next = keys.values().next().value;
    if (next === "both" || next === "pre" || next === "post") {
      onBandModeChange?.(next);
      if (next === "pre" || next === "post") {
        onActiveEdgeChange(next);
      }
    }
  };

  const preEdgeToolDisabled =
    normalizationLocked || (bandModeControls && bandMode === "post");
  const postEdgeToolDisabled =
    normalizationLocked || (bandModeControls && bandMode === "pre");

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
      className={plotToolbarAttachedToolbarVerticalClass}
    >
      {showNorm ? (
        <>
          <PlotToolbarRichHint
            title="Normalization"
            description="Turn on normalization windows for OD and bare-atom mu fits."
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
          {previewControls ? (
            <PlotToolbarRichHint
              title={
                showBandPreview
                  ? "Hide edge previews"
                  : "Show edge previews"
              }
              description="Toggle hatched pre-edge and post-edge preview bands on the plot. Does not change which windows are used for the fit."
              whenDisabledDescription="Upload or select a spectrum with measured points first."
              placement="left"
            >
              <ToggleButton
                isIconOnly
                aria-label={
                  showBandPreview
                    ? "Hide normalization edge previews"
                    : "Show normalization edge previews"
                }
                isSelected={showBandPreview}
                onChange={(next) => {
                  if (next !== showBandPreview) {
                    onShowBandPreviewChange?.(next);
                  }
                }}
                isDisabled={scalingDisabled}
                className={plotToolbarGlyphToggleStandaloneClass}
              >
                {showBandPreview ? (
                  <Eye className="h-5 w-5" aria-hidden />
                ) : (
                  <EyeOff className="h-5 w-5" aria-hidden />
                )}
              </ToggleButton>
            </PlotToolbarRichHint>
          ) : null}
          {isNormalizationMode ? (
            <>
              <PlotToolbarGroupSeparator orientation="horizontal" />
              {bandModeControls ? (
                <>
                  <ToggleButtonGroup
                    aria-label="Normalization band mode"
                    selectionMode="single"
                    orientation="vertical"
                    selectedKeys={new Set([bandMode])}
                    onSelectionChange={handleBandModeChange}
                    isDisabled={normalizationLocked}
                    className={plotToolbarAttachedToggleGroupVerticalClass}
                  >
                    <PlotToolbarRichHint
                      title="Both edges"
                      description="Fit using both pre-edge and post-edge windows."
                      whenDisabledDescription="Normalization regions are locked for this dataset."
                      disabled={normalizationLocked}
                      placement="left"
                    >
                      <ToggleButton
                        id="both"
                        isIconOnly
                        aria-label="Normalize with both pre and post edge"
                        className={plotToolbarGlyphToggleGroupItemVerticalClass}
                      >
                        <Columns2 className="h-4 w-4" aria-hidden />
                      </ToggleButton>
                    </PlotToolbarRichHint>
                    <PlotToolbarRichHint
                      title="Only pre-edge"
                      description="Match intensity using only the pre-edge window (OD subtracts the pre mean; bare-atom mu uses a positive mean match). Use when the post-edge continuum is unreliable."
                      whenDisabledDescription="Normalization regions are locked for this dataset."
                      disabled={normalizationLocked}
                      placement="left"
                    >
                      <ToggleButton
                        id="pre"
                        isIconOnly
                        aria-label="Normalize with only the pre-edge window"
                        className={plotToolbarGlyphToggleGroupItemVerticalClass}
                      >
                        <ToggleButtonGroup.Separator />
                        <PanelLeft className="h-4 w-4" aria-hidden />
                      </ToggleButton>
                    </PlotToolbarRichHint>
                    <PlotToolbarRichHint
                      title="Only post-edge"
                      description="Match intensity using only the post-edge window (OD uses a positive |post| scale; bare-atom mu uses a positive mean match). Use when the pre-edge continuum is unreliable."
                      whenDisabledDescription="Normalization regions are locked for this dataset."
                      disabled={normalizationLocked}
                      placement="left"
                    >
                      <ToggleButton
                        id="post"
                        isIconOnly
                        aria-label="Normalize with only the post-edge window"
                        className={plotToolbarGlyphToggleGroupItemVerticalClass}
                      >
                        <ToggleButtonGroup.Separator />
                        <PanelRight className="h-4 w-4" aria-hidden />
                      </ToggleButton>
                    </PlotToolbarRichHint>
                  </ToggleButtonGroup>
                  <PlotToolbarGroupSeparator orientation="horizontal" />
                </>
              ) : null}
              <ToggleButtonGroup
                aria-label="Normalization region tools"
                selectionMode="single"
                orientation="vertical"
                selectedKeys={new Set([activeEdge])}
                onSelectionChange={handleRegionToolChange}
                isDisabled={normalizationLocked}
                className={plotToolbarAttachedToggleGroupVerticalClass}
              >
                <PlotToolbarRichHint
                  title="Pre-edge"
                  description="Choose the low-energy window used for normalization."
                  whenDisabledDescription={
                    bandMode === "post"
                      ? "Post-only band mode is active; switch to both or pre-only to edit the pre-edge."
                      : "Normalization regions are locked for this dataset."
                  }
                  disabled={preEdgeToolDisabled}
                  placement="left"
                >
                  <ToggleButton
                    id="pre"
                    isIconOnly
                    aria-label="Pre-edge range"
                    isDisabled={preEdgeToolDisabled}
                    className={plotToolbarGlyphToggleGroupItemVerticalClass}
                  >
                    <ArrowLeftToLine className="h-4 w-4" aria-hidden />
                  </ToggleButton>
                </PlotToolbarRichHint>
                <PlotToolbarRichHint
                  title="Post-edge"
                  description="Choose the high-energy window used for normalization."
                  whenDisabledDescription={
                    bandMode === "pre"
                      ? "Pre-only band mode is active; switch to both or post-only to edit the post-edge."
                      : "Normalization regions are locked for this dataset."
                  }
                  disabled={postEdgeToolDisabled}
                  placement="left"
                >
                  <ToggleButton
                    id="post"
                    isIconOnly
                    aria-label="Post-edge range"
                    isDisabled={postEdgeToolDisabled}
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
        <PlotToolbarGroupSeparator orientation="horizontal" />
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
              <PlotToolbarGroupSeparator orientation="horizontal" />
              <ToggleButtonGroup
                aria-label="Peak set tools"
                selectionMode="single"
                orientation="vertical"
                selectedKeys={new Set(["pointer"])}
                onSelectionChange={handlePeakSubtoolChange}
                isDisabled={peakSubtoolsDisabled}
                className={plotToolbarAttachedToggleGroupVerticalClass}
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
