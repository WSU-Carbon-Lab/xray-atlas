import type { TraceData, TraceMarkerSymbol, SpectrumYAxisQuantity } from "../types";
import {
  getPlotChannelDefinition,
  isImaginaryChannel,
  isRealChannel,
  type NexafsPlotChannelId,
} from "~/features/process-nexafs/nexafs-plot-channels";
import {
  angleLabelForSpectrumGeometryGroup,
  linkedOpticalAngleColumnTitle,
  resolveLinkedOpticalAngleSplit,
} from "./spectrum-geometry-legend-angle";
import { spectrumChannelGlyphForQuantity } from "./spectrum-geometry-legend-types";
import { getTraceLabel } from "./utils";
import {
  LINKED_IMAGINARY_PREFIX,
  LINKED_REAL_PREFIX,
  parseTraceGeometryIdentity,
} from "./parse-trace-geometry-identity";

export type InspectPinTraceDisplay = {
  readonly rowKey: string;
  readonly channelGlyph: string;
  readonly angleLabel: string;
  readonly markerSymbol: TraceMarkerSymbol;
  readonly listLabel: string;
  readonly csvLabel: string;
  readonly isBareAtomBeta: boolean;
};

export type InspectPinDisplayContext = {
  readonly yAxisQuantity?: SpectrumYAxisQuantity;
  readonly showThetaData: boolean;
  readonly showPhiData: boolean;
  readonly linkedImaginaryGlyph?: string;
  readonly linkedRealGlyph?: string;
};

function parseGeometryKey(key: string): { theta?: number; phi?: number } {
  if (key === "fixed") {
    return {};
  }
  const [thetaRaw, phiRaw] = key.split(":");
  const theta = Number(thetaRaw);
  const phi = Number(phiRaw);
  return {
    theta: Number.isFinite(theta) ? theta : undefined,
    phi: Number.isFinite(phi) ? phi : undefined,
  };
}

function geometryFromTrace(trace: TraceData): { theta?: number; phi?: number } {
  const theta =
    typeof trace.theta === "number" && Number.isFinite(trace.theta)
      ? trace.theta
      : undefined;
  const phi =
    typeof trace.phi === "number" && Number.isFinite(trace.phi)
      ? trace.phi
      : undefined;
  return { theta, phi };
}

function formatThetaPrefixed(theta: number): string {
  return `θ=${theta.toFixed(1)}°`;
}

function formatPhiPrefixed(phi: number): string {
  return `φ=${phi.toFixed(1)}°`;
}

function angleCellLabel(
  trace: TraceData,
  geometryKey: string | undefined,
  split: ReturnType<typeof resolveLinkedOpticalAngleSplit>,
  ctx: InspectPinDisplayContext,
): string {
  const parsed = geometryKey ? parseGeometryKey(geometryKey) : {};
  const geom = geometryFromTrace(trace);
  const theta = geom.theta ?? parsed.theta;
  const phi = geom.phi ?? parsed.phi;
  const label = getTraceLabel(trace, 0);
  return angleLabelForSpectrumGeometryGroup(
    { theta, phi, label },
    ctx.showThetaData,
    ctx.showPhiData,
    split,
  );
}

function markerFromChannelId(id: NexafsPlotChannelId): TraceMarkerSymbol {
  if (isImaginaryChannel(id)) {
    return "circle";
  }
  if (isRealChannel(id)) {
    return "square";
  }
  return "circle";
}

function glyphForChannelId(id: NexafsPlotChannelId): string {
  return getPlotChannelDefinition(id).shortLabel;
}

function markerSymbolForTrace(
  trace: TraceData,
  parsed: {
    readonly linkKind: "imaginary" | "real" | null;
    readonly role: NexafsPlotChannelId | null;
  },
  ctx: InspectPinDisplayContext,
): TraceMarkerSymbol {
  if (trace.marker?.symbol === "circle" || trace.marker?.symbol === "square") {
    return trace.marker.symbol;
  }
  if (parsed.linkKind === "imaginary") {
    return "circle";
  }
  if (parsed.linkKind === "real") {
    return "square";
  }
  if (parsed.role) {
    return markerFromChannelId(parsed.role);
  }
  if (ctx.yAxisQuantity) {
    return markerSymbolForYAxisQuantity(ctx.yAxisQuantity);
  }
  return "circle";
}

function markerSymbolForYAxisQuantity(
  quantity: SpectrumYAxisQuantity,
): TraceMarkerSymbol {
  switch (quantity) {
    case "mass-absorption":
    case "scattering-f1":
    case "permittivity-re":
    case "susceptibility-re":
      return "square";
    default:
      return "circle";
  }
}

