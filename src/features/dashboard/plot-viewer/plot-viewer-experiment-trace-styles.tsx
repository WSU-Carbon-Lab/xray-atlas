"use client";

import { memo } from "react";
import { ScrollShadow } from "@heroui/react";
import type { PlotViewerExperimentStyleItem } from "./plot-viewer-experiment-styles";
import { PlotViewerTraceStyleRow } from "./plot-viewer-trace-style-row";
import type {
  PlotViewerExperimentColorMode,
  PlotViewerTraceStyleOverride,
} from "./plot-viewer-style-overrides";
import type { PlotViewerLineDash, PlotViewerMarkerSymbol } from "./plot-viewer-trace-styles";

export type PlotViewerExperimentTraceStylesProps = {
  item: PlotViewerExperimentStyleItem;
  onColorModeChange: (
    experimentId: string,
    mode: PlotViewerExperimentColorMode,
    fixedColor: string | null,
  ) => void;
  onExperimentLineDashChange: (
    experimentId: string,
    lineDash: PlotViewerLineDash | null,
  ) => void;
  onExperimentMarkerChange: (
    experimentId: string,
    marker: PlotViewerMarkerSymbol | null,
  ) => void;
  onTraceOverrideChange: (
    traceKey: string,
    patch: Partial<PlotViewerTraceStyleOverride>,
    clearKeys?: readonly (keyof PlotViewerTraceStyleOverride)[],
  ) => void;
};

/**
 * Scrollable per-trace style list shown when an experiment accordion section expands.
 */
export const PlotViewerExperimentTraceStyles = memo(
  function PlotViewerExperimentTraceStyles({
    item,
    onTraceOverrideChange,
  }: PlotViewerExperimentTraceStylesProps) {
    if (item.traces.length === 0) {
      return (
        <p className="text-muted px-1 py-1 text-[11px]">
          No traces loaded for this experiment.
        </p>
      );
    }

    return (
      <ScrollShadow className="max-h-56">
        <ul
          className="space-y-1"
          aria-label={`Trace styles for ${item.label}`}
        >
          {item.traces.map((trace) => (
            <PlotViewerTraceStyleRow
              key={trace.traceKey}
              trace={trace}
              onTraceOverrideChange={onTraceOverrideChange}
            />
          ))}
        </ul>
      </ScrollShadow>
    );
  },
);
