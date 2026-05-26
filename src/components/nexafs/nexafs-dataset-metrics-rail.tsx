"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { AlertCircle } from "lucide-react";
import { cn } from "@heroui/styles";
import { BookOpenIcon } from "@heroicons/react/24/outline";
import { AccentNavChip } from "@/components/ui/accent-nav-chip";
import {
  DATASET_QUALITY_MISSING_STATISTIC_PENALTY,
  type NexafsBrowseDatasetMetricBarModel,
  type NexafsBrowseDatasetMetricsCardModel,
} from "~/lib/nexafs-dataset-metric-display-model";
import type { DatasetMetricTier } from "~/lib/nexafs-dataset-metric-policy";
import {
  DATASET_METRIC_TIER_PERCENT_CUTOFFS,
  tierGaugeFgClass,
  tierRingStrokeClass,
  tierValueTextClass,
} from "~/lib/nexafs-dataset-metric-policy";

const METRIC_TOOLTIP_CLOSE_DELAY_MS = 100;
const METRIC_TOOLTIP_VERTICAL_OFFSET_PX = 8;

const TICK_FAIR = DATASET_METRIC_TIER_PERCENT_CUTOFFS.fairMinPercent;
const TICK_GOOD = DATASET_METRIC_TIER_PERCENT_CUTOFFS.goodMinPercent;
const TICK_EXCELLENT = DATASET_METRIC_TIER_PERCENT_CUTOFFS.excellentMinPercent;

const metricBreakdownTooltipOuterClassName =
  "relative flex max-h-[min(70vh,28rem)] w-[min(19rem,calc(100vw-2rem))] max-w-[min(19rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl ring-1 ring-[color-mix(in_oklab,var(--foreground)_8%,transparent)]";

const metricBreakdownTooltipScrollClassName =
  "metric-breakdown-tooltip-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 text-left text-xs leading-snug text-foreground";

const metricCardSurfaceClassName =
  "space-y-1 rounded-lg border border-border bg-default px-3 py-2.5";

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function gaugeFillClass(tier: DatasetMetricTier | "unknown"): string {
  if (tier === "unknown") return "bg-muted";
  return tierGaugeFgClass(tier);
}

function DatasetMetricTooltipSurface({
  arrowOffsetPx,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  arrowOffsetPx: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className={`pointer-events-auto ${metricBreakdownTooltipOuterClassName}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={metricBreakdownTooltipScrollClassName}>{children}</div>
      <div
        className="border-border bg-surface absolute top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-b transition-[left] duration-150 ease-out"
        style={{ left: `calc(50% + ${arrowOffsetPx}px)` }}
        aria-hidden
      />
    </div>
  );
}

function useDatasetMetricTooltipPosition(
  triggerRef: RefObject<HTMLElement | null>,
) {
  const [position, setPosition] = useState({ left: 0, top: 0 });

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el || typeof document === "undefined") return;
    const rect = el.getBoundingClientRect();
    setPosition({
      left: rect.left + rect.width / 2,
      top: rect.top - METRIC_TOOLTIP_VERTICAL_OFFSET_PX,
    });
  }, [triggerRef]);

  return { position, updatePosition };
}

/**
 * Circular 0–100 score ring: unfilled track plus arc length proportional to {@link percent}.
 */
function DatasetMetricScoreRing({
  percent,
  tier,
  missing,
  sizePx,
  strokePx,
  className,
}: {
  percent: number | null;
  tier: DatasetMetricTier | "unknown";
  missing: boolean;
  sizePx: number;
  strokePx: number;
  className?: string;
}) {
  const vb = 36;
  const c = vb / 2;
  const r = (vb - strokePx * 2) / 2 - 0.25;
  const circumference = 2 * Math.PI * r;
  const pct =
    missing || percent == null || !Number.isFinite(percent)
      ? 0
      : clampPercent(percent);
  const offset = circumference * (1 - pct / 100);
  const strokeClass =
    missing || percent == null ? "stroke-muted" : tierRingStrokeClass(tier);

  const centerLabel = missing
    ? null
    : percent != null && Number.isFinite(percent)
      ? Math.round(pct)
      : null;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: sizePx, height: sizePx }}
    >
      <svg
        width={sizePx}
        height={sizePx}
        viewBox={`0 0 ${vb} ${vb}`}
        className="block"
        aria-hidden={centerLabel != null}
      >
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          className="stroke-default/80"
          strokeWidth={strokePx}
        />
        {!missing && percent != null && Number.isFinite(percent) && pct > 0 ? (
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            className={cn(strokeClass, "transition-[stroke-dashoffset] duration-300")}
            strokeWidth={strokePx}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${c} ${c})`}
          />
        ) : null}
      </svg>
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {missing ? (
          <AlertCircle className="text-text-tertiary h-[42%] w-[42%]" aria-hidden />
        ) : centerLabel != null ? (
          <span
            className={cn(
              "text-foreground font-semibold tabular-nums leading-none tracking-tight",
              sizePx >= 44 ? "text-sm" : "text-[10px]",
            )}
          >
            {centerLabel}
          </span>
        ) : (
          <span className="text-text-tertiary text-[10px] font-medium">—</span>
        )}
      </span>
    </div>
  );
}

