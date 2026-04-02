/**
 * Hook for processing reference curves and difference spectra
 */

import { useMemo } from "react";
import type { TraceData, ReferenceCurve, DifferenceSpectrum } from "../types";
import type { SpectrumPoint } from "../types";
import {
  SPECTRUM_TRACE_GRADIENT_DARK,
  SPECTRUM_TRACE_GRADIENT_LIGHT,
  spectrumTraceColorAlongGradient,
} from "../constants";

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
  isDark: boolean,
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
        "Energy: %{x:.3f} eV<br>Value: %{y:.4f}" +
        "<extra></extra>",
      showlegend: curve.showInLegend !== false,
    }));
  }, [referenceCurves]);

  const differenceTraces = useMemo<TraceData[]>(() => {
    const palette = isDark
      ? SPECTRUM_TRACE_GRADIENT_DARK
      : SPECTRUM_TRACE_GRADIENT_LIGHT;

    const inferDiffMode = (label: string): "theta" | "phi" =>
      /Δ[φΦ]/u.test(label) ? "phi" : "theta";

    const sortedDiffs = [...differenceSpectra].sort((a, b) => {
      const la = typeof a.lowerAngle === "number" ? a.lowerAngle : 0;
      const lb = typeof b.lowerAngle === "number" ? b.lowerAngle : 0;
      if (la !== lb) return la - lb;
      const ha =
        typeof a.higherAngle === "number" ? a.higherAngle : 0;
      const hb =
        typeof b.higherAngle === "number" ? b.higherAngle : 0;
      return ha - hb;
    });

    const thetaModeDiffs = sortedDiffs.filter(
      (d) => inferDiffMode(d.label) === "theta",
    );
    const phiValues = thetaModeDiffs
      .map((d): number | undefined => {
        const first: SpectrumPoint | undefined = d.points[0];
        return typeof first?.phi === "number" ? first.phi : undefined;
      })
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const uniquePhi = new Set(phiValues);
    const singlePhi = phiValues.length > 0 && uniquePhi.size <= 1;

    const phiModeDiffs = sortedDiffs.filter(
      (d) => inferDiffMode(d.label) === "phi",
    );
    const thetaValues = phiModeDiffs
      .map((d): number | undefined => {
        const first: SpectrumPoint | undefined = d.points[0];
        return typeof first?.theta === "number" ? first.theta : undefined;
      })
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const uniqueTheta = new Set(thetaValues);
    const singleTheta = thetaValues.length > 0 && uniqueTheta.size <= 1;

    const formatLabel = (
      diffLabel: string,
      diffMode: "theta" | "phi",
    ) => {
      if (diffMode === "theta" && singlePhi) {
        return diffLabel.replace(/\s*\((φ|phi)=[^)]+\)\s*/u, "").trim();
      }
      if (diffMode === "phi" && singleTheta) {
        return diffLabel.replace(/\s*\((θ|theta)=[^)]+\)\s*/u, "").trim();
      }
      return diffLabel;
    };

    const nonPreferred = sortedDiffs.filter((d) => !d.preferred);

    return sortedDiffs.map((diff) => {
      const isPreferred = diff.preferred ?? false;
      const color = isPreferred
        ? "#dc2626"
        : spectrumTraceColorAlongGradient(
            palette,
            nonPreferred.indexOf(diff),
            Math.max(1, nonPreferred.length),
          );
      const diffMode = inferDiffMode(diff.label);
      const label = formatLabel(diff.label, diffMode);
      return {
        type: "scattergl",
        mode: "lines",
        name: label + (isPreferred ? " ⭐" : ""),
        x: diff.points.map((point) => point.energy),
        y: diff.points.map((point) => point.absorption),
        line: {
          color,
          width: isPreferred ? 2.5 : 2,
          dash: "dash",
        },
        hovertemplate:
          `<b>${label}</b><br>` +
          "Energy: %{x:.3f} eV<br>Difference: %{y:.4f}" +
          "<extra></extra>",
        showlegend: true,
      };
    });
  }, [differenceSpectra, isDark]);

  return {
    referenceTraces,
    differenceTraces,
  };
}