function channelGlyphForTrace(
  trace: TraceData,
  parsed: {
    readonly linkKind: "imaginary" | "real" | null;
    readonly role: NexafsPlotChannelId | null;
  },
  ctx: InspectPinDisplayContext,
): string {
  if (parsed.linkKind === "imaginary" && ctx.linkedImaginaryGlyph) {
    return ctx.linkedImaginaryGlyph;
  }
  if (parsed.linkKind === "real" && ctx.linkedRealGlyph) {
    return ctx.linkedRealGlyph;
  }
  if (parsed.role) {
    return glyphForChannelId(parsed.role);
  }
  if (ctx.yAxisQuantity) {
    return spectrumChannelGlyphForQuantity(ctx.yAxisQuantity);
  }
  const name = typeof trace.name === "string" ? trace.name : "";
  if (/bare\s*atom/i.test(name)) {
    return "β";
  }
  return getTraceLabel(trace, 0);
}

function listLabelForDisplay(
  markerSymbol: TraceMarkerSymbol,
  channelGlyph: string,
  angleLabel: string,
  split: ReturnType<typeof resolveLinkedOpticalAngleSplit>,
  ctx: InspectPinDisplayContext,
): string {
  const shape = markerSymbol === "square" ? "square" : "circle";
  const anglePart =
    angleLabel.length > 0
      ? angleLabel.includes("=")
        ? angleLabel
        : formatAngleForList(angleLabel, split, ctx)
      : "";
  if (!anglePart) {
    return `${shape} ${channelGlyph}`;
  }
  return `${shape} ${channelGlyph}, ${anglePart}`;
}

function formatAngleForList(
  angleLabel: string,
  split: ReturnType<typeof resolveLinkedOpticalAngleSplit>,
  ctx: InspectPinDisplayContext,
): string {
  const numeric = Number.parseFloat(angleLabel);
  if (!Number.isFinite(numeric)) {
    if (angleLabel.includes("·")) {
      return angleLabel;
    }
    return angleLabel;
  }
  if (ctx.showThetaData && !ctx.showPhiData) {
    return formatThetaPrefixed(numeric);
  }
  if (ctx.showPhiData && !ctx.showThetaData) {
    return formatPhiPrefixed(numeric);
  }
  if (split.singlePhi && !split.singleTheta) {
    return formatThetaPrefixed(numeric);
  }
  if (split.singleTheta && !split.singlePhi) {
    return formatPhiPrefixed(numeric);
  }
  return angleLabel;
}

/**
 * Builds human-readable inspect-pin row metadata (channel glyph, θ/φ, marker shape)
 * aligned with spectrum geometry legend and linked optical trace conventions.
 */
export function buildInspectPinTraceDisplays(
  traces: readonly TraceData[],
  ctx: InspectPinDisplayContext,
): InspectPinTraceDisplay[] {
  const geometries = traces.map((t) => {
    const id = parseTraceGeometryIdentity(t);
    const parsed = id.geometryKey ? parseGeometryKey(id.geometryKey) : {};
    const geom = geometryFromTrace(t);
    return {
      theta: geom.theta ?? parsed.theta,
      phi: geom.phi ?? parsed.phi,
    };
  });
  const split = resolveLinkedOpticalAngleSplit(geometries);

  return traces.map((trace, index) => {
    const parsed = parseTraceGeometryIdentity(trace);
    const markerSymbol = markerSymbolForTrace(trace, parsed, ctx);
    const channelGlyph = channelGlyphForTrace(trace, parsed, ctx);
    const angleLabel = angleCellLabel(trace, parsed.geometryKey, split, ctx);
    const name = typeof trace.name === "string" ? trace.name : "";
    const isBareAtomBeta = /^Bare atom beta\s*\(/i.test(name);
    const listLabel = isBareAtomBeta
      ? "Bare atom beta"
      : listLabelForDisplay(markerSymbol, channelGlyph, angleLabel, split, ctx);
    const csvLabel = isBareAtomBeta
      ? "bare_atom_beta"
      : `${channelGlyph}_${angleLabel.replace(/[^\d.]+/g, "_").replace(/_+/g, "_")}`;

    return {
      rowKey:
        (typeof trace.legendId === "string" && trace.legendId) ||
        name ||
        `trace-${index}`,
      channelGlyph,
      angleLabel,
      markerSymbol,
      listLabel,
      csvLabel,
      isBareAtomBeta,
    };
  });
}

/**
 * When true, the inspect pin popover uses a compact Trace | angle | y table.
 */
export function inspectPinPreferTableLayout(
  rowCount: number,
  traces: readonly TraceData[],
): boolean {
  if (rowCount >= 3) {
    return true;
  }
  const hasLinkedPair = traces.some((t) => {
    const id = t.legendId;
    return (
      typeof id === "string" &&
      (id.startsWith(LINKED_IMAGINARY_PREFIX) ||
        id.startsWith(LINKED_REAL_PREFIX))
    );
  });
  return hasLinkedPair && rowCount >= 2;
}

export function inspectPinAngleColumnTitle(
  traces: readonly TraceData[],
  ctx: InspectPinDisplayContext,
): string {
  const geometries = traces.map((t) => geometryFromTrace(t));
  const split = resolveLinkedOpticalAngleSplit(geometries);
  return linkedOpticalAngleColumnTitle(
    ctx.showThetaData,
    ctx.showPhiData,
    split,
  );
}