function TierSegmentedBar({
  percent,
  tier,
}: {
  percent: number | null;
  tier: DatasetMetricTier | "unknown";
}) {
  const w =
    percent != null && Number.isFinite(percent) ? clampPercent(percent) : 0;
  const hasValue = percent != null && Number.isFinite(percent);

  return (
    <div className="relative mt-2 h-2 w-full">
      <div
        className="border-border bg-muted/30 absolute inset-0 overflow-hidden rounded-full border"
        aria-hidden
      >
        <div className="absolute inset-0 flex opacity-90">
          <div
            className="h-full bg-rose-200/80 dark:bg-rose-950/50"
            style={{ width: `${TICK_FAIR}%` }}
          />
          <div
            className="h-full bg-amber-100/90 dark:bg-amber-950/35"
            style={{ width: `${TICK_GOOD - TICK_FAIR}%` }}
          />
          <div
            className="h-full bg-lime-100/85 dark:bg-lime-950/30"
            style={{ width: `${TICK_EXCELLENT - TICK_GOOD}%` }}
          />
          <div className="h-full flex-1 bg-emerald-100/80 dark:bg-emerald-950/35" />
        </div>
        <div
          className="bg-border-default/80 absolute top-0 bottom-0 z-[1] w-px"
          style={{ left: `${TICK_FAIR}%` }}
        />
        <div
          className="bg-border-default/80 absolute top-0 bottom-0 z-[1] w-px"
          style={{ left: `${TICK_GOOD}%` }}
        />
        <div
          className="bg-border-default/80 absolute top-0 bottom-0 z-[1] w-px"
          style={{ left: `${TICK_EXCELLENT}%` }}
        />
        {hasValue ? (
          <div
            className={cn(
              "absolute top-0 bottom-0 left-0 z-[2] rounded-l-full opacity-95",
              gaugeFillClass(tier),
            )}
            style={{ width: `${w}%` }}
          />
        ) : null}
        {hasValue ? (
          <div
            className="border-foreground/30 absolute top-0 bottom-0 z-[3] w-0.5 -translate-x-1/2 border-l border-dashed"
            style={{ left: `${w}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}

/** Neutral skeleton track for any unscored metric (no numeric headline on a 0–100 scale). */
function MissingMetricValueSkeleton() {
  return (
    <div
      className="bg-muted/50 ring-border relative mt-1 h-1.5 w-full overflow-hidden rounded-full ring-1"
      aria-hidden
    >
      <div className="absolute inset-y-0 right-0 flex w-[30%] items-stretch justify-end gap-px py-px pr-px opacity-[0.72]">
        <div className="bg-muted h-full min-w-[7px] shrink-0 rounded-[2px]" />
        <div className="bg-muted/80 h-full min-w-[5px] shrink-0 rounded-[2px]" />
        <div className="bg-muted/60 h-full min-w-[4px] shrink-0 rounded-[2px]" />
      </div>
    </div>
  );
}

function MissingDatasetMetricPlaceholder({
  bar,
}: {
  bar: NexafsBrowseDatasetMetricBarModel;
}) {
  return (
    <div className={metricCardSurfaceClassName}>
      <div className="text-muted text-[11px] leading-tight font-medium">{bar.label}</div>
      <p className="text-warning text-[10px] font-medium leading-snug">{bar.summary}</p>
      <div className="pt-0.5">
        <span className="text-muted text-xl leading-none font-semibold tabular-nums tracking-tight sm:text-2xl">
          —
        </span>
      </div>
      <MissingMetricValueSkeleton />
    </div>
  );
}

function ResolutionDistributionTrace({
  distribution,
}: {
  distribution: NonNullable<NexafsBrowseDatasetMetricBarModel["distribution"]>;
}) {
  const [activeBucket, setActiveBucket] = useState<
    "hyperfine" | "good" | "fair" | "poor" | null
  >(null);
  const total =
    distribution.hyperfinePercent +
    distribution.goodPercent +
    distribution.fairPercent +
    distribution.poorPercent;
  const norm =
    total > 0
      ? {
          hyperfine: (distribution.hyperfinePercent / total) * 100,
          good: (distribution.goodPercent / total) * 100,
          fair: (distribution.fairPercent / total) * 100,
          poor: (distribution.poorPercent / total) * 100,
        }
      : null;

  const bucketDetails: Record<
    "hyperfine" | "good" | "fair" | "poor",
    { label: string; percent: number; description: string }
  > = {
    hyperfine: {
      label: "Great",
      percent: distribution.hyperfinePercent,
      description: "Spacing below 0.1 eV.",
    },
    good: {
      label: "Good",
      percent: distribution.goodPercent,
      description: "Spacing from 0.1 to 1 eV.",
    },
    fair: {
      label: "OK",
      percent: distribution.fairPercent,
      description: "Spacing from 1 to 5 eV.",
    },
    poor: {
      label: "Bad",
      percent: distribution.poorPercent,
      description: "Spacing above 5 eV.",
    },
  };

  const p75Bucket: "hyperfine" | "good" | "fair" | "poor" | null =
    distribution.p75DeltaEv == null
      ? null
      : distribution.p75DeltaEv < 0.1
        ? "hyperfine"
        : distribution.p75DeltaEv < 1
          ? "good"
          : distribution.p75DeltaEv <= 5
            ? "fair"
            : "poor";
  const focusBucket = activeBucket ?? p75Bucket;
  const heroColorClass =
    p75Bucket === "hyperfine"
      ? "text-sky-600 dark:text-sky-300"
      : p75Bucket === "good"
        ? "text-emerald-600 dark:text-emerald-300"
        : p75Bucket === "fair"
          ? "text-amber-600 dark:text-amber-300"
          : p75Bucket === "poor"
            ? "text-foreground"
            : "text-foreground";
  const p75MarkerColorClass =
    p75Bucket === "hyperfine"
      ? "border-sky-500 dark:border-sky-300"
      : p75Bucket === "good"
        ? "border-emerald-500 dark:border-emerald-300"
        : p75Bucket === "fair"
          ? "border-amber-500 dark:border-amber-300"
          : p75Bucket === "poor"
            ? "border-rose-500 dark:border-rose-400"
            : "border-border";

  if (!norm) {
    return (
      <div className="border-border bg-muted/40 mt-2 h-2 w-full rounded-full border" />
    );
  }

  return (
    <div className="relative mt-2">
      <div className="mb-1.5 flex items-center justify-start">
        <span className={cn("text-xl leading-none font-semibold tabular-nums", heroColorClass)}>
          {distribution.p75DeltaEv != null
            ? `${distribution.p75DeltaEv.toFixed(3)} eV`
            : "—"}
        </span>
      </div>
      <div className="relative h-2 w-full">
        <div className="border-border bg-muted/30 absolute inset-0 overflow-hidden rounded-full border">
          <div className="absolute inset-0 flex">
            <button
              type="button"
              className={cn(
                "h-full transition-colors",
                focusBucket === "hyperfine"
                  ? "bg-sky-400/90 dark:bg-sky-400/88"
                  : "bg-sky-400/45 dark:bg-sky-400/40",
              )}
              style={{ width: `${norm.hyperfine}%` }}
              onMouseEnter={() => setActiveBucket("hyperfine")}
              onMouseLeave={() => setActiveBucket(null)}
              onFocus={() => setActiveBucket("hyperfine")}
              onBlur={() => setActiveBucket(null)}
              aria-label={`Hyperfine resolution ${distribution.hyperfinePercent.toFixed(1)} percent`}
            />
            <button
              type="button"
              className={cn(
                "h-full transition-colors",
                focusBucket === "good"
                  ? "bg-emerald-400/88 dark:bg-emerald-400/84"
                  : "bg-emerald-400/42 dark:bg-emerald-400/38",
              )}
              style={{ width: `${norm.good}%` }}
              onMouseEnter={() => setActiveBucket("good")}
              onMouseLeave={() => setActiveBucket(null)}
              onFocus={() => setActiveBucket("good")}
              onBlur={() => setActiveBucket(null)}
              aria-label={`Good resolution ${distribution.goodPercent.toFixed(1)} percent`}
            />
            <button
              type="button"
              className={cn(
                "h-full transition-colors",
                focusBucket === "fair"
                  ? "bg-amber-400/90 dark:bg-amber-400/86"
                  : "bg-amber-400/45 dark:bg-amber-400/40",
              )}
              style={{ width: `${norm.fair}%` }}
              onMouseEnter={() => setActiveBucket("fair")}
              onMouseLeave={() => setActiveBucket(null)}
              onFocus={() => setActiveBucket("fair")}
              onBlur={() => setActiveBucket(null)}
              aria-label={`Fair resolution ${distribution.fairPercent.toFixed(1)} percent`}
            />
            <button
              type="button"
              className={cn(
                "h-full transition-colors",
                focusBucket === "poor"
                  ? "bg-rose-500/90 dark:bg-rose-500/86"
                  : "bg-rose-500/48 dark:bg-rose-500/42",
              )}
              style={{ width: `${norm.poor}%` }}
              onMouseEnter={() => setActiveBucket("poor")}
              onMouseLeave={() => setActiveBucket(null)}
              onFocus={() => setActiveBucket("poor")}
              onBlur={() => setActiveBucket(null)}
              aria-label={`Poor resolution ${distribution.poorPercent.toFixed(1)} percent`}
            />
          </div>
        </div>
        {distribution.p75MarkerPercent != null ? (
          <div
            className={cn(
              "pointer-events-none absolute top-1/2 z-[3] h-5 w-[2px] -translate-x-1/2 -translate-y-1/2 border-l shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_20%,transparent)]",
              p75MarkerColorClass,
            )}
            style={{ left: `${clampPercent(distribution.p75MarkerPercent)}%` }}
            title={distribution.p75MarkerLabel}
            aria-label={distribution.p75MarkerLabel}
          />
        ) : null}
      </div>
      {activeBucket ? (
        <div className="border-border bg-surface text-muted pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-lg border px-2.5 py-2 text-[10px] leading-snug shadow-lg">
          <div className="text-foreground font-semibold">
            {bucketDetails[activeBucket].percent.toFixed(1)}% of points are in{" "}
            {bucketDetails[activeBucket].label.toLowerCase()} resolution
          </div>
          <div className="mt-1">
            {bucketDetails[activeBucket].description}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VercelStyleMetricBlock({ bar }: { bar: NexafsBrowseDatasetMetricBarModel }) {
  const scoreVal = bar.percent;
  const hasScore = typeof scoreVal === "number" && Number.isFinite(scoreVal);
  const scoreRounded = hasScore ? Math.round(scoreVal) : null;
  const isResolutionDistribution = bar.key === "resolution_distribution";
  const isMissingMetricPlaceholder =
    !hasScore &&
    (bar.key === "resolution_distribution" || bar.key === "snr");

  if (isMissingMetricPlaceholder) {
    return <MissingDatasetMetricPlaceholder bar={bar} />;
  }

  return (
    <div className={metricCardSurfaceClassName}>
      <div className="text-muted text-[11px] leading-tight font-medium">
        {bar.label}
      </div>
      {!isResolutionDistribution ? (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span
            className={cn(
              "text-foreground text-xl leading-none font-semibold tabular-nums tracking-tight sm:text-2xl",
              hasScore ? tierValueTextClass(bar.tier) : "text-muted",
            )}
          >
            {scoreRounded ?? "—"}
          </span>
          <span className="text-muted text-xs tabular-nums">/ 100</span>
          {bar.quantityValue !== "—" ? (
            <span className="text-muted ml-auto text-[11px] tabular-nums">
              <span className="text-foreground font-medium">{bar.quantityValue}</span>
              {bar.quantityUnit ? (
                <span> {bar.quantityUnit}</span>
              ) : null}
            </span>
          ) : null}
        </div>
      ) : null}
      {bar.distribution ? (
        <ResolutionDistributionTrace distribution={bar.distribution} />
      ) : (
        <TierSegmentedBar percent={bar.percent} tier={bar.tier} />
      )}
      {!isResolutionDistribution ? (
        <p className="text-muted pt-1 text-[10px] leading-snug">{bar.summary}</p>
      ) : null}
    </div>
  );
}

function DatasetQualityWikiChip() {
  return (
    <AccentNavChip
      href="/wiki/platform-features/dataset-quality-metrics"
      label="Dataset quality metrics guide"
      icon={BookOpenIcon}
      size="sm"
      linkClassName="focus-visible:ring-offset-background mt-2"
      onClick={(event) => event.stopPropagation()}
    />
  );
}

function ChannelDatasetMetricBreakdownBody({
  metrics,
}: {
  metrics: NexafsBrowseDatasetMetricsCardModel;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="border-border border-b pb-3">
        <h3 className="text-foreground text-sm font-semibold">Dataset quality</h3>
        <p className="text-muted mt-1.5 text-[11px] leading-snug">
          The ring averages energy resolution and SNR subscores that are available, then subtracts{" "}
          {DATASET_QUALITY_MISSING_STATISTIC_PENALTY} when SNR is not scored (for example, no error bars on the upload).
          Normalization fit sections are in development and do not affect the headline score.
        </p>
        <DatasetQualityWikiChip />
      </div>
      <div className="space-y-2">
        {metrics.bars.map((bar) => (
          <VercelStyleMetricBlock key={bar.key} bar={bar} />
        ))}
        <p className="text-muted text-[10px] font-medium leading-snug">
          More coming soon...
        </p>
      </div>
    </div>
  );
}

function ChannelMetricHoverTrigger({
  metrics,
}: {
  metrics: NexafsBrowseDatasetMetricsCardModel;
}) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { position, updatePosition } = useDatasetMetricTooltipPosition(triggerRef);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openTooltip = useCallback(() => {
    updatePosition();
    clearCloseTimer();
    setIsOpen(true);
  }, [clearCloseTimer, updatePosition]);

  const scheduleCloseTooltip = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, METRIC_TOOLTIP_CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = () => {
      updatePosition();
    };
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [isOpen, updatePosition]);

  const scoreHint =
    metrics.aggregatePercent != null
      ? `${Math.round(metrics.aggregatePercent)} / 100`
      : "metrics unavailable";

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={0}
        role="button"
        aria-label={`Dataset metrics: ${scoreHint}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={cn(
          "focus-visible:ring-accent focus-visible:ring-offset-background border-border bg-surface inline-flex h-9 w-9 shrink-0 cursor-default items-center justify-center rounded-full border shadow-sm outline-none transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-offset-2",
          metrics.missing && "bg-muted/40",
        )}
        title={`Dataset quality: ${scoreHint}`}
        onMouseEnter={openTooltip}
        onMouseLeave={scheduleCloseTooltip}
        onFocus={openTooltip}
        onBlur={scheduleCloseTooltip}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            clearCloseTimer();
            setIsOpen(false);
          }
        }}
      >
        <DatasetMetricScoreRing
          percent={metrics.aggregatePercent}
          tier={metrics.aggregateTier}
          missing={metrics.missing}
          sizePx={30}
          strokePx={2.75}
        />
      </span>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="z-max pointer-events-none fixed isolate -translate-x-1/2 -translate-y-full"
              style={{ left: position.left, top: position.top }}
            >
              <DatasetMetricTooltipSurface
                arrowOffsetPx={0}
                onMouseEnter={openTooltip}
                onMouseLeave={scheduleCloseTooltip}
              >
                <ChannelDatasetMetricBreakdownBody metrics={metrics} />
              </DatasetMetricTooltipSurface>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/**
 * Single-score dataset ring with portaled hover/focus tooltip for detailed metric subscores.
 *
 * @param metrics Parsed browse payload including consolidated aggregate and detailed metric bars.
 */
export function NexafsDatasetMetricsRail({
  metrics,
  className,
}: {
  metrics: NexafsBrowseDatasetMetricsCardModel;
  className?: string;
}) {
  return (
    <div
      className={cn("flex shrink-0 items-center gap-1", className)}
      onClick={(e) => e.stopPropagation()}
      aria-label="Dataset quality metrics"
    >
      <ChannelMetricHoverTrigger metrics={metrics} />
    </div>
  );
}
