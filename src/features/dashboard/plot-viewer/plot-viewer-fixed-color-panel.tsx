"use client";

import { useRef } from "react";
import { Button } from "@heroui/react";
import { cn } from "@heroui/styles";
import { coerceHexSix } from "~/lib/hex-color-presets";
import {
  PLOT_VIEWER_PALETTE_CATALOG,
  plotViewerPaletteEntry,
  type PlotViewerPaletteId,
} from "./plot-viewer-palette-catalog";

const GRAYSCALE_COLUMN: readonly string[] = [
  "#FFFFFF",
  "#E5E5E5",
  "#CCCCCC",
  "#999999",
  "#666666",
  "#404040",
  "#262626",
  "#0A0A0A",
];

const HUE_ROWS: readonly (readonly string[])[] = [
  ["#FF6B6B", "#FF922B", "#FCC419", "#94D82D", "#51CF66", "#22B8CF", "#339AF0", "#748FFC"],
  ["#F06595", "#FF8787", "#FFA94D", "#FFD43B", "#A9E34B", "#63E6BE", "#74C0FC", "#B197FC"],
  ["#E03131", "#E8590C", "#F59F00", "#74B816", "#37B24D", "#1098AD", "#1971C2", "#5C7CFA"],
  ["#C92A2A", "#D9480F", "#E67700", "#66A80F", "#2F9E44", "#0C8599", "#1864AB", "#4263EB"],
  ["#A61E4D", "#C92A2A", "#D9480F", "#5C940D", "#087F5B", "#0B7285", "#364FC7", "#5F3DC4"],
  ["#862E9C", "#9C36B5", "#AE3EC9", "#495057", "#343A40", "#212529", "#1C7ED6", "#364FC7"],
  ["#FAB005", "#FD7E14", "#FA5252", "#40C057", "#15AABF", "#228BE6", "#7950F2", "#BE4BDB"],
  ["#FFE066", "#FFA8A8", "#FFC078", "#8CE99A", "#66D9E8", "#91A7FF", "#DA77F2", "#E599F7"],
];

export const PLOT_VIEWER_FIXED_COLOR_PRESETS: readonly string[] = [
  ...GRAYSCALE_COLUMN,
  ...HUE_ROWS.flat(),
];

export type PlotViewerPaletteSwatchProps = {
  paletteId: PlotViewerPaletteId;
  isDark?: boolean;
  className?: string;
};

/**
 * Renders a qualitative multi-square strip or sequential gradient bar for one palette.
 */
export function PlotViewerPaletteSwatch({
  paletteId,
  isDark = false,
  className,
}: PlotViewerPaletteSwatchProps) {
  const entry = plotViewerPaletteEntry(paletteId);
  const stops = entry.previewStops;

  if (entry.kind === "qualitative") {
    return (
      <span
        className={cn(
          "border-border inline-flex h-3.5 overflow-hidden rounded-sm border",
          className,
        )}
        aria-hidden
      >
        {stops.map((color) => (
          <span
            key={color}
            className="h-full min-w-[0.45rem] flex-1"
            style={{ backgroundColor: color }}
          />
        ))}
      </span>
    );
  }

  const gradientStops = entry.resolveStops(isDark);
  const gradient = `linear-gradient(to right, ${gradientStops.join(", ")})`;

  return (
    <span
      className={cn(
        "border-border inline-block h-3.5 min-w-[4.5rem] rounded-sm border",
        className,
      )}
      style={{ background: gradient }}
      aria-hidden
    />
  );
}

export type PlotViewerPaletteSchemePickerProps = {
  paletteId: PlotViewerPaletteId;
  isDark?: boolean;
  onPaletteChange: (paletteId: PlotViewerPaletteId) => void;
  className?: string;
};

/**
 * Lists catalog palettes with preview swatches for the color-scheme section of style popovers.
 */
