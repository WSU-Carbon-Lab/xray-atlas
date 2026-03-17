"use client";

import type { SpectrumPlotProps } from "./types";
import { PlotContainer } from "./spectrum/PlotContainer";
import { SpectrumPlotInner } from "./spectrum/SpectrumPlotInner";
import type { CursorMode } from "./spectrum/ModeBar";

export type { SpectrumPoint, SpectrumSelection } from "./types";

export function SpectrumPlot(
  props: SpectrumPlotProps & {
    cursorMode?: CursorMode;
    onCursorModeChange?: (mode: CursorMode) => void;
  },
) {
  if (props.points.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--surface-1)] p-6 text-sm text-[var(--text-secondary)]">
        Upload a spectrum CSV to preview data.
      </div>
    );
  }
  return (
    <PlotContainer height={props.height}>
      {({ width, height }) => (
        <SpectrumPlotInner width={width} height={height} {...props} />
      )}
    </PlotContainer>
  );
}
