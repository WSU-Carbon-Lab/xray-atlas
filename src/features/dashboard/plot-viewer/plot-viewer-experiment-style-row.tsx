"use client";

import { memo } from "react";
import { cn } from "@heroui/styles";
import type { PlotViewerExperimentStyleItem } from "./plot-viewer-experiment-styles";
import type { PlotViewerExperimentColorMode } from "./plot-viewer-style-overrides";
import {
  PlotViewerColorStylePopover,
  PlotViewerLineStylePopover,
  PlotViewerMarkerStylePopover,
} from "./plot-viewer-style-control-popover";
import type {
  PlotViewerLineDash,
  PlotViewerMarkerSymbol,
  PlotViewerPaletteId,
} from "./plot-viewer-trace-styles";

export type PlotViewerExperimentStyleRowProps = {
  item: PlotViewerExperimentStyleItem;
  paletteId: PlotViewerPaletteId;
  isDark?: boolean;
  onPaletteChange?: (paletteId: PlotViewerPaletteId) => void;
  onColorModeChange: (
    experimentId: string,
    mode: PlotViewerExperimentColorMode,
    fixedColor: string | null,
  ) => void;
  onExperimentLineDashChange: (
    experimentId: string,
    lineDash: PlotViewerLineDash | null,
  ) => void;
  onExperimentLineWidthChange: (
    experimentId: string,
    lineWidth: number | null,
  ) => void;
  onExperimentMarkerChange: (
    experimentId: string,
    marker: PlotViewerMarkerSymbol | null,
  ) => void;
  onExperimentMarkerSizeChange: (
    experimentId: string,
    markerSize: number | null,
  ) => void;
  onExperimentMarkerEveryChange: (
    experimentId: string,
    markerEvery: number | null,
  ) => void;
  className?: string;
};

/**
 * Compact always-visible experiment style row: color, line, and marker popovers plus label pill.
 */
export const PlotViewerExperimentStyleRow = memo(function PlotViewerExperimentStyleRow({
  item,
  paletteId,
  isDark = false,
  onPaletteChange,
  onColorModeChange,
  onExperimentLineDashChange,
  onExperimentLineWidthChange,
  onExperimentMarkerChange,
  onExperimentMarkerSizeChange,
  onExperimentMarkerEveryChange,
  className,
}: PlotViewerExperimentStyleRowProps) {
  return (
    <div
      className={cn(
        "flex min-h-9 w-full min-w-0 items-center gap-1.5",
        className,
      )}
    >
      <PlotViewerColorStylePopover
        mode="experiment"
        colorMode={item.colorMode}
        paletteId={paletteId}
        isDark={isDark}
        effectiveColor={item.effectiveColor}
        inheritedColor={item.schemeColor}
        schemeColor={item.schemeColor}
        previewColor={item.effectiveColor}
        idPrefix={`plot-viewer-exp-color-${item.experimentId}`}
        onPaletteChange={onPaletteChange}
        onColorModeChange={(mode, fixedColor) => {
          onColorModeChange(item.experimentId, mode, fixedColor);
        }}
        onFixedColorChange={(hex) => {
          onColorModeChange(item.experimentId, "fixed", hex);
        }}
      />

      <PlotViewerLineStylePopover
        mode="experiment"
        effectiveLineDash={item.effectiveLineDash}
        inheritedLineDash={item.inheritedLineDash}
        effectiveLineWidth={item.effectiveLineWidth}
        inheritedLineWidth={item.inheritedLineWidth}
        previewColor={item.effectiveColor}
        hasLineDashOverride={item.hasLineDashOverride}
        hasLineWidthOverride={item.hasLineWidthOverride}
        onLineDashChange={(lineDash) => {
          onExperimentLineDashChange(item.experimentId, lineDash);
        }}
        onLineWidthChange={(width) => {
          onExperimentLineWidthChange(item.experimentId, width);
        }}
      />

      <PlotViewerMarkerStylePopover
        mode="experiment"
        effectiveMarker={item.effectiveMarker}
        inheritedMarker={item.inheritedMarker}
        effectiveMarkerSize={item.effectiveMarkerSize}
        inheritedMarkerSize={item.inheritedMarkerSize}
        effectiveMarkerEvery={item.effectiveMarkerEvery}
        inheritedMarkerEvery={undefined}
        previewColor={item.effectiveColor}
        hasMarkerOverride={item.hasMarkerOverride}
        hasMarkerSizeOverride={item.hasMarkerSizeOverride}
        hasMarkerEveryOverride={item.hasMarkerEveryOverride}
        onMarkerChange={(marker) => {
          onExperimentMarkerChange(item.experimentId, marker);
        }}
        onMarkerSizeChange={(size) => {
          onExperimentMarkerSizeChange(item.experimentId, size);
        }}
        onMarkerEveryChange={(every) => {
          onExperimentMarkerEveryChange(item.experimentId, every);
        }}
      />

      <div className="border-border bg-default/30 min-w-0 flex-1 rounded-md border px-2 py-0.5">
        <p className="text-foreground truncate text-xs font-medium leading-tight">
          {item.label}
        </p>
        <p className="text-muted truncate text-[10px] leading-tight">
          {item.traces.length} trace{item.traces.length === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
});
