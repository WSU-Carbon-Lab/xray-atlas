/**
 * Core type definitions for spectrum plotting
 * Extracted from SpectrumPlot.tsx for reuse across renderers
 */

export type SpectrumPoint = {
  energy: number;
  absorption: number;
  theta?: number;
  phi?: number;
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
};

export type NormalizationRegions = {
  pre: [number, number] | null;
  post: [number, number] | null;
};

export type Peak = {
  energy: number;
  amplitude?: number;
  width?: number;
  id?: string;
  isStep?: boolean;
};

export type DifferenceSpectrum = {
  label: string;
  points: SpectrumPoint[];
  preferred?: boolean;
};

export type SpectrumPlotProps = {
  points: SpectrumPoint[];
  height?: number;
  energyStats?: AxisStats;
  absorptionStats?: AxisStats;
  referenceCurves?: ReferenceCurve[];
  normalizationRegions?: NormalizationRegions;
  selectionTarget?: "pre" | "post" | null;
  onSelectionChange?: (selection: SpectrumSelection | null) => void;
  peaks?: Peak[];
  selectedPeakId?: string | null;
  onPeakUpdate?: (peakId: string, energy: number) => void;
  onPeakSelect?: (peakId: string | null) => void;
  onPeakDelete?: (peakId: string) => void;
  onPeakAdd?: (energy: number) => void;
  isManualPeakMode?: boolean;
  differenceSpectra?: DifferenceSpectrum[];
  showThetaData?: boolean;
  showPhiData?: boolean;
  selectedGeometry?: { theta?: number; phi?: number } | null;
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
