"use client";

import type {
  SpectrumPlotProps,
  SpectrumPoint,
  SpectrumSelection,
} from "./core/types";
import { VisxSpectrumPlot } from "./visx/VisxSpectrumPlot";
import type { CursorMode } from "./visx/components/CursorModeSelector";

// Re-export types for backward compatibility
export type { SpectrumPoint, SpectrumSelection } from "./core/types";

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
