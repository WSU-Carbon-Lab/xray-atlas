"use client";

/**
 * Reusable hex color control: native OS color picker and a paged preset carousel that can extend
 * with freshly generated random swatches when paging past the last static preset page.
 * Page size follows the carousel track width (ResizeObserver). Avoids HeroUI `ColorPicker` popovers
 * so the control works inside Headless UI `SimpleDialog` and similar modal stacks.
 *
 * @see README.md in this folder for when to use this vs HeroUI `ColorPicker`.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button, parseColor } from "@heroui/react";
import { cn } from "@heroui/styles";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DISCORD_STYLE_HEX_COLOR_PRESETS,
  coerceHexSix,
  hexSixSchema,
  type HexColorPreset,
} from "~/lib/hex-color-presets";

export type { HexColorPreset };

const DEFAULT_SWATCHES_PER_PAGE = 8;
const SWATCH_SIZE_PX = 32;
const SWATCH_GAP_PX = 6;
const MIN_SWATCHES_PER_PAGE = 4;
const MAX_SWATCHES_PER_PAGE = 14;
const RESIZE_DEBOUNCE_MS = 100;

function swatchesPerPageFromTrackWidth(widthPx: number): number {
  if (!Number.isFinite(widthPx) || widthPx < SWATCH_SIZE_PX) {
    return DEFAULT_SWATCHES_PER_PAGE;
  }
  const per = SWATCH_SIZE_PX + SWATCH_GAP_PX;
  const n = Math.floor((widthPx + SWATCH_GAP_PX) / per);
  return Math.min(
    MAX_SWATCHES_PER_PAGE,
    Math.max(MIN_SWATCHES_PER_PAGE, n),
  );
}

export interface HexColorSelectorProps {
  /**
   * Controlled color as `#RRGGBB` (letter case normalized on change).
   */
  value: string;
  /**
   * Invoked when the user picks a new valid six-digit hex (native picker, preset swatch, or generated swatch).
   */
  onChange: (hex: string) => void;
  /**
   * Stable prefix for `id` / `aria-labelledby` wiring; must be unique among simultaneous instances.
   */
  idPrefix: string;
  /**
   * Quick-pick swatches; pass `[]` to hide the carousel. Defaults to {@link DISCORD_STYLE_HEX_COLOR_PRESETS}.
   */
  presets?: readonly HexColorPreset[];
  /**
   * Used when `value` from the parent is not valid six-digit hex during display sync.
   */
  fallbackHex?: string;
  /**
   * Accessible name for the control that opens the system color dialog.
   */
  nativePickerAriaLabel?: string;
  /**
   * Accessible name for the preset carousel group.
   */
  presetsAriaLabel?: string;
  className?: string;
}

function randomHexSix(): string {
  const h = Math.floor(Math.random() * 360);
  const s = 50 + Math.floor(Math.random() * 50);
  const l = 40 + Math.floor(Math.random() * 30);
  return parseColor(`hsl(${h}, ${s}%, ${l}%)`).toString("hex").toUpperCase();
}

function makeRandomPresetPage(count: number): HexColorPreset[] {
  return Array.from({ length: count }, (_, i) => ({
    label: `Random ${i + 1}`,
    value: randomHexSix(),
  }));
}

const ROW_HEIGHT = "h-[3.25rem]";

const swatchButtonClass =
  "size-8 min-w-8 shrink-0 rounded-md border border-black/15 p-0 shadow-inner dark:border-white/20 " +
  "ring-0 ring-offset-0 outline-none " +
  "focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";

/**
 * Controlled hex color UI: system `input[type=color]`, paged preset carousel with extendable random pages.
 * Does not use overlay popovers; safe inside third-party modal focus traps.
 */
