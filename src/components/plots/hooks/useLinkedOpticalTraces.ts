import { useMemo } from "react";
import type {
  NexafsImaginaryChannelId,
  NexafsRealChannelId,
} from "~/features/process-nexafs/nexafs-plot-channels";
import type { SpectrumPoint, TraceData, TraceMarkerSymbol } from "../types";
import {
  angleLabelForSpectrumGeometryGroup,
  linkedOpticalAngleColumnTitle,
  resolveLinkedOpticalAngleSplit,
  type SpectrumGeometryAngleSplit,
} from "../spectrum/spectrum-geometry-legend-angle";
import type { LinkedSpectrumGeometryLegendRow } from "../spectrum/spectrum-geometry-legend-types";
import { SPECTRUM_TRACE_LINE_WIDTH } from "../constants";
import { filterSpectrumPointsForGroupedPlot } from "./useSpectrumData";
import {
  groupPointsByGeometry,
  sortedGeometryGroupEntries,
} from "../utils/trace-utils";
import { lineDashForOpticalSplitPanel } from "../utils/optical-link-split-utils";

export type { LinkedSpectrumGeometryLegendRow as LinkedOpticalLegendRow } from "../spectrum/spectrum-geometry-legend-types";
export {
  linkedOpticalAngleColumnTitle,
  resolveLinkedOpticalAngleSplit,
} from "../spectrum/spectrum-geometry-legend-angle";
export type { SpectrumGeometryAngleSplit as LinkedOpticalAngleSplit } from "../spectrum/spectrum-geometry-legend-angle";

/** Active or companion channel in an imaginary/real linked overlay. */
export type OpticalLinkChannelRole =
  | NexafsImaginaryChannelId
  | NexafsRealChannelId;

/**
 * Per-geometry linked imaginary/real overlay: imaginary-role traces are solid, real-role traces are
 * dashed (primary or companion). Replaces flat `companionSpectra` for link mode.
 */
export type OpticalLinkPlotConfig = {
  readonly primaryRole: OpticalLinkChannelRole;
  readonly imaginaryRole: NexafsImaginaryChannelId;
  readonly realRole: NexafsRealChannelId;
  readonly imaginaryGlyph: string;
  readonly realGlyph: string;
  readonly companionPoints: readonly SpectrumPoint[];
};

function markerSymbolForOpticalRole(
  role: OpticalLinkChannelRole,
  config: OpticalLinkPlotConfig,
): TraceMarkerSymbol {
  return role === config.imaginaryRole ? "circle" : "square";
}

function lineDashForOpticalRole(
  role: OpticalLinkChannelRole,
  config: OpticalLinkPlotConfig,
): "solid" | "dash" {
  const panelRole =
    role === config.imaginaryRole ? "imaginary" : "real";
  return lineDashForOpticalSplitPanel(panelRole);
}

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

/**
 * Builds per-geometry companion traces that reuse primary trace colors and role-based line dash
 * (imaginary solid, real dashed); also returns legend rows for the imaginary | real | angle layout.
 */
