/**
 * Interactive population-share bar: discrete tiers as focusable segments with live detail text.
 */

"use client";

import {
  useCallback,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import { cn } from "@heroui/styles";

export type MetricTierSegmentVariant = "hyperfine" | "good" | "fair" | "coarse";

export type MetricTierSegmentSpec = {
  readonly id: string;
  readonly label: string;
  /** Population share on `[0, 100]`; all segments should sum to `100`. */
  readonly percent: number;
  /** Spacing range description shown in the detail line (units as appropriate). */
  readonly rangeDescription: string;
  readonly variant: MetricTierSegmentVariant;
};

export type MetricTierSegmentedBarMarker = {
  /** Horizontal position along the bar track as percent from the left `[0, 100]`. */
  readonly percentAlongBar: number;
  /** Accessible name for the marker (for example P75 label text). */
  readonly ariaLabel: string;
};

export type MetricTierSegmentedBarProps = {
  readonly segments: readonly MetricTierSegmentSpec[];
  readonly className?: string;
  readonly barHeightClassName?: string;
  /** Optional vertical marker (for example P75) plotted on the share scale. */
  readonly marker?: MetricTierSegmentedBarMarker;
  /** Stable label for the chart summary exposed to assistive technologies. */
  readonly "aria-label": string;
};

const VARIANT_BUTTON_BASE: Record<
  MetricTierSegmentVariant,
  readonly [string, string]
> = {
  hyperfine: [
    "bg-emerald-400/68 dark:bg-emerald-400/58",
    "bg-emerald-400/92 dark:bg-emerald-400/88",
  ],
  good: [
    "bg-lime-400/62 dark:bg-lime-400/52",
    "bg-lime-400/88 dark:bg-lime-400/84",
  ],
  fair: [
    "bg-amber-400/65 dark:bg-amber-400/55",
    "bg-amber-400/90 dark:bg-amber-400/86",
  ],
  coarse: [
    "bg-rose-500/68 dark:bg-rose-500/58",
    "bg-rose-500/90 dark:bg-rose-500/86",
  ],
};

const VARIANT_MARKER_RING: Record<MetricTierSegmentVariant, string> = {
  hyperfine: "border-emerald-400 dark:border-emerald-300",
  good: "border-lime-400 dark:border-lime-300",
  fair: "border-amber-400 dark:border-amber-300",
  coarse: "border-rose-400 dark:border-rose-300",
};

function segmentVariantFromMarkerPercent(
  segments: readonly MetricTierSegmentSpec[],
  markerPercent: number,
): MetricTierSegmentVariant | null {
  let acc = 0;
  for (const seg of segments) {
    const w = Math.max(0, seg.percent);
    const next = acc + w;
    if (markerPercent <= next + 1e-9) {
      return seg.variant;
    }
    acc = next;
  }
  return segments.length > 0
    ? segments[segments.length - 1]!.variant
    : null;
}

/**
 * Renders a horizontal bar divided into population-share segments. Each segment is a button with hover and focus
 * affordances; the active segment shows a detail line beneath the track. Segments must sum to approximately `100`
 * percent; values are normalized when their total differs slightly from `100` for display only.
 *
 * @param segments Tier definitions including display shares and spacing-range copy.
 * @param marker Optional percentile-style marker plotted at `percentAlongBar` along the filled bar width.
 * @param aria-label Concise summary of the visualization for screen readers.
 */
export function MetricTierSegmentedBar({
  segments,
  className,
  barHeightClassName = "h-2.5",
  marker,
  "aria-label": ariaLabel,
}: MetricTierSegmentedBarProps) {
  const detailId = useId();
  const [activeId, setActiveId] = useState<string | null>(null);

  const normalized = useMemo(() => {
    const raw = segments.map((s) => ({
      ...s,
      widthFrac:
        Number.isFinite(s.percent) && s.percent >= 0 ? s.percent : 0,
    }));
    const total = raw.reduce((a, s) => a + s.widthFrac, 0);
    if (total <= 0) return raw.map((s) => ({ ...s, widthPct: 0 }));
    const scale = 100 / total;
    return raw.map((s) => ({
      ...s,
      widthPct: s.widthFrac * scale,
    }));
  }, [segments]);

  const activeSegment = useMemo(() => {
    if (!activeId) return null;
    return normalized.find((s) => s.id === activeId) ?? null;
  }, [activeId, normalized]);

  const markerVariant =
    marker != null
      ? segmentVariantFromMarkerPercent(segments, marker.percentAlongBar)
      : null;
  const markerRingClass =
    markerVariant != null ? VARIANT_MARKER_RING[markerVariant] : "border-border";

  const onKeyNav = useCallback(
    (e: KeyboardEvent, index: number) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const next = (index + dir + normalized.length) % normalized.length;
      const el = document.getElementById(`metric-tier-seg-${normalized[next]!.id}`);
      el?.focus();
    },
    [normalized],
  );

  const totalWidth = normalized.reduce((a, s) => a + s.widthPct, 0);

  if (normalized.length === 0 || totalWidth <= 0) {
    return (
      <div
        className={cn(
          "border-border bg-muted/40 w-full rounded-full border",
          barHeightClassName,
          className,
        )}
        role="img"
        aria-label={ariaLabel}
      />
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        className="relative"
        role="group"
        aria-label={ariaLabel}
        aria-describedby={detailId}
      >
        <div
          className={cn(
            "border-border bg-muted/30 relative w-full overflow-hidden rounded-full border",
            barHeightClassName,
          )}
        >
          <div className="absolute inset-0 flex">
            {normalized.map((seg, index) => {
              const [mutedCls, emphasisCls] = VARIANT_BUTTON_BASE[seg.variant];
              const isActive = activeId === seg.id;
              return (
                <button
                  key={seg.id}
                  id={`metric-tier-seg-${seg.id}`}
                  type="button"
                  style={{ width: `${seg.widthPct}%` }}
                  className={cn(
                    "focus-visible:ring-accent h-full min-w-0 transition-colors focus:outline-none focus-visible:z-[2] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    isActive ? emphasisCls : mutedCls,
                  )}
                  aria-label={`${seg.label}, ${seg.percent.toFixed(0)} percent of population, ${seg.rangeDescription}`}
                  onMouseEnter={() => setActiveId(seg.id)}
                  onMouseLeave={() => setActiveId(null)}
                  onFocus={() => setActiveId(seg.id)}
                  onBlur={() => setActiveId(null)}
                  onKeyDown={(e) => onKeyNav(e, index)}
                />
              );
            })}
          </div>
          {marker != null ? (
            <div
              className={cn(
                "pointer-events-none absolute top-1/2 z-[3] h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 border-l-2",
                markerRingClass,
              )}
              style={{
                left: `${Math.min(100, Math.max(0, marker.percentAlongBar))}%`,
              }}
              role="img"
              aria-label={marker.ariaLabel}
            />
          ) : null}
        </div>
      </div>
      <p id={detailId} className="text-muted mt-2 min-h-[2.5rem] text-xs leading-snug">
        {activeSegment ? (
          <>
            <span className="text-foreground font-semibold tabular-nums">
              {activeSegment.percent.toFixed(0)}%
            </span>
            {" "}
            <span className="text-foreground font-medium">{activeSegment.label}</span>
            {" "}
            <span className="text-muted">({activeSegment.rangeDescription})</span>
          </>
        ) : (
          <span>
            Hover or focus a segment for share and spacing range. Tab and arrow keys move between segments.
          </span>
        )}
      </p>
    </div>
  );
}
