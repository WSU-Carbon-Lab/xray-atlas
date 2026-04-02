/**
 * Core type definitions for spectrum plotting
 * Extracted from SpectrumPlot.tsx for reuse across renderers
 */
import type { ReactNode } from "react";

export type SpectrumPoint = {
  energy: number;
  absorption: number;
  theta?: number;
  phi?: number;
  i0?: number;
  od?: number;
  massabsorption?: number;
  beta?: number;
};

export type SpectrumSelection = {
  energyMin: number;
  energyMax: number;
  absorptionMin: number;
  absorptionMax: number;
  pointCount: number;
  geometryKeys: string[];
};

export type AxisStats = {
  min: number | null;
  max: number | null;
};

export type ReferenceCurve = {
  label: string;
  points: Array<{ energy: number; absorption: number }>;
  color?: string;
  /**
   * When false, the trace is drawn but omitted from the static legend (for example bare-atom overlays).
   */
  showInLegend?: boolean;
};

export type NormalizationRegions = {
  pre: [number, number] | null;
  post: [number, number] | null;
};

export type PlotContext =
  | { kind: "explore" }
  | { kind: "normalize"; target: "pre" | "post" }
  | { kind: "peak-edit" };

export type Peak = {
  energy: number;
  amplitude?: number;
  width?: number;
  id?: string;
  isStep?: boolean;
  peakKind?: string | null;
};

export type PeakAnnotationPatch = {
  energy?: number;
  peakKind?: string | null;
};

export type DifferenceSpectrum = {
  label: string;
  points: SpectrumPoint[];
  preferred?: boolean;
  lowerAngle?: number;
  higherAngle?: number;
  mode?: "theta" | "phi";
};

export type GraphStyle = "line" | "scatter" | "area";

export type SpectrumYAxisQuantity =
  | "optical-density"
  | "mass-absorption"
  | "beta"
  | "intensity";

export type SpectrumPlotProps = {
  points: SpectrumPoint[];
  height?: number;
  graphStyle?: GraphStyle;
  energyStats?: AxisStats;
  absorptionStats?: AxisStats;
  yAxisQuantity?: SpectrumYAxisQuantity;
  referenceCurves?: ReferenceCurve[];
  normalizationRegions?: NormalizationRegions;
  plotContext?: PlotContext;
  onSelectionChange?: (selection: SpectrumSelection | null) => void;
  peaks?: Peak[];
  selectedPeakId?: string | null;
  onPeakUpdate?: (peakId: string, energy: number) => void;
  onPeakPatch?: (peakId: string, patch: PeakAnnotationPatch) => void;
  onPeakSelect?: (peakId: string | null) => void;
  onPeakDelete?: (peakId: string) => void;
  onPeakAdd?: (energy: number) => void;
  differenceSpectra?: DifferenceSpectrum[];
  headerRight?: ReactNode;
  /**
   * Optional controls for the right-hand analysis tool rail (for example bare-atom overlay toggles).
   */
  headerAnalysis?: ReactNode;
  /**
   * Optional icon actions rendered in the top plot rail after Home (for example spectrum CSV download/copy menus). Fragments and arrays are flattened so each control is a direct sibling inside the same `ButtonGroup` as Home (continuous segment styling). When set, the default top-rail plot export shortcut is omitted; callers that still need export UI should include it inside this node or elsewhere.
   */
  plotTopRailDataActions?: ReactNode;
  showThetaData?: boolean;
  showPhiData?: boolean;
  selectedGeometry?: { theta?: number; phi?: number } | null;
  /**
   * When true, renders pre/post normalization band shading from `normalizationRegions` without enabling the interactive normalization brush (no `plotContext.kind === "normalize"` required).
   */
  showNormalizationShading?: boolean;
  /**
   * Replaces the default empty-state copy when `points` is empty (for example browse/preview surfaces that do not upload CSV here).
   */
  emptyStateMessage?: string;
};

/**
 * Unified trace representation (replaces Plotly PlotData for abstraction)
 * Used internally for data processing and rendering
 */
export type TraceData = {
  type: "scattergl" | "scatter";
  mode: "lines" | "markers" | "lines+markers";
  name?: string;
  x: number[];
  y: number[];
  line?: {
    color?: string;
    width?: number;
    dash?: "solid" | "dash" | "dot" | "dashdot";
  };
  marker?: {
    color?: string;
    size?: number;
    opacity?: number;
  };
  hovertemplate?: string;
  showlegend?: boolean;
  xaxis?: string;
  yaxis?: string;
  theta?: number;
  phi?: number;
};

/**
 * Legacy type - kept for backward compatibility during migration
 * @deprecated Use TraceData instead
 */
export type SpectrumTrace = {
  id: string;
  label: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  lineWidth?: number;
  lineDash?: "solid" | "dash" | "dot" | "dashdot";
  showMarkers?: boolean;
  markerSize?: number;
  markerOpacity?: number;
  hoverTemplate?: string;
  showLegend?: boolean;
  xaxis?: string;
  yaxis?: string;
};

/**
 * Grouped data by geometry
 */
export type GeometryGroup = {
  label: string;
  theta?: number;
  phi?: number;
  energies: number[];
  absorptions: number[];
};

/**
 * Configuration for scales
 */
export type ScaleConfig = {
  domain: [number, number];
  range: [number, number];
  nice?: boolean;
};

/**
 * Plot dimensions and margins
 */
export type PlotDimensions = {
  width: number;
  height: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
};

/**
 * Data extents for axis calculations
 */
export type DataExtents = {
  energyExtent: { min: number; max: number } | null;
  absorptionExtent: { min: number; max: number } | null;
};
