import type { ReferenceCurve } from "~/components/plots/types";
import type { BareAtomPoint } from "../types";
import {
  buildBareAtomReferenceCurve,
  type BareAtomReferenceDataView,
} from "./buildBareAtomReferenceCurve";

/**
 * Builds bare-atom reference overlay curves for the NEXAFS upload plot.
 *
 * Prefer {@link bareAtomReferencesForOverlay} from the representation matrix for
 * contribute/browse plots. This helper keeps a sync path for absorption/beta/delta
 * overlays from already-fetched Henke samples. Overlays are visualization-only and
 * stay on the Henke/CXRO basis (no experimental mu affine).
 */
export function buildUploadBareAtomReferenceCurves(args: {
  readonly barePoints: readonly BareAtomPoint[];
  readonly bareDeltaPoints: readonly BareAtomPoint[] | null;
  readonly dataView: BareAtomReferenceDataView;
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

  const curve = buildBareAtomReferenceCurve({
    bareMu: args.barePoints,
    dataView: "absorption",
    label,
    isDark: args.isDark,
  });
  return curve ? [curve] : [];
}
