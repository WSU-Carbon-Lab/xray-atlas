"use client";

import { memo, useMemo } from "react";
import { scaleLinear } from "d3-scale";
import type { ScaleLinear } from "d3-scale";
import { Group } from "@visx/group";
import { LinePath } from "@visx/shape";
import { curveLinear } from "@visx/curve";
import { AxisBottom, AxisLeft } from "@visx/axis";
import type { TraceData } from "../types";
import type { ChartThemeColors } from "../config";
import { PLOT_CONFIG } from "../config";

type OverviewStripProps = {
  width: number;
  height: number;
  top: number;
  xDomain: [number, number];
  yScale: ScaleLinear<number, number>;
  traces: TraceData[];
  themeColors: ChartThemeColors;
};

export const OverviewStrip = memo(function OverviewStrip({
  width,
  height,
  top,
  xDomain,
  yScale,
  traces,
  themeColors,
}: OverviewStripProps) {
  const m = PLOT_CONFIG.overviewMargins;
  const innerWidth = Math.max(0, width - m.left - m.right);
  const innerHeight = Math.max(0, height - m.top - m.bottom);

  const overviewXScale = useMemo(
    () => scaleLinear<number, number>().domain(xDomain).range([0, innerWidth]),
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

  const axisColor = themeColors.axis ?? themeColors.text;
  const tickLabelColor = themeColors.text;

  if (!hasEnoughData || innerWidth <= 0 || innerHeight <= 0) {
    return null;
  }

  return (
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
          fontSize: 11,
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
          fontSize: 11,
          textAnchor: "middle",
          fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
          dy: PLOT_CONFIG.axis.tickPadding,
        })}
        label="Energy (eV)"
        labelOffset={10}
        labelProps={{
          fill: tickLabelColor,
          fontSize: 12,
          fontWeight: PLOT_CONFIG.axis.fontWeight,
          textAnchor: "middle",
          fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
        }}
      />
      <Group left={m.left} top={m.top}>
        <g>
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
      </Group>
    </Group>
  );
});
