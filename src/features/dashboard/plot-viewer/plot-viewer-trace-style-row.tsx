"use client";

import { memo } from "react";
import { cn } from "@heroui/styles";
import type { PlotViewerTraceStyleListItem } from "./plot-viewer-experiment-styles";
import type { PlotViewerTraceStyleOverride } from "./plot-viewer-style-overrides";
import {
  PlotViewerColorStylePopover,
  PlotViewerLineStylePopover,
  PlotViewerMarkerStylePopover,
} from "./plot-viewer-style-control-popover";

export type PlotViewerTraceStyleRowProps = {
  trace: PlotViewerTraceStyleListItem;
  onTraceOverrideChange: (
    traceKey: string,
    patch: Partial<PlotViewerTraceStyleOverride>,
    clearKeys?: readonly (keyof PlotViewerTraceStyleOverride)[],
  ) => void;
  compact?: boolean;
};

/**
 * Per-trace style row mirroring the experiment control pattern at smaller scale.
 */
export const PlotViewerTraceStyleRow = memo(function PlotViewerTraceStyleRow({
  trace,
  onTraceOverrideChange,
  compact = true,
}: PlotViewerTraceStyleRowProps) {
  const controlSize = compact ? "scale-90 origin-left" : undefined;

  return (
    <li
      className={cn(
        "border-border flex min-h-8 items-center gap-1.5 rounded-md border px-1.5 py-1",
        compact && "text-[11px]",
      )}
    >
      <div className={cn("flex shrink-0 items-center gap-1", controlSize)}>
        <PlotViewerColorStylePopover
          mode="trace"
          effectiveColor={trace.effectiveColor}
          inheritedColor={trace.inheritedColor}
          previewColor={trace.effectiveColor}
          hasOverride={trace.hasColorOverride}
          idPrefix={`plot-viewer-trace-color-${trace.traceKey}`}
          onFixedColorChange={(hex) => {
            onTraceOverrideChange(trace.traceKey, { color: hex });
          }}
          onClearOverride={() => {
            onTraceOverrideChange(trace.traceKey, {}, ["color"]);
          }}
        />

        <PlotViewerLineStylePopover
          mode="trace"
          effectiveLineDash={trace.effectiveLineDash}
          inheritedLineDash={trace.inheritedLineDash}
          effectiveLineWidth={trace.effectiveLineWidth}
          inheritedLineWidth={trace.inheritedLineWidth}
          previewColor={trace.effectiveColor}
          hasLineDashOverride={trace.hasLineDashOverride}
          hasLineWidthOverride={trace.hasLineWidthOverride}
          onLineDashChange={(lineDash) => {
            if (lineDash == null) {
              onTraceOverrideChange(trace.traceKey, {}, ["lineDash"]);
              return;
            }
            onTraceOverrideChange(trace.traceKey, { lineDash });
          }}
          onLineWidthChange={(width) => {
            if (width == null) {
              onTraceOverrideChange(trace.traceKey, {}, ["lineWidth"]);
              return;
            }
            onTraceOverrideChange(trace.traceKey, { lineWidth: width });
          }}
        />

        <PlotViewerMarkerStylePopover
          mode="trace"
          effectiveMarker={trace.effectiveMarker}
          inheritedMarker={trace.inheritedMarker}
          effectiveMarkerSize={trace.effectiveMarkerSize}
          inheritedMarkerSize={trace.inheritedMarkerSize}
          effectiveMarkerEvery={trace.effectiveMarkerEvery}
          inheritedMarkerEvery={trace.inheritedMarkerEvery}
          previewColor={trace.effectiveColor}
          hasMarkerOverride={trace.hasMarkerOverride}
          hasMarkerSizeOverride={trace.hasMarkerSizeOverride}
          hasMarkerEveryOverride={trace.hasMarkerEveryOverride}
          onMarkerChange={(marker) => {
            if (marker == null) {
              onTraceOverrideChange(trace.traceKey, {}, ["marker"]);
              return;
            }
            onTraceOverrideChange(trace.traceKey, { marker });
          }}
          onMarkerSizeChange={(size) => {
            if (size == null) {
              onTraceOverrideChange(trace.traceKey, {}, ["markerSize"]);
              return;
            }
            onTraceOverrideChange(trace.traceKey, { markerSize: size });
          }}
          onMarkerEveryChange={(every) => {
            if (every == null) {
              onTraceOverrideChange(trace.traceKey, {}, ["markerEvery"]);
              return;
            }
            onTraceOverrideChange(trace.traceKey, { markerEvery: every });
          }}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate font-medium leading-tight",
            compact ? "text-[11px]" : "text-xs",
            !trace.hasColorOverride &&
              !trace.hasLineDashOverride &&
              !trace.hasMarkerOverride &&
            !trace.hasLineWidthOverride &&
            !trace.hasMarkerSizeOverride &&
            !trace.hasMarkerEveryOverride &&
              "text-muted",
          )}
        >
          {trace.label}
        </p>
      </div>
    </li>
  );
});
