import type { ReferenceCurve } from "~/components/plots/types";
import type { NormalizationComputation } from "./core";
import type { BareAtomPoint } from "../types";
import {
  buildBareAtomReferenceCurve,
  type BareAtomReferenceDataView,
} from "./buildBareAtomReferenceCurve";

/**
 * Applies the same linear normalization scale and offset used for experimental mu
 * to tabulated bare-atom samples so overlays share the plotted y-axis basis.
 *
 * Do not use this transform for beta overlays: experimental beta is already on the
 * refractive-index scale (via {@link computeBetaIndex} / Henke), and scaling bare
 * mu first then converting to beta double-warps the step edge.
 */
export function transformBareAtomPointsWithNormalization(
  barePoints: readonly BareAtomPoint[],
  computation: Pick<NormalizationComputation, "scale" | "offset"> | null,
): BareAtomPoint[] {
  if (!computation) {
    return barePoints.map((point) => ({ ...point }));
  }
  const { scale, offset } = computation;
  return barePoints.map((point) => ({
    energy: point.energy,
    absorption: scale * point.absorption + offset,
  }));
}

/**
 * Builds bare-atom reference overlay curves for the NEXAFS upload plot.
 *
 * Mass-absorption overlays reuse the experimental mu linear transform. Beta and
 * delta overlays use the tabulated optical-constant basis without that transform
 * so the step edge matches browse / Henke scaling.
 */
export function buildUploadBareAtomReferenceCurves(args: {
  readonly barePoints: readonly BareAtomPoint[];
  readonly bareDeltaPoints: readonly BareAtomPoint[] | null;
  readonly dataView: BareAtomReferenceDataView;
  readonly muNormalization: Pick<
    NormalizationComputation,
    "scale" | "offset"
  > | null;
  readonly betaMuNormalization: Pick<
    NormalizationComputation,
    "scale" | "offset"
  > | null;
  readonly isDark?: boolean;
}): ReferenceCurve[] {
  const label =
    args.dataView === "beta"
      ? "Bare atom beta"
      : args.dataView === "delta"
        ? "Bare atom delta"
        : "Bare atom absorption";

  if (args.dataView === "delta") {
    const curve = buildBareAtomReferenceCurve({
      bareDelta: args.bareDeltaPoints ?? undefined,
      dataView: "delta",
      label,
      isDark: args.isDark,
    });
    return curve ? [curve] : [];
  }

  if (args.dataView === "beta") {
    const curve = buildBareAtomReferenceCurve({
      bareMu: args.barePoints,
      dataView: "beta",
      label,
      isDark: args.isDark,
    });
    return curve ? [curve] : [];
  }

  void args.betaMuNormalization;

  const normalizedBare = transformBareAtomPointsWithNormalization(
    args.barePoints,
    args.muNormalization,
  );

  const curve = buildBareAtomReferenceCurve({
    bareMu: normalizedBare,
    dataView: "absorption",
    label,
    isDark: args.isDark,
  });
  return curve ? [curve] : [];
}