export function HexColorSelector({
  value,
  onChange,
  idPrefix,
  presets = DISCORD_STYLE_HEX_COLOR_PRESETS,
  fallbackHex = "#5865F2",
  nativePickerAriaLabel = "Open system color picker",
  presetsAriaLabel = "Color presets",
  className,
}: HexColorSelectorProps) {
  const reactId = useId();
  const baseId = `${idPrefix}-${reactId}`;
  const nativeInputId = `${baseId}-native-color`;
  const swatchTrackRef = useRef<HTMLDivElement>(null);
  const resizeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalized = coerceHexSix(value, fallbackHex);

  const [swatchesPerPage, setSwatchesPerPage] = useState(
    DEFAULT_SWATCHES_PER_PAGE,
  );

  useEffect(() => {
    if (presets.length === 0) return;
    const el = swatchTrackRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const measure = () => {
      const w = el.getBoundingClientRect().width;
      const next = swatchesPerPageFromTrackWidth(w);
      setSwatchesPerPage((prev) => (prev === next ? prev : next));
    };

    const ro = new ResizeObserver(() => {
      if (resizeDebounceRef.current !== null) {
        clearTimeout(resizeDebounceRef.current);
      }
      resizeDebounceRef.current = setTimeout(() => {
        resizeDebounceRef.current = null;
        measure();
      }, RESIZE_DEBOUNCE_MS);
    });

    ro.observe(el);
    measure();

    return () => {
      ro.disconnect();
      if (resizeDebounceRef.current !== null) {
        clearTimeout(resizeDebounceRef.current);
      }
    };
  }, [presets.length]);

  const presetPages = useMemo(() => {
    const out: HexColorPreset[][] = [];
    for (let i = 0; i < presets.length; i += swatchesPerPage) {
      out.push([...presets.slice(i, i + swatchesPerPage)]);
    }
    return out;
  }, [presets, swatchesPerPage]);

  const [carousel, setCarousel] = useState<{
    pageIndex: number;
    generatedPages: HexColorPreset[][];
  }>({ pageIndex: 0, generatedPages: [] });

  const allPages = useMemo(
    () => [...presetPages, ...carousel.generatedPages],
    [presetPages, carousel.generatedPages],
  );

  useEffect(() => {
    setCarousel({ pageIndex: 0, generatedPages: [] });
  }, [presets, swatchesPerPage]);

  useEffect(() => {
    setCarousel((c) => ({
      ...c,
      pageIndex:
        allPages.length === 0
          ? 0
          : Math.min(c.pageIndex, Math.max(0, allPages.length - 1)),
    }));
  }, [allPages.length]);

  useEffect(() => {
    const matchIdx = presets.findIndex(
      (p) => p.value.toUpperCase() === normalized.toUpperCase(),
    );
    if (matchIdx < 0) return;
    const page = Math.floor(matchIdx / swatchesPerPage);
    setCarousel({ pageIndex: page, generatedPages: [] });
  }, [normalized, presets, swatchesPerPage]);

  const onNativeColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      const upper = next.startsWith("#")
        ? next.toUpperCase()
        : `#${next}`.toUpperCase();
      const parsed = hexSixSchema.safeParse(upper);
      if (parsed.success) {
        onChange(parsed.data.toUpperCase());
      }
    },
    [onChange],
  );

  const goNext = useCallback(() => {
    setCarousel((c) => {
      const all = [...presetPages, ...c.generatedPages];
      const lastIdx = all.length - 1;
      if (c.pageIndex < lastIdx) {
        return { ...c, pageIndex: c.pageIndex + 1 };
      }
      const nextGen = [
        ...c.generatedPages,
        makeRandomPresetPage(swatchesPerPage),
      ];
      return { generatedPages: nextGen, pageIndex: c.pageIndex + 1 };
    });
  }, [presetPages, swatchesPerPage]);

  const goPrev = useCallback(() => {
    setCarousel((c) => ({
      ...c,
      pageIndex: Math.max(0, c.pageIndex - 1),
    }));
  }, []);

  const currentPresets = allPages[carousel.pageIndex] ?? [];

  return (
    <div className={cn("min-w-0", className)}>
      {presets.length > 0 ? (
        <div
          className={cn(
            "grid min-w-0 w-full grid-cols-1 gap-y-2",
            "sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-x-3 sm:gap-y-1.5",
          )}
        >
          <div
            className={cn(
              "border-border bg-default/35 supports-[backdrop-filter]:bg-default/25 col-start-1 row-start-1 flex w-fit shrink-0 items-center justify-center justify-self-start rounded-2xl border px-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] sm:col-start-1 sm:row-start-1",
              ROW_HEIGHT,
              "focus-within:ring-accent/25 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-[var(--background)]",
            )}
          >
            <label
              htmlFor={nativeInputId}
              className="border-border hover:bg-default/40 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border transition-colors"
            >
              <input
                id={nativeInputId}
                type="color"
                value={normalized}
                onChange={onNativeColorChange}
                aria-label={nativePickerAriaLabel}
                className="sr-only"
              />
              <span
                className="border-border size-8 shrink-0 rounded-lg border shadow-inner ring-2 ring-inset ring-black/15 dark:ring-white/20"
                style={{ backgroundColor: normalized }}
                aria-hidden
              />
            </label>
          </div>

          <div
            className="border-border col-start-1 row-start-2 flex min-w-0 flex-col rounded-2xl border border-dashed border-border/80 bg-default/15 px-2 py-2 sm:col-start-2 sm:row-start-1 sm:min-w-[min(100%,12rem)]"
            role="group"
            aria-label={presetsAriaLabel}
          >
            <div className="flex min-h-10 min-w-0 items-center gap-1">
              <Button
                isIconOnly
                size="sm"
                variant="tertiary"
                className="size-8 shrink-0 rounded-full"
                aria-label="Previous color page"
                isDisabled={carousel.pageIndex <= 0}
                onPress={goPrev}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </Button>
              <div
                ref={swatchTrackRef}
                className="flex min-h-10 min-w-0 flex-1 flex-nowrap items-center justify-center gap-1.5"
                role="group"
              >
                {currentPresets.map((preset, swatchIdx) => {
                  const isSelected =
                    preset.value.toUpperCase() === normalized.toUpperCase();
                  return (
                    <Button
                      key={`${carousel.pageIndex}-${swatchIdx}-${preset.value}`}
                      isIconOnly
                      size="sm"
                      variant="tertiary"
                      className={cn(swatchButtonClass)}
                      style={{ backgroundColor: preset.value }}
                      aria-label={`${preset.label}, ${preset.value}`}
                      aria-current={isSelected ? "true" : undefined}
                      onPress={() => onChange(preset.value.toUpperCase())}
                    >
                      <span className="sr-only">{preset.label}</span>
                    </Button>
                  );
                })}
              </div>
              <Button
                isIconOnly
                size="sm"
                variant="tertiary"
                className="size-8 shrink-0 rounded-full"
                aria-label="Next color page or generate new random colors"
                onPress={goNext}
              >
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>
          </div>

          {allPages.length > 1 ? (
            <nav
              className="col-start-1 row-start-3 flex max-w-full justify-center gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] sm:col-start-2 sm:row-start-2 [&::-webkit-scrollbar]:hidden"
              aria-label="Color preset pages"
            >
              {allPages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={cn(
                    "h-1.5 min-w-1.5 shrink-0 rounded-full transition-[width,background-color] duration-200 ease-out",
                    i === carousel.pageIndex
                      ? "bg-accent w-4"
                      : "bg-muted hover:bg-muted/80 w-1.5",
                  )}
                  aria-label={`Color page ${i + 1} of ${allPages.length}`}
                  aria-current={i === carousel.pageIndex ? "page" : undefined}
                  onClick={() => setCarousel((c) => ({ ...c, pageIndex: i }))}
                />
              ))}
            </nav>
          ) : null}
        </div>
      ) : (
        <div
          className={cn(
            "border-border bg-default/35 supports-[backdrop-filter]:bg-default/25 flex w-fit shrink-0 items-center justify-center rounded-2xl border px-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]",
            ROW_HEIGHT,
            "focus-within:ring-accent/25 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-[var(--background)]",
          )}
        >
          <label
            htmlFor={nativeInputId}
            className="border-border hover:bg-default/40 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border transition-colors"
          >
            <input
              id={nativeInputId}
              type="color"
              value={normalized}
              onChange={onNativeColorChange}
              aria-label={nativePickerAriaLabel}
              className="sr-only"
            />
            <span
              className="border-border size-8 shrink-0 rounded-lg border shadow-inner ring-2 ring-inset ring-black/15 dark:ring-white/20"
              style={{ backgroundColor: normalized }}
              aria-hidden
            />
          </label>
        </div>
      )}
    </div>
  );
}
