"use client";

import { memo } from "react";
import type { TraceData } from "../types";
import type { ChartThemeColors } from "../config";
import { buildLegendCoreModel } from "./legend-core";

type StaticLegendProps = {
  traces: TraceData[];
  visibleTraceIds: Set<string>;
  onToggleTrace: (id: string) => void;
  themeColors: ChartThemeColors;
  hoveredValues?: Map<string, number> | null;
  hoveredEnergy?: number | null;
  className?: string;
};

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

  const { entries } = buildLegendCoreModel({
    traces,
    themeColors,
    columns: 1,
    padding: 0,
    borderRadius: 0,
    labelMode: "trace",
  });

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
      {entries.map((entry) => {
        const isVisible =
          visibleTraceIds.size === 0 || visibleTraceIds.has(entry.id);
        const valueAtCrosshair =
          hoveredValues && hoveredEnergy != null
            ? hoveredValues.get(entry.label)
            : undefined;

        return (
          <button
            key={entry.id}
            type="button"
            role="listitem"
            onClick={() => onToggleTrace(entry.id)}
            aria-pressed={isVisible}
            aria-label={`${isVisible ? "Hide" : "Show"} ${entry.label}`}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-(--border-focus) focus-visible:ring-offset-2 ${
              isVisible
                ? "border-accent bg-accent text-accent-foreground"
                : "border-(--border-default) bg-(--surface-2) text-(--text-secondary) hover:bg-(--surface-3)"
            }`}
          >
            <span
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: isVisible ? "currentColor" : entry.color }}
              aria-hidden
            />
            <span>{entry.label}</span>
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
