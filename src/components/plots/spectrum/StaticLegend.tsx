"use client";

import { memo } from "react";
import type { TraceData } from "../types";
import type { ChartThemeColors } from "../config";

type StaticLegendProps = {
  traces: TraceData[];
  visibleTraceIds: Set<string>;
  onToggleTrace: (id: string) => void;
  themeColors: ChartThemeColors;
  hoveredValues?: Map<string, number> | null;
  hoveredEnergy?: number | null;
  className?: string;
};

function traceId(trace: TraceData, index: number): string {
  const name = typeof trace.name === "string" ? trace.name : "";
  return name || `trace-${index}`;
}

export const StaticLegend = memo(function StaticLegend({
  traces,
  visibleTraceIds,
  onToggleTrace,
  themeColors,
  hoveredValues = null,
  hoveredEnergy = null,
  className = "",
}: StaticLegendProps) {
  if (traces.length === 0) return null;

  return (
    <div
      className={`flex w-full flex-col gap-2 rounded-xl border border-(--border-default) bg-(--surface-1) px-3 py-2 ${className}`}
      role="region"
      aria-label="Trace legend"
    >
      {hoveredEnergy != null && (
        <div className="flex items-center justify-between border-b border-(--border-subtle) pb-2 text-sm">
          <span className="font-medium text-(--text-secondary)">Energy</span>
          <span className="tabular-nums font-medium" style={{ color: themeColors.text }}>
            {hoveredEnergy.toFixed(3)} eV
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-center gap-2" role="list" aria-label="Spectrum traces">
      {traces.map((trace, index) => {
        const id = traceId(trace, index);
        const label = typeof trace.name === "string" ? trace.name : `Trace ${index + 1}`;
        const color =
          trace.line?.color ?? trace.marker?.color ?? themeColors.text;
        const isVisible = visibleTraceIds.size === 0 || visibleTraceIds.has(id);
        const valueAtCrosshair =
          hoveredValues && hoveredEnergy != null ? hoveredValues.get(label) : undefined;

        return (
          <button
            key={id}
            type="button"
            role="listitem"
            onClick={() => onToggleTrace(id)}
            aria-pressed={isVisible}
            aria-label={`${isVisible ? "Hide" : "Show"} ${label}`}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-(--border-focus) focus-visible:ring-offset-2 ${
              isVisible
                ? "border-accent bg-accent text-accent-foreground"
                : "border-(--border-default) bg-(--surface-2) text-(--text-secondary) hover:bg-(--surface-3)"
            }`}
          >
            <span
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: isVisible ? "currentColor" : color }}
              aria-hidden
            />
            <span>{label}</span>
            {valueAtCrosshair !== undefined && (
              <span className="opacity-90">
                {valueAtCrosshair.toFixed(4)}
              </span>
            )}
          </button>
        );
      })}
      </div>
    </div>
  );
});
