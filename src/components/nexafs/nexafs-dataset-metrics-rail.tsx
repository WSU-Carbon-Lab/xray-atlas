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
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Chip } from "@heroui/react";
import { cn } from "@heroui/styles";
import { BookOpenIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import type {
  NexafsBrowseDatasetMetricBarModel,
  NexafsBrowseDatasetMetricsCardModel,
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

const NORMALIZATION_FIT_WIP_COPY =
  "More metrics coming soon. Normalization fit metrics remain under active development.";

function isNormalizationFitMetricKey(
  key: NexafsBrowseDatasetMetricBarModel["key"],
): boolean {
  return key === "norm_distance_od" || key === "norm_distance_mass";
}

const TICK_FAIR = DATASET_METRIC_TIER_PERCENT_CUTOFFS.fairMinPercent;
const TICK_GOOD = DATASET_METRIC_TIER_PERCENT_CUTOFFS.goodMinPercent;
const TICK_EXCELLENT = DATASET_METRIC_TIER_PERCENT_CUTOFFS.excellentMinPercent;

const metricBreakdownTooltipOuterClassName =
  "relative flex max-h-[min(70vh,28rem)] w-[min(19rem,calc(100vw-2rem))] max-w-[min(19rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-950 shadow-2xl ring-1 ring-black/25 backdrop-blur-sm";

const metricBreakdownTooltipScrollClassName =
  "metric-breakdown-tooltip-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 text-left text-xs leading-snug text-zinc-100";

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function gaugeFillClass(tier: DatasetMetricTier | "unknown"): string {
  if (tier === "unknown") return "bg-zinc-500";
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
        className="absolute top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-b border-zinc-700/80 bg-zinc-950 transition-[left] duration-150 ease-out"
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
    missing || percent == null ? "stroke-zinc-600" : tierRingStrokeClass(tier);

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
          className="stroke-zinc-700/90"
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
              "font-semibold tabular-nums leading-none tracking-tight text-zinc-100",
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
        className="border-border-default absolute inset-0 overflow-hidden rounded-full border bg-zinc-900/80"
        aria-hidden
      >
        <div className="absolute inset-0 flex opacity-80">
          <div
            className="h-full bg-rose-950/50"
            style={{ width: `${TICK_FAIR}%` }}
          />
          <div
            className="h-full bg-amber-950/35"
            style={{ width: `${TICK_GOOD - TICK_FAIR}%` }}
          />
          <div
            className="h-full bg-lime-950/30"
            style={{ width: `${TICK_EXCELLENT - TICK_GOOD}%` }}
          />
          <div className="h-full flex-1 bg-emerald-950/35" />
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
            className="border-border-default absolute top-0 bottom-0 z-[3] w-0.5 -translate-x-1/2 border-l border-dashed border-white/35"
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
      className="relative mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/95 ring-1 ring-zinc-700/45"
      aria-hidden
    >
      <div className="absolute inset-y-0 right-0 flex w-[30%] items-stretch justify-end gap-px py-px pr-px opacity-[0.72]">
        <div className="h-full min-w-[7px] shrink-0 rounded-[2px] bg-zinc-600/95" />
        <div className="h-full min-w-[5px] shrink-0 rounded-[2px] bg-zinc-600/80" />
        <div className="h-full min-w-[4px] shrink-0 rounded-[2px] bg-zinc-500/70" />
      </div>
    </div>
  );
}

function MissingDatasetMetricPlaceholder({
  bar,
}: {
  bar: NexafsBrowseDatasetMetricBarModel;
}) {
  const showNormFitWip = isNormalizationFitMetricKey(bar.key);
  return (
    <div className="space-y-1 rounded-lg border border-zinc-700/60 bg-zinc-950/55 px-3 py-2.5">
      <div className="text-[11px] leading-tight font-medium text-zinc-400">{bar.label}</div>
      {showNormFitWip ? (
        <p className="text-[10px] font-medium leading-snug text-zinc-400">
          {NORMALIZATION_FIT_WIP_COPY}
        </p>
      ) : null}
      <p className="text-[10px] font-medium leading-snug text-amber-500">{bar.summary}</p>
      <div className="pt-0.5">
        <span className="text-xl leading-none font-semibold tabular-nums tracking-tight text-zinc-500 sm:text-2xl">
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
      ? "text-sky-300"
      : p75Bucket === "good"
        ? "text-emerald-300"
        : p75Bucket === "fair"
          ? "text-amber-300"
          : p75Bucket === "poor"
            ? "text-zinc-200"
            : "text-zinc-100";
  const p75MarkerColorClass =
    p75Bucket === "hyperfine"
      ? "border-sky-300"
      : p75Bucket === "good"
        ? "border-emerald-300"
        : p75Bucket === "fair"
          ? "border-amber-300"
          : p75Bucket === "poor"
            ? "border-rose-400"
            : "border-zinc-300";

  if (!norm) {
    return (
      <div className="mt-2 h-2 w-full rounded-full border border-zinc-700/80 bg-zinc-900/80" />
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
        <div className="absolute inset-0 overflow-hidden rounded-full border border-zinc-700/80 bg-zinc-900/80">
          <div className="absolute inset-0 flex">
            <button
              type="button"
              className={cn(
                "h-full transition-colors",
                focusBucket === "hyperfine"
                  ? "bg-sky-400/90"
                  : "bg-zinc-700/35",
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
                  ? "bg-emerald-400/85"
                  : "bg-zinc-700/35",
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
                  ? "bg-amber-400/90"
                  : "bg-zinc-700/35",
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
                  ? "bg-rose-500/90"
                  : "bg-zinc-800/45",
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
              "pointer-events-none absolute top-1/2 z-[3] h-5 w-[2px] -translate-x-1/2 -translate-y-1/2 border-l shadow-[0_0_0_1px_rgba(0,0,0,0.35)]",
              p75MarkerColorClass,
            )}
            style={{ left: `${clampPercent(distribution.p75MarkerPercent)}%` }}
            title={distribution.p75MarkerLabel}
            aria-label={distribution.p75MarkerLabel}
          />
        ) : null}
      </div>
      {activeBucket ? (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-lg border border-zinc-700/80 bg-zinc-950/95 px-2.5 py-2 text-[10px] leading-snug text-zinc-200 shadow-2xl">
          <div className="font-semibold text-zinc-100">
            {bucketDetails[activeBucket].percent.toFixed(1)}% of points are in{" "}
            {bucketDetails[activeBucket].label.toLowerCase()} resolution
          </div>
          <div className="mt-1 text-zinc-400">
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
    (bar.key === "resolution_distribution" ||
      bar.key === "snr" ||
      bar.key === "norm_distance_od" ||
      bar.key === "norm_distance_mass");
  const showNormFitWip = isNormalizationFitMetricKey(bar.key);

  if (isMissingMetricPlaceholder) {
    return <MissingDatasetMetricPlaceholder bar={bar} />;
  }

  return (
    <div className="space-y-1 rounded-lg border border-zinc-700/60 bg-zinc-950/55 px-3 py-2.5">
      <div className="text-[11px] leading-tight font-medium text-zinc-400">
        {bar.label}
      </div>
      {showNormFitWip ? (
        <p className="text-[10px] font-medium leading-snug text-zinc-400">
          {NORMALIZATION_FIT_WIP_COPY}
        </p>
      ) : null}
      {!isResolutionDistribution ? (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span
            className={cn(
              "text-xl leading-none font-semibold tabular-nums tracking-tight text-zinc-100 sm:text-2xl",
              hasScore ? tierValueTextClass(bar.tier) : "text-zinc-500",
            )}
          >
            {scoreRounded ?? "—"}
          </span>
          <span className="text-xs tabular-nums text-zinc-500">/ 100</span>
          {bar.quantityValue !== "—" ? (
            <span className="ml-auto text-[11px] tabular-nums text-zinc-500">
              <span className="font-medium text-zinc-300">{bar.quantityValue}</span>
              {bar.quantityUnit ? (
                <span className="text-zinc-500"> {bar.quantityUnit}</span>
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
        <p className="pt-1 text-[10px] leading-snug text-zinc-400">{bar.summary}</p>
      ) : null}
    </div>
  );
}

function DatasetQualityWikiChip() {
  return (
    <Link
      href="/wiki/platform-features/dataset-quality-metrics"
      className="focus-visible:ring-accent mt-2 inline-flex max-w-full rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      onClick={(e) => e.stopPropagation()}
    >
      <Chip
        variant="soft"
        color="accent"
        size="sm"
        className={cn(
          "max-w-full cursor-pointer shadow-sm backdrop-blur-sm transition-opacity hover:opacity-90",
          "dark:border dark:border-accent/55 dark:bg-accent/28 dark:shadow-md dark:backdrop-blur-none",
        )}
      >
        <BookOpenIcon
          className="size-3.5 shrink-0 text-accent dark:text-accent-foreground"
          aria-hidden
        />
        <Chip.Label
          className={cn(
            "min-w-0 text-balance text-[11px] font-medium leading-tight",
            "text-accent dark:text-accent-foreground",
          )}
        >
          Dataset quality metrics guide
        </Chip.Label>
        <ChevronRightIcon
          className="size-3.5 shrink-0 text-accent opacity-75 dark:text-accent-foreground dark:opacity-90"
          aria-hidden
        />
      </Chip>
    </Link>
  );
}

function ChannelDatasetMetricBreakdownBody({
  metrics,
}: {
  metrics: NexafsBrowseDatasetMetricsCardModel;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="border-b border-zinc-700/70 pb-3">
        <h3 className="text-sm font-semibold text-zinc-100">Dataset quality</h3>
        <DatasetQualityWikiChip />
      </div>
      <div className="space-y-2">
        {metrics.bars.map((bar) => (
          <VercelStyleMetricBlock key={bar.key} bar={bar} />
        ))}
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
          "focus-visible:ring-accent inline-flex h-9 w-9 shrink-0 cursor-default items-center justify-center rounded-full border outline-none transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-offset-2",
          metrics.missing
            ? "border-zinc-500/45 bg-zinc-950/70"
            : "border-white/12 bg-zinc-950/55",
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
