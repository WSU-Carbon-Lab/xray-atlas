import type { ReferenceCurve } from "~/components/plots/types";

import type { BareAtomPoint } from "../types";
import { computeBetaIndex } from "./betaIndex";

/** Y-axis basis for a tabulated bare-atom reference overlay on spectrum plots. */
export type BareAtomReferenceDataView = "absorption" | "beta" | "delta";

const BARE_ATOM_REFERENCE_COLOR = "#6b7280";

/**
 * Builds one bare-atom reference trace from CXRO-derived samples: mu for absorption view, beta from
 * mu, or delta from precomputed Henke f1 mixing (see {@link calculateBareAtomDelta}).
 *
 * @param args.bareMu Henke/CXRO mass absorption on the plot energy grid; required for absorption and beta.
 * @param args.bareDelta Henke/CXRO delta on the plot energy grid; required for delta.
 * @param args.dataView Plot basis for the reference trace.
 * @param args.label Trace label (shown in tooltips; legend hidden by default).
 * @returns A reference curve, or `null` when inputs are insufficient.
 */
export function buildBareAtomReferenceCurve(args: {
  readonly bareMu?: readonly BareAtomPoint[];
  readonly bareDelta?: readonly BareAtomPoint[];
  readonly dataView: BareAtomReferenceDataView;
  readonly label: string;
}): ReferenceCurve | null {
  const base = {
    label: args.label,
    color: BARE_ATOM_REFERENCE_COLOR,
    showInLegend: false as const,
  };

  if (args.dataView === "delta") {
    const bareDelta = args.bareDelta ?? [];
    const points = bareDelta
      .filter((p) => Number.isFinite(p.energy) && Number.isFinite(p.absorption))
      .map((p) => ({
        energy: p.energy,
        absorption: p.absorption,
      }));
    if (points.length < 2) {
      return null;
    }
    return { ...base, points };
  }

  const bareMu = args.bareMu ?? [];
  if (bareMu.length === 0) {
    return null;
  }

  if (args.dataView === "absorption") {
    return {
      ...base,
      points: bareMu.map((p) => ({
        energy: p.energy,
        absorption: p.absorption,
      })),
    };
  }

  const muLike = bareMu.map((p) => ({
    energy: p.energy,
    absorption: p.absorption,
  }));
  const betaLike = computeBetaIndex(
    muLike,
    muLike.map((p) => p.energy),
    [...bareMu],
  );

  return {
    ...base,
    points: betaLike.map((p) => ({
      energy: p.energy,
      absorption: p.absorption,
    })),
  };
}
