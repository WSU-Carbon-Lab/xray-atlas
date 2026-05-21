import type { TraceData } from "../types";
import type { SpectrumYAxisQuantity } from "../types";
import {
  angleLabelForSpectrumGeometryGroup,
  linkedOpticalAngleColumnTitle,
  resolveLinkedOpticalAngleSplit,
} from "./spectrum-geometry-legend-angle";

/** One linked imaginary/real geometry row in the in-plot legend. */
export type LinkedSpectrumGeometryLegendRow = {
  readonly geometryKey: string;
  readonly color: string;
  readonly angleLabel: string;
  readonly imaginaryTraceId: string;
  readonly realTraceId: string;
  readonly imaginaryLineDash: "solid" | "dash";
  readonly realLineDash: "solid" | "dash";
};

/** @deprecated Use {@link LinkedSpectrumGeometryLegendRow}. */
export type LinkedOpticalLegendRow = LinkedSpectrumGeometryLegendRow;

/** One single-channel geometry row (solid line swatch + angle). */
export type SingleSpectrumGeometryLegendRow = {
  readonly geometryKey: string;
  readonly color: string;
  readonly angleLabel: string;
  readonly traceId: string;
  readonly lineDash: "solid";
};

function resolveFiniteAngle(
  primary: TraceData | undefined,
  group: { theta?: number; phi?: number },
  field: "theta" | "phi",
): number | undefined {
  const fromPrimary = primary?.[field];
  if (typeof fromPrimary === "number" && Number.isFinite(fromPrimary)) {
    return fromPrimary;
  }
  const fromGroup = group[field];
  if (typeof fromGroup === "number" && Number.isFinite(fromGroup)) {
    return fromGroup;
  }
  return undefined;
}

const CHANNEL_GLYPH_BY_QUANTITY: Record<SpectrumYAxisQuantity, string> = {
  "optical-density": "OD",
  "mass-absorption": "μ",
  beta: "β",
  delta: "δ",
  intensity: "I",
  "raw-upload": "Rw",
  "scattering-f2": "f₂",
  "scattering-f1": "f₁",
  "permittivity-im": "εᵢ",
  "permittivity-re": "εᵣ",
  "susceptibility-im": "χᵢ",
  "susceptibility-re": "χᵣ",
};

/**
 * Short header glyph for the active plotted channel in single-geometry legend mode.
 */
export function spectrumChannelGlyphForQuantity(
  quantity: SpectrumYAxisQuantity | undefined,
): string {
  if (!quantity) {
    return "—";
  }
  return CHANNEL_GLYPH_BY_QUANTITY[quantity] ?? "Ch";
}

/**
 * Builds per-geometry legend rows and angle column title for unlinked multi-trace spectrum views.
 */
export function buildSingleSpectrumGeometryLegendRows(args: {
  readonly traces: readonly TraceData[];
  readonly geometryKeys: readonly string[];
  readonly groups: ReadonlyMap<
    string,
    { label: string; theta?: number; phi?: number }
  >;
  readonly showThetaData: boolean;
  readonly showPhiData: boolean;
}): {
  readonly rows: SingleSpectrumGeometryLegendRow[];
  readonly angleColumnTitle: string;
} {
  const { traces, geometryKeys, groups, showThetaData, showPhiData } = args;

  const legendGeometries = geometryKeys.flatMap((key, index) => {
    const primary = traces[index];
    const group = groups.get(key);
    if (!primary || !group) {
      return [];
    }
    return [
      {
        theta: resolveFiniteAngle(primary, group, "theta"),
        phi: resolveFiniteAngle(primary, group, "phi"),
      },
    ];
  });
  const angleSplit = resolveLinkedOpticalAngleSplit(legendGeometries);

  const rows: SingleSpectrumGeometryLegendRow[] = [];
  geometryKeys.forEach((key, index) => {
    const primary = traces[index];
    const group = groups.get(key);
    if (!primary || !group) {
      return;
    }
    const theta = resolveFiniteAngle(primary, group, "theta");
    const phi = resolveFiniteAngle(primary, group, "phi");
    const color =
      primary.line?.color ?? primary.marker?.color ?? "#6b7280";
    rows.push({
      geometryKey: key,
      color,
      angleLabel: angleLabelForSpectrumGeometryGroup(
        { theta, phi, label: group.label },
        showThetaData,
        showPhiData,
        angleSplit,
      ),
      traceId: `geometry-${key}`,
      lineDash: "solid",
    });
  });

  return {
    rows,
    angleColumnTitle: linkedOpticalAngleColumnTitle(
      showThetaData,
      showPhiData,
      angleSplit,
    ),
  };
}
