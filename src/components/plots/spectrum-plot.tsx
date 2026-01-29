"use client";

import type {
  SpectrumPlotProps,
  SpectrumPoint,
  SpectrumSelection,
} from "./types";
import { VisxSpectrumPlot } from "./visx/visx-spectrum-plot";
import type { CursorMode } from "./visx/CursorModeSelector";

export type { SpectrumPoint, SpectrumSelection } from "./types";

/**
 * Spectrum plot component - thin wrapper around visx implementation
 */
export function SpectrumPlot(
  props: SpectrumPlotProps & {
    cursorMode?: CursorMode;
    onCursorModeChange?: (mode: CursorMode) => void;
  },
) {
  return <VisxSpectrumPlot {...props} />;
}
