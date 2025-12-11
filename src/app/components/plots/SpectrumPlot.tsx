"use client";

import type {
  SpectrumPlotProps,
  SpectrumPoint,
  SpectrumSelection,
} from "./core/types";
import { VisxSpectrumPlot } from "./visx/VisxSpectrumPlot";

// Re-export types for backward compatibility
export type { SpectrumPoint, SpectrumSelection } from "./core/types";

/**
 * Spectrum plot component - thin wrapper around visx implementation
 */
export function SpectrumPlot(props: SpectrumPlotProps) {
  return <VisxSpectrumPlot {...props} />;
}
