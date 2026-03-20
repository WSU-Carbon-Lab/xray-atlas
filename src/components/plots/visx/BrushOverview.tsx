/**
 * Overview strip with brush for x-range selection (inspired by visx brush example).
 * Renders a mini chart of the full data and a horizontal brush to set the main chart domain.
 * visx Brush onChange returns bounds in domain coordinates (x0, x1), not pixels.
 */

"use client";

import React, { useMemo, useCallback } from "react";
import { Brush } from "@visx/brush";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import { LinePath } from "@visx/shape";
import { curveLinear } from "@visx/curve";
import { scaleLinear } from "d3-scale";
import type { ScaleLinear } from "d3-scale";
import type { TraceData } from "../types";
import type { ChartThemeColors } from "../hooks/useChartTheme";
import {
  OVERVIEW_MARGINS,
  AXIS_CONFIG,
  PLOT_FRAME_RADIUS,
  BRUSH_SELECTION_COLOR,
  BRUSH_SELECTION_BORDER_COLOR,
} from "../constants";

type Bounds = { x0: number; x1: number; y0: number; y1: number };

export type BrushOverviewProps = {
  width: number;
  height: number;
  top: number;
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
  traces: TraceData[];
  xDomain: [number, number];
  initialBrushDomain?: [number, number];
  onBrushChange: (x0: number, x1: number) => void;
  themeColors: ChartThemeColors;
  brushKey?: string;
};

export function BrushOverview({
  width,
  height,
  top,
  xScale: _xScale,
  yScale,
  traces,
  xDomain,
  initialBrushDomain,
  onBrushChange,
  themeColors,
  brushKey = "default",
}: BrushOverviewProps) {
  const brushDomain = initialBrushDomain ?? xDomain;
  const innerWidth = Math.max(0, width - OVERVIEW_MARGINS.left - OVERVIEW_MARGINS.right);
  const innerHeight = Math.max(0, height - OVERVIEW_MARGINS.top - OVERVIEW_MARGINS.bottom);

  const overviewXScale = useMemo(
    () => scaleLinear<number>().domain(xDomain).range([0, innerWidth]),
    [xDomain, innerWidth],
  );
  const overviewYScale = useMemo(
    () => yScale.copy().range([innerHeight, 0]),
    [yScale, innerHeight],
  );

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
      const x0 = Math.max(xMin, Math.min(xMax, raw0));
      const x1 = Math.max(xMin, Math.min(xMax, raw1));
      if (x1 - x0 <= 0) return;
      onBrushChange(x0, x1);
    },
    [onBrushChange, xDomain],
  );

  const selectedBoxStyle = useMemo(
    () => ({
      fill: BRUSH_SELECTION_COLOR,
      fillOpacity: 1,
      stroke: BRUSH_SELECTION_BORDER_COLOR,
      strokeWidth: 1.5,
      strokeOpacity: 0.95,
      strokeDasharray: "5 4",
    }),
    [],
  );

  const renderBrushHandle = useCallback(
    (props: { x: number; y: number; width: number; height: number; isBrushActive?: boolean }) => {
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
  const overviewLeft = OVERVIEW_MARGINS.left;
  const overviewTop = OVERVIEW_MARGINS.top;
  const frameRadius = Math.min(PLOT_FRAME_RADIUS, innerWidth / 8, innerHeight / 8);

  if (!hasEnoughData || innerWidth <= 0 || innerHeight <= 0) {
    return null;
  }

  return (
    <Group left={0} top={top}>
      <rect
        x={overviewLeft - 1}
        y={overviewTop - 1}
        width={innerWidth + 2}
        height={innerHeight + 2}
        rx={frameRadius}
        ry={frameRadius}
        fill={themeColors.plot ?? themeColors.paper}
        stroke={themeColors.legendBorder ?? axisColor}
        strokeWidth={1}
        strokeOpacity={0.8}
        style={{ pointerEvents: "none" }}
      />
      <AxisLeft
        left={overviewLeft}
        top={overviewTop}
        scale={overviewYScale}
        stroke={axisColor}
        tickStroke={axisColor}
        tickLength={-4}
        numTicks={4}
        tickLabelProps={() => ({
          fill: tickLabelColor,
          fontSize: 11,
          textAnchor: "end",
          fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
          dx: -(AXIS_CONFIG.tickPadding + 2),
        })}
      />
      <AxisBottom
        top={overviewTop + innerHeight}
        left={overviewLeft}
        scale={overviewXScale}
        stroke={axisColor}
        tickStroke={axisColor}
        tickLength={4}
        numTicks={6}
        tickLabelProps={() => ({
          fill: tickLabelColor,
          fontSize: 11,
          textAnchor: "middle",
          fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
          dy: AXIS_CONFIG.tickPadding,
        })}
        label="Energy (eV)"
        labelOffset={10}
        labelProps={{
          fill: tickLabelColor,
          fontSize: 12,
          fontWeight: 500,
          textAnchor: "middle",
          fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
        }}
      />
      <Group left={overviewLeft} top={overviewTop}>
        <defs>
          <clipPath id="overview-clip">
            <rect x={0} y={0} width={innerWidth} height={innerHeight} />
          </clipPath>
        </defs>
        <g clipPath="url(#overview-clip)">
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
      </Group>
    </Group>
  );
}