export function PlotViewerPaletteSchemePicker({
  paletteId,
  isDark = false,
  onPaletteChange,
  className,
}: PlotViewerPaletteSchemePickerProps) {
  return (
    <ul className={cn("space-y-1", className)} role="listbox" aria-label="Color scheme">
      {PLOT_VIEWER_PALETTE_CATALOG.map((entry) => {
        const selected = paletteId === entry.id;
        return (
          <li key={entry.id}>
            <button
              type="button"
              role="option"
              aria-selected={selected}
              className={cn(
                "hover:bg-default/40 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                selected && "bg-accent-soft ring-accent/40 ring-1",
              )}
              onClick={() => onPaletteChange(entry.id)}
            >
              <PlotViewerPaletteSwatch
                paletteId={entry.id}
                isDark={isDark}
                className="w-20 shrink-0"
              />
              <span className="min-w-0 flex-1">
                <span className="text-foreground block truncate text-[11px] font-medium leading-tight">
                  {entry.label}
                </span>
                <span className="text-muted block truncate text-[10px] leading-tight">
                  {entry.mplName}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export type PlotViewerFixedColorPanelProps = {
  value: string;
  fallbackHex: string;
  idPrefix: string;
  onChange: (hex: string) => void;
  nativePickerAriaLabel?: string;
  className?: string;
};

/**
 * Igor-inspired fixed color panel: large preview swatch, grayscale column plus hue rows, and native custom picker.
 */
export function PlotViewerFixedColorPanel({
  value,
  fallbackHex,
  idPrefix,
  onChange,
  nativePickerAriaLabel = "Pick custom color",
  className,
}: PlotViewerFixedColorPanelProps) {
  const nativeInputRef = useRef<HTMLInputElement>(null);
  const displayHex = coerceHexSix(value, fallbackHex);

  return (
    <div className={cn("flex gap-2", className)}>
      <div
        className="border-border size-14 shrink-0 rounded-md border shadow-inner"
        style={{ backgroundColor: displayHex }}
        aria-hidden
      />

      <div className="min-w-0 flex-1 space-y-1">
        <div
          className="grid gap-0.5"
          style={{ gridTemplateColumns: `repeat(${1 + HUE_ROWS[0]!.length}, minmax(0, 1fr))` }}
          role="group"
          aria-label="Color presets"
        >
          {GRAYSCALE_COLUMN.map((gray, rowIndex) => {
            const hueRow = HUE_ROWS[rowIndex] ?? [];
            const selectedGray = displayHex.toUpperCase() === gray.toUpperCase();
            return (
              <div key={gray} className="contents">
                <button
                  type="button"
                  className={cn(
                    "border-border size-4 rounded-sm border transition-transform hover:scale-110 focus-visible:ring-accent focus:outline-none focus-visible:ring-2",
                    selectedGray && "ring-accent ring-2 ring-offset-1",
                  )}
                  style={{ backgroundColor: gray }}
                  aria-label={`Preset ${gray}`}
                  aria-pressed={selectedGray}
                  onClick={() => onChange(coerceHexSix(gray, fallbackHex))}
                />
                {hueRow.map((hue) => {
                  const selected = displayHex.toUpperCase() === hue.toUpperCase();
                  return (
                    <button
                      key={hue}
                      type="button"
                      className={cn(
                        "border-border size-4 rounded-sm border transition-transform hover:scale-110 focus-visible:ring-accent focus:outline-none focus-visible:ring-2",
                        selected && "ring-accent ring-2 ring-offset-1",
                      )}
                      style={{ backgroundColor: hue }}
                      aria-label={`Preset ${hue}`}
                      aria-pressed={selected}
                      onClick={() => onChange(coerceHexSix(hue, fallbackHex))}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        <input
          ref={nativeInputRef}
          id={`${idPrefix}-native-color`}
          type="color"
          className="sr-only"
          value={displayHex}
          onChange={(event) => {
            onChange(coerceHexSix(event.target.value, fallbackHex));
          }}
          aria-label={nativePickerAriaLabel}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-muted h-6 w-full justify-start px-1 text-[10px]"
          onPress={() => nativeInputRef.current?.click()}
        >
          Custom...
        </Button>
      </div>
    </div>
  );
}
