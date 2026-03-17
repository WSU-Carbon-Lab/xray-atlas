"use client";

import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { Brush } from "@visx/brush";
import type { Bounds } from "@visx/brush/lib/types";
import { Group } from "@visx/group";
import { LinePath } from "@visx/shape";
import { curveLinear } from "@visx/curve";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { scaleLinear } from "d3-scale";
import type { ScaleLinear } from "d3-scale";
import type { TraceData } from "../types";
import type { ChartThemeColors } from "../config";
import { PLOT_CONFIG } from "../config";

const KEYBOARD_STEP_FRACTION = 0.05;

type AccessibleBrushOverviewProps = {
  width: number;
  height: number;
  top: number;
  xDomain: [number, number];
  yScale: ScaleLinear<number, number>;
  traces: TraceData[];
  brushDomain: [number, number];
  onBrushChange: (x0: number, x1: number) => void;
  themeColors: ChartThemeColors;
  brushKey?: string;
};

export function AccessibleBrushOverview({
  width,
  height,
  top,
  xDomain,
  yScale,
  traces,
  brushDomain,
  onBrushChange,
  themeColors,
  brushKey = "default",
}: AccessibleBrushOverviewProps) {
  const m = PLOT_CONFIG.overviewMargins;
  const innerWidth = Math.max(0, width - m.left - m.right);
  const innerHeight = Math.max(0, height - m.top - m.bottom);

  const [liveRegionText, setLiveRegionText] = useState("");
  const liveRegionRef = useRef<HTMLDivElement>(null);

  const brushMin = brushDomain[0];
  const brushMax = brushDomain[1];
  useEffect(() => {
    setLiveRegionText(
      `Energy range ${brushMin.toFixed(1)} to ${brushMax.toFixed(1)} eV`,
    );
  }, [brushMin, brushMax]);

  const overviewXScale = useMemo(
    () => scaleLinear<number, number>().domain(xDomain).range([0, innerWidth]),
    [xDomain, innerWidth],
  );
  const overviewYScale = useMemo(
    () => yScale.copy().range([innerHeight, 0]),
    [yScale, innerHeight],
  );

  const updateLiveRegion = useCallback((x0: number, x1: number) => {
    const lo = x0.toFixed(1);
    const hi = x1.toFixed(1);
    setLiveRegionText(`Energy range ${lo} to ${hi} eV`);
  }, []);

  useEffect(() => {
    if (liveRegionRef.current && liveRegionText) {
      liveRegionRef.current.textContent = liveRegionText;
    }
  }, [liveRegionText]);

  const allTracePoints = useMemo(() => {
    return traces.map((t) => {
      const xV = t.x;
      const yV = t.y;
      if (!Array.isArray(xV) || !Array.isArray(yV) || xV.length !== yV.length)
        return { points: [] as Array<{ x: number; y: number }>, color: themeColors.text };
      const points = xV
        .map((x, i) => ({ x, y: yV[i]! }))
        .filter(
          (p): p is { x: number; y: number } =>
            typeof p.x === "number" &&
            typeof p.y === "number" &&
            Number.isFinite(p.x) &&
            Number.isFinite(p.y),
        );
      const color = t.line?.color ?? t.marker?.color ?? themeColors.text;
      return { points, color };
    });
  }, [traces, themeColors.text]);

  const hasEnoughData = useMemo(
    () => allTracePoints.some(({ points }) => points.length >= 2),
    [allTracePoints],
  );

  const initialBrushPosition = useMemo(
    () => ({
      start: { x: overviewXScale(brushDomain[0]), y: 0 },
      end: { x: overviewXScale(brushDomain[1]), y: innerHeight },
    }),
    [overviewXScale, brushDomain, innerHeight],
  );

  const handleBrushChange = useCallback(
    (bounds: Bounds | null) => {
      if (!bounds) return;
      const raw0 = Math.min(bounds.x0, bounds.x1);
      const raw1 = Math.max(bounds.x0, bounds.x1);
      if (raw1 - raw0 <= 0) return;
      const xMin = xDomain[0];
      const xMax = xDomain[1];
      const x0 = Math.max(xMin, Math.min(xMax, overviewXScale.invert(raw0)));
      const x1 = Math.max(xMin, Math.min(xMax, overviewXScale.invert(raw1)));
      if (x1 - x0 <= 0) return;
      onBrushChange(x0, x1);
      updateLiveRegion(x0, x1);
    },
    [onBrushChange, xDomain, overviewXScale, updateLiveRegion],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const span = brushDomain[1] - brushDomain[0];
      const step = Math.max((xDomain[1] - xDomain[0]) * KEYBOARD_STEP_FRACTION, span * 0.02);
      let newX0 = brushDomain[0];
      let newX1 = brushDomain[1];
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        newX0 = Math.max(xDomain[0], brushDomain[0] - step);
        newX1 = Math.max(xDomain[0], brushDomain[1] - step);
        if (newX1 - newX0 < span) newX1 = newX0 + span;
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        newX0 = Math.min(xDomain[1], brushDomain[0] + step);
        newX1 = Math.min(xDomain[1], brushDomain[1] + step);
        if (newX1 - newX0 < span) newX0 = newX1 - span;
      } else if (e.key === "Home") {
        e.preventDefault();
        newX0 = xDomain[0];
        newX1 = Math.min(xDomain[1], xDomain[0] + span);
      } else if (e.key === "End") {
        e.preventDefault();
        newX1 = xDomain[1];
        newX0 = Math.max(xDomain[0], xDomain[1] - span);
      } else return;
      newX0 = Math.max(xDomain[0], Math.min(xDomain[1] - span, newX0));
      newX1 = Math.max(newX0 + span * 0.1, Math.min(xDomain[1], newX1));
      onBrushChange(newX0, newX1);
      updateLiveRegion(newX0, newX1);
    },
    [brushDomain, xDomain, onBrushChange, updateLiveRegion],
  );

  const selectedBoxStyle = useMemo(
    () => ({
      fill: themeColors.selection,
      fillOpacity: 1,
      stroke: themeColors.selectionBorder,
      strokeWidth: 1.5,
      strokeOpacity: 0.95,
      strokeDasharray: "5 4",
    }),
    [themeColors.selection, themeColors.selectionBorder],
  );

  const renderBrushHandle = useCallback(
    (props: {
      x: number;
      y: number;
      width: number;
      height: number;
      isBrushActive?: boolean;
    }) => {
      const { x, y, width, height, isBrushActive } = props;
      if (!isBrushActive) return null;
      const w = Math.max(width, 8);
      const h = Math.max(height, 20);
      return (
        <Group left={x} top={y}>
          <rect
            width={w}
            height={h}
            rx={2}
            ry={2}
            fill={themeColors.hoverBg}
            stroke={themeColors.legendBorder ?? themeColors.text}
            strokeWidth={1}
            strokeOpacity={0.9}
            style={{ cursor: "ew-resize", pointerEvents: "all" }}
          />
          <line
            x1={w / 2 - 2}
            y1={4}
            x2={w / 2 - 2}
            y2={h - 4}
            stroke={themeColors.text}
            strokeOpacity={0.7}
            strokeWidth={1}
          />
          <line
            x1={w / 2 + 2}
            y1={4}
            x2={w / 2 + 2}
            y2={h - 4}
            stroke={themeColors.text}
            strokeOpacity={0.7}
            strokeWidth={1}
          />
        </Group>
      );
    },
    [themeColors],
  );

  const axisColor = themeColors.axis ?? themeColors.text;
  const tickLabelColor = themeColors.text;

  if (!hasEnoughData || innerWidth <= 0 || innerHeight <= 0) {
    return null;
  }

  return (
    <>
      <div
        ref={liveRegionRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <Group left={0} top={top}>
        <rect
          x={m.left - 1}
          y={m.top - 1}
          width={innerWidth + 2}
          height={innerHeight + 2}
          rx={4}
          ry={4}
          fill={themeColors.plot ?? themeColors.paper}
          stroke={themeColors.legendBorder ?? axisColor}
          strokeWidth={1}
          strokeOpacity={0.8}
          style={{ pointerEvents: "none" }}
        />
        <AxisLeft
          left={m.left}
          top={m.top}
          scale={overviewYScale}
          stroke={axisColor}
          tickStroke={axisColor}
          tickLength={-4}
          numTicks={4}
          tickLabelProps={() => ({
            fill: tickLabelColor,
            fontSize: 10,
            textAnchor: "end",
            fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
            dx: -(PLOT_CONFIG.axis.tickPadding + 2),
          })}
        />
        <AxisBottom
          top={m.top + innerHeight}
          left={m.left}
          scale={overviewXScale}
          stroke={axisColor}
          tickStroke={axisColor}
          tickLength={4}
          numTicks={6}
          tickLabelProps={() => ({
            fill: tickLabelColor,
            fontSize: 10,
            textAnchor: "middle",
            fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
            dy: PLOT_CONFIG.axis.tickPadding,
          })}
          label="Energy (eV)"
          labelOffset={10}
          labelProps={{
            fill: tickLabelColor,
            fontSize: 11,
            fontWeight: PLOT_CONFIG.axis.fontWeight,
            textAnchor: "middle",
            fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
          }}
        />
        <Group left={m.left} top={m.top}>
          <defs>
            <clipPath id={`overview-clip-${brushKey}`}>
              <rect x={0} y={0} width={innerWidth} height={innerHeight} />
            </clipPath>
          </defs>
          <g clipPath={`url(#overview-clip-${brushKey})`}>
            {allTracePoints.map(
              ({ points, color }, i) =>
                points.length >= 2 && (
                  <LinePath
                    key={i}
                    data={points}
                    x={(d) => overviewXScale(d.x)}
                    y={(d) => overviewYScale(d.y)}
                    stroke={color}
                    strokeWidth={1}
                    strokeOpacity={0.6}
                    curve={curveLinear}
                  />
                ),
            )}
          </g>
          <g
            role="group"
            aria-label="Energy range selection"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            style={{ outline: "none" }}
            className="rounded outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
          >
            <Brush
              key={brushKey}
              xScale={overviewXScale}
              yScale={overviewYScale}
              width={innerWidth}
              height={innerHeight}
              margin={{ top: 0, left: 0, right: 0, bottom: 0 }}
              handleSize={10}
              resizeTriggerAreas={["left", "right"]}
              brushDirection="horizontal"
              initialBrushPosition={initialBrushPosition}
              onChange={handleBrushChange}
              selectedBoxStyle={selectedBoxStyle}
              renderBrushHandle={renderBrushHandle}
              useWindowMoveEvents
              disableDraggingSelection={false}
            />
          </g>
        </Group>
      </Group>
    </>
  );
}
