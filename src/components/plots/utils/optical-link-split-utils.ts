import { SPECTRUM_TRACE_LINE_WIDTH } from "../constants";
import type { TraceData } from "../types";
import type { OpticalLinkPlotConfig } from "../hooks/useLinkedOpticalTraces";
import {
  OPTICAL_LINK_IMAGINARY_PREFIX,
  OPTICAL_LINK_REAL_PREFIX,
} from "./linked-optical-area-bands";

export { OPTICAL_LINK_IMAGINARY_PREFIX, OPTICAL_LINK_REAL_PREFIX };

export type OpticalLinkSplitRole = "imaginary" | "real";

export type OpticalLinkSplitLineDash = "solid" | "dash";

/** Line style for the top (imaginary) vs bottom (real) stacked split panels. */
export function lineDashForOpticalSplitPanel(
  role: OpticalLinkSplitRole,
): OpticalLinkSplitLineDash {
  return role === "imaginary" ? "solid" : "dash";
}

/**
 * Forces each trace in a split panel to the role-appropriate linestyle (imaginary solid, real dashed).
 */
export function withOpticalLinkSplitPanelLineDash(
  traces: readonly TraceData[],
  panelRole: OpticalLinkSplitRole,
): TraceData[] {
  const dash = lineDashForOpticalSplitPanel(panelRole);
  return traces.map((trace) => {
    const color =
      trace.line?.color ?? trace.marker?.color ?? "#6b7280";
    const width =
      typeof trace.line?.width === "number"
        ? trace.line.width
        : SPECTRUM_TRACE_LINE_WIDTH;
    return {
      ...trace,
      line: {
        ...trace.line,
        color,
        width,
        dash,
      },
    };
  });
}

/**
 * Classifies a trace for stacked imaginary/real split panels: linked geometry ids,
 * bare-atom overlays (`lineDash` solid on imaginary, dash on real), or neutral (hidden in split mode).
 */
export function opticalLinkSplitRoleForTrace(
  trace: TraceData,
  config: OpticalLinkPlotConfig | undefined,
): OpticalLinkSplitRole | "neutral" {
  const legendId = trace.legendId;
  if (typeof legendId === "string") {
    if (legendId.startsWith(OPTICAL_LINK_IMAGINARY_PREFIX)) {
      return "imaginary";
    }
    if (legendId.startsWith(OPTICAL_LINK_REAL_PREFIX)) {
      return "real";
    }
  }
  const dash = trace.line?.dash;
  if (dash === "dash") {
    return "real";
  }
  if (dash === "solid") {
    return "imaginary";
  }
  const name = typeof trace.name === "string" ? trace.name : "";
  if (config) {
    if (name.includes(config.imaginaryGlyph)) {
      return "imaginary";
    }
    if (name.includes(config.realGlyph)) {
      return "real";
    }
  }
  if (/bare\s*atom/i.test(name)) {
    return "imaginary";
  }
  return "neutral";
}

/** Keeps traces that belong on the imaginary (top) or real (bottom) split panel. */
export function filterTracesForOpticalLinkSplitRole(
  traces: readonly TraceData[],
  role: OpticalLinkSplitRole,
  config: OpticalLinkPlotConfig | undefined,
): TraceData[] {
  return traces.filter(
    (trace) => opticalLinkSplitRoleForTrace(trace, config) === role,
  );
}

function finiteAbsorptionValues(trace: TraceData): number[] {
  const y = trace.y;
  if (!Array.isArray(y)) {
    return [];
  }
  return y.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
}

/**
 * Computes absorption min/max from trace y arrays for independent subplot y-scales.
 */
export function absorptionExtentFromTraces(
  traces: readonly TraceData[],
): { min: number; max: number } | null {
  const values: number[] = [];
  for (const trace of traces) {
    values.push(...finiteAbsorptionValues(trace));
  }
  if (values.length === 0) {
    return null;
  }
  return { min: Math.min(...values), max: Math.max(...values) };
}
