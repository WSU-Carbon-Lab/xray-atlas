import type { TraceData } from "../types";
import type { ChartThemeColors } from "../config";
import { getTraceLabel } from "./utils";

export type LegendEntry = {
  id: string;
  label: string;
  color: string;
  lineWidth: number;
  lineDash?: string;
};

export type LegendLayout = {
  columns: number;
  padding: number;
  borderRadius: number;
};

export type LegendCoreModel = {
  entries: LegendEntry[];
  layout: LegendLayout;
  singlePhi: boolean;
};

function traceId(trace: TraceData, index: number): string {
  const name = typeof trace.name === "string" ? trace.name : "";
  return name || `trace-${index}`;
}

function uniquePhiCount(traces: TraceData[]): number {
  const phis = new Set(
    traces
      .map((t) => t.phi)
      .filter((p): p is number => typeof p === "number" && Number.isFinite(p)),
  );
  return phis.size;
}

export function buildLegendCoreModel({
  traces,
  themeColors,
  columns,
  padding,
  borderRadius,
  labelMode,
}: {
  traces: TraceData[];
  themeColors: ChartThemeColors;
  columns?: number;
  padding?: number;
  borderRadius?: number;
  labelMode?: "trace" | "thetaSinglePhi";
}): LegendCoreModel {
  const singlePhi = uniquePhiCount(traces) <= 1;
  const resolvedLabelMode = labelMode ?? "thetaSinglePhi";

  const entries: LegendEntry[] = traces.map((trace, index) => {
    const id = traceId(trace, index);
    const label =
      resolvedLabelMode === "thetaSinglePhi" &&
      singlePhi &&
      typeof trace.theta === "number" &&
      Number.isFinite(trace.theta)
        ? `${trace.theta.toFixed(1)}°`
        : getTraceLabel(trace, index);
    const color =
      trace.line?.color ?? trace.marker?.color ?? themeColors.axis;
    return {
      id,
      label,
      color,
      lineWidth: trace.line?.width ?? 2,
      lineDash: trace.line?.dash,
    };
  });

  return {
    entries,
    layout: {
      columns: columns ?? 1,
      padding: padding ?? 8,
      borderRadius: borderRadius ?? 8,
    },
    singlePhi,
  };
}

