"use client";

import { useMemo } from "react";
import type { StxmIngestionDisplayChannel } from "~/features/dashboard/lib/computeStxmIngestion";
import type { StxmIngestionResult } from "~/features/dashboard/lib/computeStxmIngestion";

export type IngestionSpectrumTraceId =
  | "i0"
  | "iSample"
  | "invI0"
  | "od"
  | "odNormalized"
  | "massAbsorption"
  | "beta"
  | "delta";

export const INGESTION_TRACE_LABELS: Record<IngestionSpectrumTraceId, string> = {
  i0: "I0",
  iSample: "Sample",
  invI0: "1/I0",
  od: "OD",
  odNormalized: "Norm OD",
  massAbsorption: "Mass abs",
  beta: "Beta",
  delta: "Delta",
};

const TRACE_COLORS: Record<IngestionSpectrumTraceId, string> = {
  i0: "rgb(59, 130, 246)",
  iSample: "rgb(34, 197, 94)",
  invI0: "rgb(147, 197, 253)",
  od: "var(--accent)",
  odNormalized: "rgb(168, 85, 247)",
  massAbsorption: "rgb(234, 179, 8)",
  beta: "rgb(249, 115, 22)",
  delta: "rgb(236, 72, 153)",
};

type IngestionSpectrumChartProps = {
  result: StxmIngestionResult;
  enabledTraces: ReadonlySet<IngestionSpectrumTraceId>;
  yScale: "linear" | "log";
  height?: number;
};

function traceValues(
  result: StxmIngestionResult,
  trace: IngestionSpectrumTraceId,
): number[] | null {
  switch (trace) {
    case "i0":
      return result.i0;
    case "iSample":
      return result.iSample;
    case "invI0":
      return result.i0.map((value) => (value > 0 ? 1 / value : Number.NaN));
    case "od":
      return result.od;
    case "odNormalized":
      return result.odNormalized;
    case "massAbsorption":
      return result.massAbsorption;
    case "beta":
      return result.beta;
    case "delta":
      return result.delta;
    default:
      return null;
  }
}

/**
 * Multi-trace NEXAFS spectrum chart for STXM ingestion (linear or log y-axis).
 */
export function IngestionSpectrumChart({
  result,
  enabledTraces,
  yScale,
  height = 280,
}: IngestionSpectrumChartProps) {
  const width = 640;
  const padding = 40;

  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    let xMinLocal = Infinity;
    let xMaxLocal = -Infinity;
    let yMinLocal = Infinity;
    let yMaxLocal = -Infinity;
    for (const id of enabledTraces) {
      const yValues = traceValues(result, id);
      if (!yValues) {
        continue;
      }
      for (let i = 0; i < result.energyEv.length; i += 1) {
        const x = result.energyEv[i] ?? 0;
        const y = yValues[i] ?? Number.NaN;
        if (!Number.isFinite(y)) {
          continue;
        }
        const plotY = yScale === "log" ? Math.log10(Math.max(y, 1e-30)) : y;
        xMinLocal = Math.min(xMinLocal, x);
        xMaxLocal = Math.max(xMaxLocal, x);
        yMinLocal = Math.min(yMinLocal, plotY);
        yMaxLocal = Math.max(yMaxLocal, plotY);
      }
    }
    if (!Number.isFinite(xMinLocal)) {
      return { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
    }
    return {
      xMin: xMinLocal,
      xMax: xMaxLocal,
      yMin: yMinLocal,
      yMax: yMaxLocal,
    };
  }, [enabledTraces, result, yScale]);

  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;

  const mapPoint = (energy: number, y: number) => {
    const plotY = yScale === "log" ? Math.log10(Math.max(y, 1e-30)) : y;
    const x =
      padding + ((energy - xMin) / xSpan) * (width - padding * 2);
    const py =
      height -
      padding -
      ((plotY - yMin) / ySpan) * (height - padding * 2);
    return `${x},${py}`;
  };

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="border-border bg-default/20 w-full rounded-md border"
        role="img"
        aria-label="STXM ingestion spectra"
      >
        {([...enabledTraces] as IngestionSpectrumTraceId[]).map((id) => {
          const yValues = traceValues(result, id);
          if (!yValues) {
            return null;
          }
          const points = result.energyEv
            .map((energy, index) => {
              const y = yValues[index] ?? Number.NaN;
              if (!Number.isFinite(y)) {
                return null;
              }
              return mapPoint(energy, y);
            })
            .filter((point): point is string => point !== null)
            .join(" ");
          if (!points) {
            return null;
          }
          return (
            <polyline
              key={id}
              fill="none"
              stroke={TRACE_COLORS[id]}
              strokeWidth={2}
              points={points}
            />
          );
        })}
        <text x={padding} y={18} className="fill-muted text-[10px]">
          Energy (eV) vs {yScale === "log" ? "log10(y)" : "y"}
        </text>
      </svg>
      <ul className="flex flex-wrap gap-3 text-xs">
        {([...enabledTraces] as IngestionSpectrumTraceId[]).map((id) => (
          <li key={id} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-4 rounded-sm"
              style={{ backgroundColor: TRACE_COLORS[id] }}
            />
            {INGESTION_TRACE_LABELS[id]}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function displayChannelToTraces(
  channel: StxmIngestionDisplayChannel,
): IngestionSpectrumTraceId[] {
  switch (channel) {
    case "signal_i0":
      return ["i0"];
    case "signal_sample":
      return ["iSample"];
    case "signal_inv_i0":
      return ["invI0"];
    case "od":
      return ["od"];
    case "od_normalized":
      return ["odNormalized"];
    case "mass_absorption":
      return ["massAbsorption"];
    case "beta":
      return ["beta"];
    case "delta":
      return ["delta"];
    default:
      return ["od"];
  }
}
