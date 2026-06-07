"use client";

import { memo, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { Button, Input } from "@heroui/react";
import { cn } from "@heroui/styles";
import { ChevronDown, Lock, Minus, Palette, Plus } from "lucide-react";
import { PlotToolbarRichHint } from "~/components/plots/toolbars";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";
import {
  PlotViewerFixedColorPanel,
  PlotViewerPaletteSchemePicker,
  PlotViewerPaletteSwatch,
} from "./plot-viewer-fixed-color-panel";
import type { PlotViewerExperimentColorMode } from "./plot-viewer-style-overrides";
import {
  PlotViewerLineStylePreview,
  PlotViewerMarkerShapeGlyph,
} from "./plot-viewer-style-preview-glyphs";
import {
  PLOT_VIEWER_LINE_DASH_OPTIONS,
  PLOT_VIEWER_LINE_WIDTH_MAX,
  PLOT_VIEWER_LINE_WIDTH_MIN,
  PLOT_VIEWER_LINE_WIDTH_STEP,
  PLOT_VIEWER_PALETTE_OPTIONS,
  type PlotViewerLineDash,
  type PlotViewerMarkerSymbol,
  type PlotViewerPaletteId,
} from "./plot-viewer-trace-styles";

const STYLE_CONTROL_BUTTON_CLASS =
  "border-border bg-field-background text-foreground hover:bg-default/40 focus-visible:ring-border relative inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";

const POPOVER_SECTION_LABEL =
  "text-muted px-3 pt-1 text-xs font-medium uppercase tracking-wide";

const POPOVER_SECTION =
  "flex flex-col gap-3 px-3 py-2";

const MARKER_SHAPE_OPTIONS: readonly PlotViewerMarkerSymbol[] = [
  "none",
  "circle",
  "square",
  "diamond",
  "triangle",
];

const MARKER_EVERY_PRESETS = [1, 5, 10, 20] as const;

function stopAccordionToggle(event: MouseEvent) {
  event.stopPropagation();
}

function clampLineWidth(value: number): number {
  const stepped =
    Math.round(value / PLOT_VIEWER_LINE_WIDTH_STEP) * PLOT_VIEWER_LINE_WIDTH_STEP;
  return Math.min(PLOT_VIEWER_LINE_WIDTH_MAX, Math.max(PLOT_VIEWER_LINE_WIDTH_MIN, stepped));
}

function paletteLabel(paletteId: PlotViewerPaletteId | undefined): string {
  if (paletteId == null) {
    return "Spectrum gradient";
  }
  return (
    PLOT_VIEWER_PALETTE_OPTIONS.find((option) => option.id === paletteId)?.label ??
    paletteId
  );
}

type IconPopoverTriggerProps = {
  ariaLabel: string;
  hintTitle: string;
  hintDescription?: string;
  isActive?: boolean;
  isMuted?: boolean;
  disabled?: boolean;
  triggerProps: ButtonHTMLAttributes<HTMLButtonElement>;
  isOpen: boolean;
  children: ReactNode;
};

function IconPopoverTrigger({
  ariaLabel,
  hintTitle,
  hintDescription,
  isActive = false,
  isMuted = false,
  disabled = false,
  triggerProps,
  isOpen,
  children,
}: IconPopoverTriggerProps) {
  return (
    <PlotToolbarRichHint
      title={hintTitle}
      description={hintDescription ?? ""}
      placement="top"
    >
      <button
        type="button"
        {...triggerProps}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onPointerDown={(event) => {
          stopAccordionToggle(event);
          triggerProps.onPointerDown?.(event);
        }}
        onClick={(event) => {
          stopAccordionToggle(event);
          triggerProps.onClick?.(event);
        }}
        className={cn(
          STYLE_CONTROL_BUTTON_CLASS,
          isMuted && !isActive && "opacity-60",
        )}
      >
        {children}
        <ChevronDown className="absolute -bottom-0.5 -right-0.5 size-2.5 opacity-60" aria-hidden />
      </button>
    </PlotToolbarRichHint>
  );
}

type NumericStepperProps = {
  value: number | null;
  placeholder: string;
  min: number;
  max: number;
  step: number;
  ariaLabel: string;
  onChange: (value: number | null) => void;
  suffix?: string;
  clamp?: (value: number) => number;
};

function NumericStepper({
  value,
  placeholder,
  min,
  max,
  step,
  ariaLabel,
  onChange,
  suffix,
  clamp = (next) => Math.min(max, Math.max(min, next)),
}: NumericStepperProps) {
  const displayValue = value != null ? String(value) : "";

  const applyDelta = (delta: number) => {
    const parsedPlaceholder = Number.parseFloat(placeholder);
    const base = value ?? (Number.isFinite(parsedPlaceholder) ? parsedPlaceholder : min);
    const next = clamp(base + delta);
    onChange(Math.min(max, Math.max(min, next)));
  };

  return (
    <div className="flex items-center gap-0.5">
      <Button
        type="button"
        isIconOnly
        size="sm"
        variant="ghost"
        className="min-h-7 min-w-7"
        aria-label={`Decrease ${ariaLabel}`}
        onPress={() => applyDelta(-step)}
      >
        <Minus className="size-3" aria-hidden />
      </Button>
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        aria-label={ariaLabel}
        className="border-border bg-field-background min-h-7 w-14 rounded-lg border px-1 text-center text-[11px] shadow-none"
        value={displayValue}
        placeholder={placeholder}
        onChange={(event) => {
          const raw = event.target.value.trim();
          if (raw.length === 0) {
            onChange(null);
            return;
          }
          const parsed = Number(raw);
          if (Number.isFinite(parsed)) {
            onChange(clamp(parsed));
          }
        }}
      />
      <Button
        type="button"
        isIconOnly
        size="sm"
        variant="ghost"
        className="min-h-7 min-w-7"
        aria-label={`Increase ${ariaLabel}`}
        onPress={() => applyDelta(step)}
      >
        <Plus className="size-3" aria-hidden />
      </Button>
      {suffix ? (
        <span className="text-muted text-[10px]">{suffix}</span>
      ) : null}
    </div>
  );
}

export type PlotViewerColorStylePopoverProps = {
  mode: "experiment" | "trace";
  colorMode?: PlotViewerExperimentColorMode;
  paletteId?: PlotViewerPaletteId;
  isDark?: boolean;
  effectiveColor: string;
  inheritedColor: string;
  schemeColor?: string;
  previewColor?: string;
  hasOverride?: boolean;
  idPrefix: string;
  onColorModeChange?: (
    mode: PlotViewerExperimentColorMode,
    fixedColor: string | null,
  ) => void;
  onFixedColorChange?: (hex: string) => void;
  onPaletteChange?: (paletteId: PlotViewerPaletteId) => void;
  onClearOverride?: () => void;
  disabled?: boolean;
};

/**
 * Icon trigger and popover for experiment scheme/fixed color or per-trace color override.
 */
export const PlotViewerColorStylePopover = memo(function PlotViewerColorStylePopover({
  mode,
  colorMode = "scheme",
  paletteId,
  isDark = false,
  effectiveColor,
  inheritedColor,
  schemeColor,
  previewColor,
  hasOverride = false,
  idPrefix,
  onColorModeChange,
  onFixedColorChange,
  onPaletteChange,
  onClearOverride,
  disabled = false,
}: PlotViewerColorStylePopoverProps) {
  const isScheme = mode === "experiment" ? colorMode === "scheme" : !hasOverride;
  const resolvedPreview = previewColor ?? effectiveColor;
  const swatchColor = isScheme ? (schemeColor ?? inheritedColor) : effectiveColor;
  const fixedPanelColor =
    mode === "experiment" && colorMode === "fixed" ? effectiveColor : swatchColor;

  const triggerIcon = (
    <span
      className="border-border relative inline-flex size-3.5 items-center justify-center overflow-hidden rounded-sm border"
      style={{ backgroundColor: resolvedPreview }}
      aria-hidden
    >
      {isScheme ? (
        <Lock
          className="size-2.5 text-white drop-shadow-[0_0_1px_rgba(0,0,0,0.85)]"
          aria-hidden
        />
      ) : null}
    </span>
  );

  return (
    <PopoverMenu
      placement="bottom-start"
      contentClassName="w-[min(100vw-2rem,300px)]"
      renderTrigger={({ triggerProps, isOpen }) => (
        <IconPopoverTrigger
          ariaLabel="Color style"
          hintTitle="Color"
          hintDescription={
            isScheme
              ? `Match color scheme (${paletteLabel(paletteId)})`
              : `Fixed color ${effectiveColor}`
          }
          isActive={!isScheme || hasOverride}
          isMuted={mode === "trace" && !hasOverride}
          disabled={disabled}
          triggerProps={triggerProps}
          isOpen={isOpen}
        >
          {triggerIcon}
        </IconPopoverTrigger>
      )}
      renderContent={({ contentPositionClassName, contentProps, close }) => (
        <PopoverMenuContent
          {...contentProps}
          className={cn(contentPositionClassName, "rounded-xl py-2")}
          onPointerDown={stopAccordionToggle}
        >
          <div className={POPOVER_SECTION}>
            <div>
              <p className={POPOVER_SECTION_LABEL}>Color scheme</p>
              {onPaletteChange && paletteId != null ? (
                <PlotViewerPaletteSchemePicker
                  paletteId={paletteId}
                  isDark={isDark}
                  onPaletteChange={onPaletteChange}
                  className="mt-1"
                />
              ) : null}
            </div>

            <div>
              <p className={POPOVER_SECTION_LABEL}>Assignment</p>
              {mode === "experiment" ? (
                <Button
                  type="button"
                  size="sm"
                  variant={colorMode === "scheme" ? "primary" : "ghost"}
                  className="h-9 w-full justify-start gap-2 px-2 text-[11px]"
                  onPress={() => {
                    onColorModeChange?.("scheme", null);
                    close();
                  }}
                >
                  <Palette className="size-3.5 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">
                    Match color scheme
                    <span className="text-muted block truncate text-[10px] font-normal">
                      {paletteLabel(paletteId)}
                    </span>
                  </span>
                  {paletteId != null ? (
                    <PlotViewerPaletteSwatch
                      paletteId={paletteId}
                      isDark={isDark}
                      className="ml-auto w-16 shrink-0"
                    />
                  ) : (
                    <span
                      className="border-border ml-auto size-3 shrink-0 rounded-sm border"
                      style={{ backgroundColor: schemeColor ?? inheritedColor }}
                      aria-hidden
                    />
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant={!hasOverride ? "primary" : "ghost"}
                  className="h-8 w-full justify-start gap-2 text-[11px]"
                  onPress={() => {
                    onClearOverride?.();
                    close();
                  }}
                >
                  <span
                    className="border-border size-3 shrink-0 rounded-sm border"
                    style={{ backgroundColor: inheritedColor }}
                    aria-hidden
                  />
                  Inherit ({inheritedColor})
                </Button>
              )}
            </div>

            <div>
              <p className={POPOVER_SECTION_LABEL}>Fixed color</p>
              <PlotViewerFixedColorPanel
                idPrefix={idPrefix}
                value={fixedPanelColor}
                fallbackHex={schemeColor ?? inheritedColor}
                nativePickerAriaLabel={
                  mode === "experiment"
                    ? "Pick fixed experiment color"
                    : "Pick trace color"
                }
                onChange={(hex) => {
                  if (mode === "experiment") {
                    onColorModeChange?.("fixed", hex);
                  }
                  onFixedColorChange?.(hex);
                }}
              />
            </div>
          </div>
        </PopoverMenuContent>
      )}
    />
  );
});

export type PlotViewerLineStylePopoverProps = {
  mode: "experiment" | "trace";
  effectiveLineDash: PlotViewerLineDash;
  inheritedLineDash: PlotViewerLineDash;
  effectiveLineWidth?: number;
  inheritedLineWidth?: number;
  previewColor?: string;
  hasLineDashOverride?: boolean;
  hasLineWidthOverride?: boolean;
  onLineDashChange: (lineDash: PlotViewerLineDash | null) => void;
  onLineWidthChange?: (width: number | null) => void;
  disabled?: boolean;
};

/**
 * Icon trigger and popover for line width stepper and dash pattern grid.
 */
export const PlotViewerLineStylePopover = memo(function PlotViewerLineStylePopover({
  mode,
  effectiveLineDash,
  inheritedLineDash,
  effectiveLineWidth,
  inheritedLineWidth,
  previewColor,
  hasLineDashOverride = false,
  hasLineWidthOverride = false,
  onLineDashChange,
  onLineWidthChange,
  disabled = false,
}: PlotViewerLineStylePopoverProps) {
  const linePreviewColor = previewColor ?? "currentColor";
  const isInherited =
    mode === "experiment"
      ? !hasLineDashOverride && !hasLineWidthOverride
      : !hasLineDashOverride && !hasLineWidthOverride;
  const widthValue = hasLineWidthOverride ? effectiveLineWidth ?? null : null;
  const widthPlaceholder =
    inheritedLineWidth != null
      ? String(inheritedLineWidth)
      : String(PLOT_VIEWER_LINE_WIDTH_MIN);

  return (
    <PopoverMenu
      placement="bottom-start"
      contentClassName="w-[min(100vw-2rem,280px)]"
      renderTrigger={({ triggerProps, isOpen }) => (
        <IconPopoverTrigger
          ariaLabel="Line style"
          hintTitle="Line"
          hintDescription={`${effectiveLineDash}, ${effectiveLineWidth ?? inheritedLineWidth ?? "auto"} px`}
          isActive={!isInherited}
          isMuted={mode === "trace" && isInherited}
          disabled={disabled}
          triggerProps={triggerProps}
          isOpen={isOpen}
        >
          <PlotViewerLineStylePreview
            lineDash={effectiveLineDash}
            color={linePreviewColor}
          />
        </IconPopoverTrigger>
      )}
      renderContent={({ contentPositionClassName, contentProps }) => (
        <PopoverMenuContent
          {...contentProps}
          className={cn(contentPositionClassName, "rounded-xl py-2")}
          onPointerDown={stopAccordionToggle}
        >
          <div className={POPOVER_SECTION}>
            <div>
              <p className={POPOVER_SECTION_LABEL}>Size</p>
              <div className="flex flex-wrap items-center gap-2">
                <NumericStepper
                  value={widthValue}
                  placeholder={widthPlaceholder}
                  min={PLOT_VIEWER_LINE_WIDTH_MIN}
                  max={PLOT_VIEWER_LINE_WIDTH_MAX}
                  step={PLOT_VIEWER_LINE_WIDTH_STEP}
                  ariaLabel="Line width in pixels"
                  suffix="px"
                  clamp={clampLineWidth}
                  onChange={onLineWidthChange ?? (() => undefined)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant={!hasLineWidthOverride ? "primary" : "ghost"}
                  className="min-h-8 px-2.5 text-[10px]"
                  onPress={() => onLineWidthChange?.(null)}
                >
                  Auto
                </Button>
              </div>
            </div>

            <div>
              <p className={POPOVER_SECTION_LABEL}>Line style</p>
              <div
                className="grid grid-cols-5 gap-1.5 p-1"
                role="group"
                aria-label="Line dash patterns"
              >
                {(mode === "trace" || hasLineDashOverride || hasLineWidthOverride) ? (
                  <button
                    type="button"
                    className={cn(
                      "border-border hover:bg-default/40 flex h-10 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md border bg-transparent px-1 transition-colors",
                      !hasLineDashOverride && "border-accent ring-accent/30 ring-1",
                    )}
                    aria-label="Inherit line style"
                    onClick={() => onLineDashChange(null)}
                  >
                    <PlotViewerLineStylePreview
                      lineDash={inheritedLineDash}
                      color={linePreviewColor}
                      className="opacity-60"
                    />
                    <span className="text-muted text-[9px]">Auto</span>
                  </button>
                ) : null}
                {PLOT_VIEWER_LINE_DASH_OPTIONS.map((option, index) => {
                  const selected =
                    effectiveLineDash === option.id &&
                    (mode === "experiment" ? hasLineDashOverride : hasLineDashOverride);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={cn(
                        "border-border hover:bg-default/40 flex h-10 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md border bg-transparent px-1 transition-colors",
                        selected && "border-accent ring-accent/30 ring-1",
                      )}
                      aria-label={option.label}
                      aria-pressed={selected}
                      onClick={() => onLineDashChange(option.id)}
                    >
                      <PlotViewerLineStylePreview
                        lineDash={option.id}
                        color={linePreviewColor}
                      />
                      <span className="text-muted text-[9px]">{index + 1}</span>
                    </button>
                  );
                })}
              </div>
              {mode === "experiment" && !hasLineDashOverride && !hasLineWidthOverride ? (
                <p className="text-muted px-1 pt-1 text-[10px]">
                  Inheriting {inheritedLineDash} from encoding
                </p>
              ) : null}
            </div>
          </div>
        </PopoverMenuContent>
      )}
    />
  );
});

export type PlotViewerMarkerStylePopoverProps = {
  mode: "experiment" | "trace";
  effectiveMarker: PlotViewerMarkerSymbol;
  inheritedMarker: PlotViewerMarkerSymbol;
  effectiveMarkerSize?: number;
  inheritedMarkerSize?: number;
  effectiveMarkerEvery?: number;
  inheritedMarkerEvery?: number;
  previewColor?: string;
  hasMarkerOverride?: boolean;
  hasMarkerSizeOverride?: boolean;
  hasMarkerEveryOverride?: boolean;
  onMarkerChange: (marker: PlotViewerMarkerSymbol | null) => void;
  onMarkerSizeChange?: (size: number | null) => void;
  onMarkerEveryChange?: (every: number | null) => void;
  disabled?: boolean;
};

/**
 * Icon trigger and popover for marker shape grid, size, and sparse marker interval.
 */
export const PlotViewerMarkerStylePopover = memo(function PlotViewerMarkerStylePopover({
  mode,
  effectiveMarker,
  inheritedMarker,
  effectiveMarkerSize,
  inheritedMarkerSize,
  effectiveMarkerEvery,
  inheritedMarkerEvery,
  previewColor,
  hasMarkerOverride = false,
  hasMarkerSizeOverride = false,
  hasMarkerEveryOverride = false,
  onMarkerChange,
  onMarkerSizeChange,
  onMarkerEveryChange,
  disabled = false,
}: PlotViewerMarkerStylePopoverProps) {
  const isInherited =
    !hasMarkerOverride && !hasMarkerSizeOverride && !hasMarkerEveryOverride;
  const sizeValue = hasMarkerSizeOverride ? effectiveMarkerSize ?? null : null;
  const sizePlaceholder =
    inheritedMarkerSize != null ? String(inheritedMarkerSize) : "Auto";
  const everyValue = hasMarkerEveryOverride ? effectiveMarkerEvery ?? null : null;
  const everyPlaceholder =
    inheritedMarkerEvery != null ? String(inheritedMarkerEvery) : "Auto";
  const markerPreviewColor = previewColor ?? "currentColor";

  return (
    <PopoverMenu
      placement="bottom-start"
      contentClassName="w-[min(100vw-2rem,220px)]"
      renderTrigger={({ triggerProps, isOpen }) => (
        <IconPopoverTrigger
          ariaLabel="Marker style"
          hintTitle="Marker"
          hintDescription={
            effectiveMarker === "none"
              ? "No markers"
              : `${effectiveMarker}, every ${effectiveMarkerEvery ?? inheritedMarkerEvery ?? "auto"}`
          }
          isActive={!isInherited}
          isMuted={mode === "trace" && isInherited}
          disabled={disabled}
          triggerProps={triggerProps}
          isOpen={isOpen}
        >
          <PlotViewerMarkerShapeGlyph
            symbol={effectiveMarker}
            color={markerPreviewColor}
          />
        </IconPopoverTrigger>
      )}
      renderContent={({ contentPositionClassName, contentProps }) => (
        <PopoverMenuContent
          {...contentProps}
          className={cn(contentPositionClassName, "rounded-xl py-1")}
          onPointerDown={stopAccordionToggle}
        >
          <p className={POPOVER_SECTION_LABEL}>Size</p>
          <div className="flex flex-wrap items-center gap-1 px-2 pb-2">
            <NumericStepper
              value={sizeValue}
              placeholder={sizePlaceholder === "Auto" ? "5" : sizePlaceholder}
              min={1}
              max={16}
              step={0.5}
              ariaLabel="Marker size"
              onChange={onMarkerSizeChange ?? (() => undefined)}
            />
            <Button
              type="button"
              size="sm"
              variant={!hasMarkerSizeOverride ? "primary" : "ghost"}
              className="min-h-7 px-2 text-[10px]"
              onPress={() => onMarkerSizeChange?.(null)}
            >
              Auto
            </Button>
          </div>

          <p className={POPOVER_SECTION_LABEL}>Marker every</p>
          <div className="flex flex-wrap items-center gap-1 px-2 pb-2">
            <Input
              type="number"
              min={1}
              step={1}
              aria-label="Show marker every N points"
              className="border-border bg-field-background min-h-7 w-14 rounded-lg border px-1 text-center text-[11px] shadow-none"
              value={everyValue != null ? String(everyValue) : ""}
              placeholder={everyPlaceholder === "Auto" ? "1" : everyPlaceholder}
              onChange={(event) => {
                const raw = event.target.value.trim();
                if (raw.length === 0) {
                  onMarkerEveryChange?.(null);
                  return;
                }
                const parsed = Number(raw);
                if (Number.isFinite(parsed) && parsed >= 1) {
                  onMarkerEveryChange?.(Math.round(parsed));
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              variant={!hasMarkerEveryOverride ? "primary" : "ghost"}
              className="min-h-7 px-2 text-[10px]"
              onPress={() => onMarkerEveryChange?.(null)}
            >
              Auto
            </Button>
            {MARKER_EVERY_PRESETS.map((preset) => (
              <Button
                key={preset}
                type="button"
                size="sm"
                variant={
                  hasMarkerEveryOverride && everyValue === preset ? "primary" : "ghost"
                }
                className="min-h-7 min-w-7 px-1 text-[10px]"
                onPress={() => onMarkerEveryChange?.(preset)}
              >
                {preset}
              </Button>
            ))}
          </div>

          <p className={POPOVER_SECTION_LABEL}>Shape</p>
          <div
            className="grid grid-cols-5 gap-1 px-2 pb-2"
            role="group"
            aria-label="Marker shapes"
          >
            {(mode === "trace" ||
              hasMarkerOverride ||
              hasMarkerSizeOverride ||
              hasMarkerEveryOverride) ? (
              <Button
                type="button"
                size="sm"
                variant={!hasMarkerOverride ? "primary" : "ghost"}
                className="flex h-8 min-w-0 flex-col items-center justify-center gap-0 px-0.5"
                aria-label="Inherit marker shape"
                onPress={() => onMarkerChange(null)}
              >
                <PlotViewerMarkerShapeGlyph
                  symbol={inheritedMarker}
                  color={markerPreviewColor}
                  className="opacity-50"
                />
                <span className="text-muted text-[9px]">Auto</span>
              </Button>
            ) : null}
            {MARKER_SHAPE_OPTIONS.map((symbol) => (
              <Button
                key={symbol}
                type="button"
                size="sm"
                variant={
                  effectiveMarker === symbol &&
                  (mode === "experiment" ? hasMarkerOverride : hasMarkerOverride)
                    ? "primary"
                    : "ghost"
                }
                className="flex h-8 min-w-0 flex-col items-center justify-center gap-0 px-0.5"
                aria-label={symbol}
                aria-pressed={effectiveMarker === symbol && hasMarkerOverride}
                onPress={() => onMarkerChange(symbol)}
              >
                <PlotViewerMarkerShapeGlyph
                  symbol={symbol}
                  color={markerPreviewColor}
                />
              </Button>
            ))}
          </div>
          {mode === "experiment" && isInherited ? (
            <p className="text-muted px-2 pb-2 text-[10px]">
              Inheriting {inheritedMarker} from encoding
            </p>
          ) : null}
        </PopoverMenuContent>
      )}
    />
  );
});