export function buildLinkedOpticalCompanionTraces(args: {
  readonly primaryTraces: readonly TraceData[];
  readonly geometryKeys: readonly string[];
  readonly config: OpticalLinkPlotConfig;
  readonly showThetaData: boolean;
  readonly showPhiData: boolean;
}): {
  readonly companionTraces: TraceData[];
  readonly legendRows: LinkedSpectrumGeometryLegendRow[];
  readonly angleColumnTitle: string;
  readonly angleSplit: SpectrumGeometryAngleSplit;
} {
  const { primaryTraces, geometryKeys, config, showThetaData, showPhiData } =
    args;
  const companionRole: OpticalLinkChannelRole =
    config.primaryRole === config.imaginaryRole
      ? config.realRole
      : config.imaginaryRole;
  const companionGlyph =
    companionRole === config.imaginaryRole
      ? config.imaginaryGlyph
      : config.realGlyph;

  const filteredCompanion = filterSpectrumPointsForGroupedPlot(
    [...config.companionPoints],
    showThetaData,
    showPhiData,
  );
  const companionGroups = groupPointsByGeometry(filteredCompanion);
  const orderedCompanion = sortedGeometryGroupEntries(companionGroups);

  const companionByKey = new Map(orderedCompanion);

  const companionTraces: TraceData[] = [];
  const legendRows: LinkedSpectrumGeometryLegendRow[] = [];

  const legendGeometries = geometryKeys.flatMap((key, index) => {
    const primary = primaryTraces[index];
    const group = companionByKey.get(key);
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

  geometryKeys.forEach((key, index) => {
    const primary = primaryTraces[index];
    const group = companionByKey.get(key);
    if (!primary || !group) {
      return;
    }
    const theta = resolveFiniteAngle(primary, group, "theta");
    const phi = resolveFiniteAngle(primary, group, "phi");

    const color =
      primary.line?.color ?? primary.marker?.color ?? "#6b7280";
    const imaginaryTraceId = `link-imaginary-${key}`;
    const realTraceId = `link-real-${key}`;
    const imaginaryLineDash = lineDashForOpticalRole(
      config.imaginaryRole,
      config,
    );
    const realLineDash = lineDashForOpticalRole(config.realRole, config);

    legendRows.push({
      geometryKey: key,
      color,
      angleLabel: angleLabelForSpectrumGeometryGroup(
        { theta, phi, label: group.label },
        showThetaData,
        showPhiData,
        angleSplit,
      ),
      imaginaryTraceId,
      realTraceId,
      imaginaryLineDash,
      realLineDash,
    });

    companionTraces.push({
      type: "scattergl",
      mode: "lines+markers",
      name: `${companionRole}-${key}`,
      legendId:
        companionRole === config.imaginaryRole
          ? imaginaryTraceId
          : realTraceId,
      x: group.energies,
      y: group.absorptions,
      theta: group.theta,
      phi: group.phi,
      marker: {
        color,
        size: 4,
        opacity: 0.7,
        symbol: markerSymbolForOpticalRole(companionRole, config),
      },
      line: {
        color,
        width: SPECTRUM_TRACE_LINE_WIDTH,
        dash: lineDashForOpticalRole(companionRole, config),
      },
      showlegend: false,
      hovertemplate:
        `<b>${companionGlyph} ${group.label}</b><br>` +
        "Energy: %{x:.3f} eV<br>Value: %{y:.4f}" +
        "<extra></extra>",
    });
  });

  const angleColumnTitle = linkedOpticalAngleColumnTitle(
    showThetaData,
    showPhiData,
    angleSplit,
  );

  return { companionTraces, legendRows, angleColumnTitle, angleSplit };
}

export function tagPrimaryTracesForOpticalLink(
  traces: TraceData[],
  geometryKeys: readonly string[],
  config: OpticalLinkPlotConfig,
): TraceData[] {
  return traces.map((trace, index) => {
    const key = geometryKeys[index] ?? `idx-${index}`;
    const traceId =
      config.primaryRole === config.imaginaryRole
        ? `link-imaginary-${key}`
        : `link-real-${key}`;
    const primaryDash = lineDashForOpticalRole(config.primaryRole, config);
    return {
      ...trace,
      legendId: traceId,
      showlegend: false,
      marker: {
        ...trace.marker,
        symbol: markerSymbolForOpticalRole(config.primaryRole, config),
      },
      line: {
        ...trace.line,
        dash: primaryDash,
      },
    };
  });
}

export function useLinkedOpticalTraces(
  primaryTraces: TraceData[],
  geometryKeys: readonly string[],
  config: OpticalLinkPlotConfig | undefined,
  showThetaData: boolean,
  showPhiData: boolean,
): {
  readonly primaryTraces: TraceData[];
  readonly companionTraces: TraceData[];
  readonly legendRows: LinkedSpectrumGeometryLegendRow[];
  readonly angleColumnTitle: string;
  readonly active: boolean;
} {
  return useMemo(() => {
    if (!config || config.companionPoints.length === 0) {
      return {
        primaryTraces,
        companionTraces: [],
        legendRows: [],
        angleColumnTitle: linkedOpticalAngleColumnTitle(
          showThetaData,
          showPhiData,
        ),
        active: false,
      };
    }
    const tagged = tagPrimaryTracesForOpticalLink(
      primaryTraces,
      geometryKeys,
      config,
    );
    const built = buildLinkedOpticalCompanionTraces({
      primaryTraces: tagged,
      geometryKeys,
      config,
      showThetaData,
      showPhiData,
    });
    return {
      primaryTraces: tagged,
      companionTraces: built.companionTraces,
      legendRows: built.legendRows,
      angleColumnTitle: built.angleColumnTitle,
      active: true,
    };
  }, [
    primaryTraces,
    geometryKeys,
    config,
    showThetaData,
    showPhiData,
  ]);
}
