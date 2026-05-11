/**
 * SVG ring gauge for 0–100 style scores with optional center label.
 */

import { cn } from "@heroui/styles";

export type MetricPercentGaugeRingProps = {
  /** Fill amount on `[0, 100]`; non-finite values render as empty track with dash label. */
  readonly percent: number | null;
  readonly missing?: boolean;
  readonly sizePx?: number;
  readonly strokePx?: number;
  readonly strokeClassName?: string;
  readonly trackClassName?: string;
  readonly className?: string;
  /** When set, the outer wrapper exposes `role="img"` for assistive technologies. */
  readonly ariaLabel?: string;
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/**
 * Renders a circular progress ring with rounded stroke caps and an optional centered numeric label.
 *
 * @param percent Arc length proportional to `percent` when finite; `missing` forces the absent state.
 * @param strokeClassName Tailwind stroke class for the filled arc (defaults to accent stroke).
 * @param trackClassName Tailwind stroke class for the background circle.
 */
export function MetricPercentGaugeRing({
  percent,
  missing = false,
  sizePx = 44,
  strokePx = 3,
  strokeClassName = "stroke-accent",
  trackClassName = "stroke-default/80",
  className,
  ariaLabel,
}: MetricPercentGaugeRingProps) {
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
    missing || percent == null || !Number.isFinite(percent)
      ? "stroke-muted"
      : strokeClassName;

  const centerLabel =
    missing || percent == null || !Number.isFinite(percent)
      ? null
      : Math.round(pct);

  const decorativeHidden = Boolean(ariaLabel);

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: sizePx, height: sizePx }}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
    >
      <svg
        width={sizePx}
        height={sizePx}
        viewBox={`0 0 ${vb} ${vb}`}
        className="block"
        aria-hidden={decorativeHidden || centerLabel != null}
      >
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          className={trackClassName}
          strokeWidth={strokePx}
        />
        {!missing && percent != null && Number.isFinite(percent) && pct > 0 ? (
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            className={cn(
              strokeClass,
              "transition-[stroke-dashoffset] duration-300",
            )}
            strokeWidth={strokePx}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${c} ${c})`}
          />
        ) : null}
      </svg>
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden={decorativeHidden || undefined}
      >
        {centerLabel != null ? (
          <span
            className={cn(
              "text-foreground font-semibold tabular-nums leading-none tracking-tight",
              sizePx >= 44 ? "text-sm" : "text-[10px]",
            )}
          >
            {centerLabel}
          </span>
        ) : (
          <span className="text-muted text-[10px] font-medium">—</span>
        )}
      </span>
    </div>
  );
}
