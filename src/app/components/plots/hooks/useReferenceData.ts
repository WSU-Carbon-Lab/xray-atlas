/**
 * Hook for processing reference curves and difference spectra
 */

import { useMemo } from "react";
import type { TraceData, ReferenceCurve, DifferenceSpectrum } from "../core/types";
import { COLORS } from "../core/constants";

export type ReferenceDataResult = {
  referenceTraces: TraceData[];
  differenceTraces: TraceData[];
};

/**
 * Process reference curves and difference spectra into trace data
 */
export function useReferenceData(
  referenceCurves: ReferenceCurve[],
  differenceSpectra: DifferenceSpectrum[],
): ReferenceDataResult {
  const referenceTraces = useMemo<TraceData[]>(() => {
    return referenceCurves.map((curve) => ({
      type: "scattergl",
      mode: "lines",
      name: curve.label,
      x: curve.points.map((point) => point.energy),
      y: curve.points.map((point) => point.absorption),
      line: {
        color: curve.color ?? "#111827",
        width: 2.5,
      },
      hovertemplate:
        `<b>${curve.label}</b><br>` +
        "Energy: %{x:.3f} eV<br>Bare μ: %{y:.3f}" +
        "<extra></extra>",
      showlegend: true,
    }));
  }, [referenceCurves]);

  const differenceTraces = useMemo<TraceData[]>(() => {
    return differenceSpectra.map((diff, index) => {
      const isPreferred = diff.preferred ?? false;
      const color = isPreferred
        ? "#d7263d"
        : (COLORS[(index + 8) % COLORS.length] ??
          `hsl(${((index + 8) * 57) % 360} 65% 55%)`);
      return {
        type: "scattergl",
        mode: "lines",
        name: diff.label + (isPreferred ? " ⭐" : ""),
        x: diff.points.map((point) => point.energy),
        y: diff.points.map((point) => point.absorption),
        line: {
          color,
          width: isPreferred ? 2.5 : 2,
          dash: "dash",
        },
        hovertemplate:
          `<b>${diff.label}</b><br>` +
          "Energy: %{x:.3f} eV<br>Difference: %{y:.4f}" +
          "<extra></extra>",
        showlegend: true,
      };
    });
  }, [differenceSpectra]);

  return {
    referenceTraces,
    differenceTraces,
  };
}
