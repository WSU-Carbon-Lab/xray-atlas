"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from "react";
import { NORMALIZATION_COLORS } from "~/components/plots/constants";
import { SPECTRUM_PAD } from "../snapshot/svg-paths";
import type {
  HomeSnapshotSpectrum,
  HomeSpectrumBand,
  HomeSpectrumMarker,
  HomeSpectrumTab,
  HomeSpectrumTrace,
} from "../snapshot/types";
import { polarizationRampColor } from "./polarization-ramp";

const AXIS = "var(--chart-axis)";
const GRID = "var(--chart-grid)";
const PLOT = "var(--chart-plot)";
const TEXT = "var(--chart-text)";
const TEXT_SECONDARY = "var(--chart-text-secondary)";
const SANS = "var(--font-sans), Inter, system-ui, sans-serif";
const TICK = 5;

/**
 * One y-tick label. `exponent` draws a power of ten instead of `e` notation.
 * A label of `10` is the decade. Any other mantissa is `m × 10` to that power.
 */
function YTickLabel({
  label,
  exponent,
}: {
  label: string;
  exponent?: number;
}): ReactElement {
  if (exponent == null) return <>{label}</>;
  const power = (
    <tspan fontSize="10px" dy="-7">
      {String(exponent)}
    </tspan>
  );
  if (label === "10") return <>10{power}</>;
  return (
    <>
      {label}
      <tspan fontSize="12px"> × 10</tspan>
      {power}
    </>
  );
}

interface Slot {
  w: number;
  h: number;
}

function stroke(t: HomeSpectrumTrace): string {
  if (t.tone === "primary") return "var(--accent)";
  if (t.tone === "muted")
    return "color-mix(in oklab, var(--foreground) 45%, transparent)";
  return polarizationRampColor(t.tone.ramp);
}

