"use client";

import { memo } from "react";
import { CheckIcon } from "@heroicons/react/24/solid";
import { ScrollShadow } from "@heroui/react";
import type { TraceData } from "../types";
import type { ChartThemeColors } from "../config";
import { buildLegendCoreModel } from "./legend-core";

type InlineLegendProps = {
  traces: TraceData[];
  visibleTraceIds: Set<string>;
  onToggleTrace: (id: string) => void;
  themeColors: ChartThemeColors;
  horizontalScroll?: boolean;
};

export const InlineLegend = memo(function InlineLegend({
  traces,
  visibleTraceIds,
  onToggleTrace,
  themeColors,
  horizontalScroll = false,
}: InlineLegendProps) {
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
      className="flex items-center gap-2 rounded-xl border border-(--border-default) bg-(--surface-1) px-3 py-2"
      role="region"
      aria-label="Trace legend"
    >
      <ScrollShadow
        orientation={horizontalScroll ? "horizontal" : "vertical"}
        className="max-w-full scrollshadow-inline-legend"
      >
        <div
          className={`flex items-center gap-3 ${
            horizontalScroll ? "flex-nowrap" : "flex-wrap"
          }`}
          role="list"
          aria-label="Spectrum traces"
        >
          {entries.map((entry) => {
            const isVisible =
              visibleTraceIds.size === 0 || visibleTraceIds.has(entry.id);

            return (
              <button
                key={entry.id}
                type="button"
                role="listitem"
                onClick={() => onToggleTrace(entry.id)}
                aria-pressed={isVisible}
                aria-label={`${isVisible ? "Hide" : "Show"} ${entry.label}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[0.9375rem] font-medium leading-snug text-(--text-primary) transition-colors hover:bg-(--surface-2) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--border-focus) focus-visible:ring-offset-2"
              >
                <span
                  className="relative flex h-4 w-4 shrink-0 items-center justify-center rounded border border-(--border-strong)"
                  style={{
                    backgroundColor: isVisible ? entry.color : "var(--surface-2)",
                    opacity: isVisible ? 1 : 0.6,
                  }}
                  aria-hidden
                >
                  {isVisible && (
                    <CheckIcon className="h-2.5 w-2.5 text-white drop-shadow-[0_0_1px_rgba(0,0,0,0.8)]" />
                  )}
                </span>
                <span className="truncate">{entry.label}</span>
              </button>
            );
          })}
        </div>
      </ScrollShadow>
    </div>
  );
});
