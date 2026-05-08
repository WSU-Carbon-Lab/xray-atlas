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
import type {
  NexafsBrowseDatasetMetricBarModel,
  NexafsBrowseDatasetMetricChannelModel,
  NexafsBrowseDatasetMetricsCardModel,
  NexafsDatasetMetricChannelKey,
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

const METRIC_BREAKDOWN_CHANNEL_INTRO: Record<NexafsDatasetMetricChannelKey, string> =
  {
    rawabs:
      "Uploaded absorption mu(E). Spacing uses energies where this trace is finite; SNR uses this amplitude; normalization fit compares values in declared pre/post windows to anchors 0 and 1 when ranges exist.",
    od:
      "Optical depth from monitor-normalized intensity. Same per-channel spacing, SNR, and edge-anchor fit semantics as other traces on this polarization.",
    massabsorption:
      "Mass absorption coefficient when stored. Each subscore is evaluated on this channel's finite samples and declared normalization windows.",
    beta:
      "Beta contrast when supplied alongside mu. Subscores use only points where beta is finite; edge-anchor fit applies when normalization ranges are stored.",
  };

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

function VercelStyleMetricBlock({ bar }: { bar: NexafsBrowseDatasetMetricBarModel }) {
  const scoreVal = bar.percent;
  const hasScore = typeof scoreVal === "number" && Number.isFinite(scoreVal);
  const scoreRounded = hasScore ? Math.round(scoreVal) : null;

  return (
    <div className="space-y-1 rounded-lg border border-zinc-700/60 bg-zinc-950/55 px-3 py-2.5">
      <div className="text-[11px] leading-tight font-medium text-zinc-400">
        {bar.label}
      </div>
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
      <TierSegmentedBar percent={bar.percent} tier={bar.tier} />
      <p className="pt-1 text-[10px] leading-snug text-zinc-400">{bar.summary}</p>
    </div>
  );
}

function ChannelDatasetMetricBreakdownBody({
  channel,
}: {
  channel: NexafsBrowseDatasetMetricChannelModel;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="border-b border-zinc-700/70 pb-3">
        <h3 className="text-sm font-semibold text-zinc-100">{channel.label}</h3>
        <p className="mt-1.5 text-[11px] leading-snug text-zinc-400">
          {METRIC_BREAKDOWN_CHANNEL_INTRO[channel.key]}
        </p>
      </div>
      <div className="space-y-2">
        {channel.bars.map((bar) => (
          <VercelStyleMetricBlock key={bar.key} bar={bar} />
        ))}
      </div>
    </div>
  );
}

function ChannelMetricHoverTrigger({
  channel,
}: {
  channel: NexafsBrowseDatasetMetricChannelModel;
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
    channel.aggregatePercent != null
      ? `${Math.round(channel.aggregatePercent)} / 100`
      : "metrics unavailable";

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={0}
        role="button"
        aria-label={`${channel.label} dataset metrics: ${scoreHint}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={cn(
          "focus-visible:ring-accent inline-flex h-9 w-9 shrink-0 cursor-default items-center justify-center rounded-full border outline-none transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-offset-2",
          channel.missing
            ? "border-zinc-500/45 bg-zinc-950/70"
            : "border-white/12 bg-zinc-950/55",
        )}
        title={`${channel.label}: ${scoreHint}`}
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
          percent={channel.aggregatePercent}
          tier={channel.aggregateTier}
          missing={channel.missing}
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
                <ChannelDatasetMetricBreakdownBody channel={channel} />
              </DatasetMetricTooltipSurface>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/**
 * Compact channel rail with portaled hover/focus tooltips (verification-badge pattern): full Speed Insights–style breakdown per channel.
 *
 * @param metrics Parsed browse payload including ordered channels and experiment aggregate percents.
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
      aria-label="Dataset metrics by channel"
    >
      {metrics.channels.map((channel) => (
        <ChannelMetricHoverTrigger key={channel.key} channel={channel} />
      ))}
    </div>
  );
}