/** Pixel size of `ref`. The first paint uses `fallback` so server and client markup match. */
function useSlot(ref: RefObject<HTMLDivElement | null>, fallback: Slot): Slot {
  const [slot, setSlot] = useState<Slot>(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      setSlot((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return slot;
}

/**
 * Y range of trace samples whose viewBox x lies in `[x0, x1]`.
 * Returns the full `[top, bottom]` plot when the window has no samples.
 */
function yExtent(
  traces: readonly HomeSpectrumTrace[],
  x0: number,
  x1: number,
  top: number,
  bottom: number,
): { y0: number; y1: number } {
  let minY = Infinity;
  let maxY = -Infinity;
  const point = /[ML](-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g;
  for (const trace of traces) {
    for (const match of trace.d.matchAll(point)) {
      const x = Number(match[1]);
      const y = Number(match[2]);
      if (x < x0 || x > x1 || !Number.isFinite(y)) continue;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (!Number.isFinite(minY) || !(maxY > minY)) return { y0: top, y1: bottom };
  const pad = Math.max(10, (maxY - minY) * 0.08);
  return {
    y0: Math.max(top, minY - pad),
    y1: Math.min(bottom, maxY + pad),
  };
}

interface PeakCallout {
  key: string;
  label: string;
  mx: number;
  my: number;
  lx: number;
  ly: number;
}

/**
 * Places peak labels on one row above the tallest marker, shifting each label
 * right until its center is at least `gap` past the previous one so identical
 * π* labels do not stack.
 */
interface PointMark {
  key: string;
  label: string;
  mx: number;
  my: number;
  lx: number;
  ly: number;
  color: string;
}

/**
 * Places `point` markers beside their samples.
 *
 * The highest mark claims the spot above its dot first. A label that would
 * leave the frame or cover another label tries below the dot, then to either
 * side. The last candidate is clamped inside `frame` so every mark stays visible.
 */
function placePointMarks(
  markers: readonly HomeSpectrumMarker[],
  X: (x: number) => number,
  Y: (y: number) => number,
  frame: { left: number; right: number; top: number; bottom: number },
): PointMark[] {
  const raw = markers.flatMap((marker, index) => {
    const mx = X(marker.x);
    const my = Y(marker.y);
    if (!Number.isFinite(mx) || !Number.isFinite(my)) return [];
    return [
      {
        key: `${marker.label}-${String(index)}`,
        label: marker.label,
        mx,
        my,
        color: marker.ramp == null ? TEXT : polarizationRampColor(marker.ramp),
      },
    ];
  });
  const order = raw
    .map((mark, index) => ({ mark, index }))
    .sort((a, b) => a.mark.my - b.mark.my || a.mark.mx - b.mark.mx);
  const occupied: { lx: number; ly: number; half: number; block: number }[] =
    [];
  const result = new Array<PointMark | undefined>(raw.length);
  for (const { mark, index } of order) {
    const lines = mark.label.split("\n");
    const longest = Math.max(...lines.map((line) => line.length));
    const half = Math.max(22, longest * 3.5);
    const block = 13 * lines.length;
    const candidates = [
      { lx: mark.mx, ly: mark.my - 12 },
      { lx: mark.mx, ly: mark.my + block + 4 },
      { lx: mark.mx - half - 8, ly: mark.my - 4 },
      { lx: mark.mx + half + 8, ly: mark.my - 4 },
      { lx: mark.mx - half - 8, ly: mark.my + block },
      { lx: mark.mx + half + 8, ly: mark.my + block },
    ];
    const overlaps = (lx: number, ly: number): boolean =>
      occupied.some(
        (other) =>
          Math.abs(other.lx - lx) < other.half + half &&
          Math.abs(other.ly - ly) < (other.block + block) / 2,
      );
    const inside = (lx: number, ly: number): boolean =>
      ly >= frame.top + 10 &&
      ly + block <= frame.bottom &&
      lx - half >= frame.left &&
      lx + half <= frame.right &&
      !overlaps(lx, ly);
    const open = candidates.find((candidate) =>
      inside(candidate.lx, candidate.ly),
    );
    const lx = Math.min(
      frame.right - half,
      Math.max(frame.left + half, open?.lx ?? mark.mx),
    );
    const ly = Math.min(
      frame.bottom - block,
      Math.max(frame.top + 12, open?.ly ?? mark.my - 12),
    );
    occupied.push({ lx, ly, half, block });
    result[index] = { ...mark, lx, ly };
  }
  return result.flatMap((mark) => (mark ? [mark] : []));
}

function placePeakCallouts(
  markers: readonly HomeSpectrumMarker[],
  X: (x: number) => number,
  Y: (y: number) => number,
  frame: { left: number; right: number; top: number },
): PeakCallout[] {
  const placed = markers
    .map((marker, index) => ({
      key: `${marker.label}-${String(index)}`,
      label: marker.label,
      mx: X(marker.x),
      my: Y(marker.y),
    }))
    .filter(
      (marker) => Number.isFinite(marker.mx) && Number.isFinite(marker.my),
    )
    .sort((a, b) => a.mx - b.mx);
  if (placed.length === 0) return [];
  const highest = Math.min(...placed.map((marker) => marker.my));
  const ly = Math.max(frame.top, highest - 28);
  const gap = 36;
  let previous = frame.left;
  return placed.map((marker) => {
    const lx = Math.min(frame.right, Math.max(marker.mx, previous + gap));
    previous = lx;
    return { ...marker, lx, ly };
  });
}

function clippedSpan(
  x0: number,
  x1: number,
  X: (x: number) => number,
  left: number,
  right: number,
): { x: number; width: number } | null {
  const start = Math.max(left, Math.min(X(x0), X(x1)));
  const end = Math.min(right, Math.max(X(x0), X(x1)));
  if (end - start < 1) return null;
  return { x: start, width: end - start };
}

function windowFill(kind: HomeSpectrumBand["kind"]): {
  fill: string;
  line: string;
} {
  if (kind === "post") {
    return {
      fill: NORMALIZATION_COLORS.postFill,
      line: NORMALIZATION_COLORS.postLine,
    };
  }
  return {
    fill: NORMALIZATION_COLORS.preFill,
    line: NORMALIZATION_COLORS.preLine,
  };
}

/**
 * Static spectrum drawing that uses the SpectrumPlot chart frame: boxed axes,
 * inward ticks, dashed grid, and the `--chart-*` tokens.
 *
 * `focusMaxX` crops the energy window to the near-edge structure. The figure
 * maps that window onto the plot slot, inset from the axis frame so strokes
 * stay inside the box. Pre- and post-edge bands are hatched; π* and σ* fills
 * are not drawn. Row markers are leader callouts above the peaks. Point
 * markers are dots on the trace with a label beside the sample. Stroke width
 * and type stay in CSS pixels. `yGutter` `wide` reserves the same left margin
 * on every tab so a logarithmic exponent and the axis title do not meet, and
 * so switching displays does not resize the frame.
 */
export function HomeSpectrumFigure({
  spectrum,
  tab,
  focusMaxX,
  yGutter = "compact",
}: {
  spectrum: HomeSnapshotSpectrum;
  tab: HomeSpectrumTab;
  /**
   * ViewBox x of the right edge of the drawn window. Omit to show the full
   * energy axis. Set it at the end of the near-edge structure so the
   * resonances fill the frame.
   */
  focusMaxX?: number;
  /**
   * Left margin of the axis frame. `wide` fits a superscript power of ten
   * and keeps that margin on the linear displays of the same figure.
   */
  yGutter?: "compact" | "wide";
}): ReactElement {
  const slotRef = useRef<HTMLDivElement>(null);
  const slot = useSlot(slotRef, { w: 640, h: 380 });
  const patternUid = useId().replace(/:/g, "");
  const { width: w, height: h } = spectrum;
  const { l, r, t: top, b } = SPECTRUM_PAD;
  const right = w - r;
  const bottom = h - b;
  const visibleRight = Math.min(
    right,
    focusMaxX != null && focusMaxX > l + 40 && focusMaxX < right
      ? focusMaxX
      : right,
  );
  const { y0, y1 } =
    focusMaxX != null
      ? yExtent(tab.traces, l, visibleRight, top, bottom)
      : { y0: top, y1: bottom };
  const wideGutter = yGutter === "wide";
  const marginL = wideGutter ? 108 : 58;
  const marginR = 16;
  const marginT = 28;
  const marginB = 40;
  const inset = 16;
  const destW = Math.max(40, slot.w - marginL - marginR);
  const destH = Math.max(40, slot.h - marginT - marginB);
  const innerW = Math.max(20, destW - inset * 2);
  const innerH = Math.max(20, destH - inset * 2);
  const sx = innerW / (visibleRight - l);
  const sy = innerH / (y1 - y0);
  const originX = marginL + inset;
  const originY = marginT + inset;
  const transform = `translate(${originX} ${originY}) scale(${sx} ${sy}) translate(${-l} ${-y0})`;
  const X = (x: number) => originX + (x - l) * sx;
  const Y = (y: number) => originY + (y - y0) * sy;
  const clipId = `home-plot-clip-${tab.id}`;
  const yTicks = (tab.yTicks ?? []).filter(
    (tick) => tick.y >= y0 - 1 && tick.y <= y1 + 1,
  );
  const xTicks = spectrum.xTicks.filter(
    (tick) => tick.x >= l - 1 && tick.x <= visibleRight + 1,
  );
  const yTitleX = wideGutter ? 18 : 16;
  const yTitleY = marginT + destH / 2;
  const windows = tab.bands.filter(
    (band) => band.kind === "pre" || band.kind === "post",
  );
  const windowRects = windows.flatMap((band) => {
    const span = clippedSpan(band.x0, band.x1, X, marginL, marginL + destW);
    return span ? [{ band, ...span }] : [];
  });
  const visibleMarkers = tab.markers.filter(
    (marker) => marker.x >= l - 1 && marker.x <= visibleRight + 1,
  );
  const labelFrame = {
    left: marginL + 4,
    right: marginL + destW - 18,
    top: marginT + 14,
    bottom: marginT + destH - 6,
  };
  const callouts = placePeakCallouts(
    visibleMarkers.filter((marker) => marker.placement !== "point"),
    X,
    Y,
    labelFrame,
  );
  const pointMarks = placePointMarks(
    visibleMarkers.filter((marker) => marker.placement === "point"),
    X,
    Y,
    labelFrame,
  );
  return (
    <figure
      id="home-spectrum-figure"
      className="flex h-full min-h-0 flex-col gap-2"
    >
      <figcaption className="flex h-5 shrink-0 items-center gap-x-3 overflow-hidden">
        {tab.traces.map((t) => (
          <span
            key={t.key}
            className="inline-flex items-center gap-1.5 text-xs"
            style={{ color: TEXT }}
          >
            <span
              className="inline-block h-0 w-4 border-t-2"
              style={{
                borderTopColor: stroke(t),
                borderTopStyle: t.dashed ? "dashed" : "solid",
              }}
              aria-hidden
            />
            {t.label}
          </span>
        ))}
        {windows.map((band) => {
          const paint = windowFill(band.kind);
          return (
            <span
              key={band.kind}
              className="inline-flex items-center gap-1.5 text-xs"
              style={{ color: TEXT }}
            >
              <span
                className="inline-block h-2.5 w-3.5 border"
                style={{
                  background: paint.fill,
                  borderColor: paint.line,
                }}
                aria-hidden
              />
              {band.label}
            </span>
          );
        })}
      </figcaption>
      <div ref={slotRef} className="relative min-h-0 flex-1">
        <svg
          viewBox={`0 0 ${slot.w} ${slot.h}`}
          role="img"
          aria-label={`${spectrum.title}: ${tab.label}`}
          className="home-plot absolute inset-0 h-full w-full overflow-hidden"
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={marginL} y={marginT} width={destW} height={destH} />
            </clipPath>
            <pattern
              id={`home-pre-${patternUid}`}
              width={8}
              height={8}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={8}
                stroke={NORMALIZATION_COLORS.preLine}
                strokeWidth={1.25}
              />
            </pattern>
            <pattern
              id={`home-post-${patternUid}`}
              width={8}
              height={8}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-45)"
            >
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={8}
                stroke={NORMALIZATION_COLORS.postLine}
                strokeWidth={1.25}
              />
            </pattern>
          </defs>
          <rect
            x={marginL}
            y={marginT}
            width={destW}
            height={destH}
            fill={PLOT}
          />
          <g clipPath={`url(#${clipId})`}>
            {windowRects.map(({ band, x, width }) => {
              const paint = windowFill(band.kind);
              return (
                <g key={band.kind}>
                  <rect
                    x={x}
                    y={marginT}
                    width={width}
                    height={destH}
                    fill={paint.fill}
                    stroke={paint.line}
                    strokeWidth={1}
                  />
                  <rect
                    x={x}
                    y={marginT}
                    width={width}
                    height={destH}
                    fill={`url(#home-${band.kind}-${patternUid})`}
                  />
                </g>
              );
            })}
            <g transform={transform}>
              {xTicks.map((tick) => (
                <line
                  key={`gx-${tick.label}`}
                  x1={tick.x}
                  x2={tick.x}
                  y1={y0}
                  y2={y1}
                  stroke={GRID}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {yTicks.map((tick, index) =>
                tick.minor ? null : (
                  <line
                    key={`gy-${String(index)}`}
                    x1={l}
                    x2={visibleRight}
                    y1={tick.y}
                    y2={tick.y}
                    stroke={GRID}
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    vectorEffect="non-scaling-stroke"
                  />
                ),
              )}
              {tab.refLines?.map((ref) => (
                <line
                  key={ref.label}
                  x1={l}
                  x2={visibleRight}
                  y1={ref.y}
                  y2={ref.y}
                  stroke={AXIS}
                  strokeWidth="1"
                  strokeDasharray="2 3"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {tab.traces.map((t, index) => (
                <path
                  key={t.key}
                  d={t.d}
                  fill="none"
                  pathLength={t.dashed ? undefined : 1}
                  style={{
                    stroke: stroke(t),
                    animationDelay: `${index * 90}ms`,
                  }}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={t.dashed ? "4 4" : undefined}
                  vectorEffect="non-scaling-stroke"
                  className={t.dashed ? "home-trace-fade" : "home-trace"}
                />
              ))}
            </g>
          </g>
          <rect
            data-home-plot-frame=""
            x={marginL}
            y={marginT}
            width={destW}
            height={destH}
            fill="none"
            stroke={AXIS}
            strokeWidth="1"
          />
          {xTicks.map((tick) => (
            <g key={tick.label}>
              <line
                x1={X(tick.x)}
                x2={X(tick.x)}
                y1={marginT + destH}
                y2={marginT + destH - TICK}
                stroke={AXIS}
                strokeWidth="1"
              />
              <text
                x={X(tick.x)}
                y={marginT + destH + 18}
                textAnchor="middle"
                fill={TEXT}
                fontFamily={SANS}
                fontSize="15px"
                className="tabular-nums"
              >
                {tick.label}
              </text>
            </g>
          ))}
          {yTicks.map((tick, index) => (
            <g key={`yt-${String(index)}`}>
              <line
                x1={marginL}
                x2={marginL + (tick.minor ? 3 : TICK)}
                y1={Y(tick.y)}
                y2={Y(tick.y)}
                stroke={AXIS}
                strokeWidth="1"
              />
              {tick.minor || tick.label.length === 0 ? null : (
                <text
                  x={marginL - (wideGutter ? 16 : 8)}
                  y={Y(tick.y)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill={TEXT}
                  fontFamily={SANS}
                  fontSize="15px"
                  className="tabular-nums"
                >
                  <YTickLabel label={tick.label} exponent={tick.exponent} />
                </text>
              )}
            </g>
          ))}
          <text
            x={marginL + destW / 2}
            y={slot.h - 8}
            textAnchor="middle"
            fill={TEXT}
            fontFamily={SANS}
            fontSize="15px"
            fontWeight={500}
          >
            Energy (eV)
          </text>
          <text
            x={yTitleX}
            y={yTitleY}
            transform={`rotate(-90 ${yTitleX} ${yTitleY})`}
            textAnchor="middle"
            fill={TEXT}
            fontFamily={SANS}
            fontSize="15px"
            fontWeight={500}
          >
            {tab.yLabel}
          </text>
          {tab.refLines?.map((ref) =>
            ref.y < y0 || ref.y > y1 ? null : (
              <text
                key={`rl-${ref.label}`}
                x={marginL + destW - 6}
                y={Y(ref.y) - 6}
                textAnchor="end"
                fill={TEXT_SECONDARY}
                fontFamily={SANS}
                fontSize="14px"
              >
                {ref.label}
              </text>
            ),
          )}
          {windowRects.map(({ band, x, width }) => {
            const end = x + width;
            const crowded = end > marginL + destW - 56;
            return (
              <text
                key={`${band.kind}-label`}
                x={crowded ? end - 4 : x + width / 2}
                y={marginT + 14}
                textAnchor={crowded ? "end" : "middle"}
                fill={TEXT}
                fontFamily={SANS}
                fontSize="12px"
                fontWeight={500}
                style={{ paintOrder: "stroke", stroke: PLOT, strokeWidth: 4 }}
              >
                {band.label}
              </text>
            );
          })}
          {pointMarks.map((mark) => (
            <g key={mark.key}>
              <circle cx={mark.mx} cy={mark.my} r={3.5} fill={mark.color} />
              <text
                x={mark.lx}
                y={mark.ly}
                textAnchor="middle"
                fill={mark.color}
                fontFamily={SANS}
                fontSize="12px"
                fontWeight={600}
                style={{ paintOrder: "stroke", stroke: PLOT, strokeWidth: 4 }}
              >
                {mark.label.split("\n").map((line, lineIndex) => (
                  <tspan
                    key={`${mark.key}-${String(lineIndex)}`}
                    x={mark.lx}
                    dy={lineIndex === 0 ? 0 : 13}
                  >
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          ))}
          {callouts.map((callout) => (
            <g key={callout.key}>
              <line
                x1={callout.mx}
                y1={callout.my}
                x2={callout.lx}
                y2={callout.ly + 2}
                stroke={TEXT_SECONDARY}
                strokeWidth={1}
              />
              <text
                x={callout.lx}
                y={callout.ly}
                textAnchor="middle"
                fill={TEXT}
                fontFamily={SANS}
                fontSize="14px"
                fontWeight={600}
                style={{ paintOrder: "stroke", stroke: PLOT, strokeWidth: 4 }}
              >
                {callout.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </figure>
  );
}
