/**
 * Core type definitions for spectrum plotting
 * Extracted from SpectrumPlot.tsx for reuse across renderers
 */
import type { ReactNode } from "react";
import type { SpectrumPolarizationNode } from "~/features/process-nexafs/utils";
import type { OpticalLinkPlotConfig } from "./hooks/useLinkedOpticalTraces";

export type SpectrumPoint = {
  energy: number;
  absorption: number;
  rawabsError?: number;
  theta?: number;
  phi?: number;
  i0?: number;
  od?: number;
  odError?: number;
  massabsorption?: number;
  massabsorptionError?: number;
  beta?: number;
  betaError?: number;
  delta?: number;
  deltaError?: number;
  /** Uploaded raw absorption before normalization (database `rawabs`). */
  rawabs?: number;
};

/** One stacked subplot in {@link SpectrumPlotProps.traceStackPanels}. */
export type TraceStackPanel = {
  readonly label: string;
  readonly points: readonly SpectrumPoint[];
  readonly yAxisQuantity: SpectrumYAxisQuantity;
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
  lineDash?: "solid" | "dash" | "dot" | "dashdot";
  /**
   * When false, the trace is drawn but omitted from the static legend (for example bare-atom overlays).
   */
  showInLegend?: boolean;
};

export type NormalizationRegions = {
  pre: [number, number] | null;
  post: [number, number] | null;
};

/**
 * Identifies which normalization window edge is dragged when adjusting pre/post energy ranges on the plot.
 */
export type NormalizationRegionEdgeId =
  | "preMin"
  | "preMax"
  | "postMin"
  | "postMax";

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

/**
 * Transient, client-only marker produced when a user clicks the plot while the
 * inspect tool is active. Pinned points are intentionally not persisted; they
 * exist only inside the plot component state to support ad-hoc comparison of
 * energy values and per-trace intensities across the currently visible spectra.
 *
 * Only the stable `id` and axis `energy` are stored. Trace values shown in the
 * associated popover are derived from the live visible traces each render so
 * that normalization toggles, legend changes, and y-axis quantity switches stay
 * reflected without having to refresh pins.
 */
export type PinnedInspectPoint = {
  id: string;
  energy: number;
};

export type DifferenceSpectrum = {
  label: string;
  points: SpectrumPoint[];
  preferred?: boolean;
  /** When set, overrides the default companion trace palette color (for example STXM region colors). */
  color?: string;
  /**
   * Stable visibility key for in-plot legend toggles; when set, overrides index-based companion ids.
   */
  legendId?: string;
  /** Region spot label for region-scoped legend rows (without channel prefix). */
  regionSpotLabel?: string;
  lowerAngle?: number;
  higherAngle?: number;
  mode?: "theta" | "phi";
};

export type GraphStyle = "line" | "scatter" | "area";

/** Scatter marker glyph for linked imaginary (circle) vs real (square) optical traces. */
export type TraceMarkerSymbol = "circle" | "square";

/**
 * Vertical axis quantity for NEXAFS spectrum plots. `delta` is the real part of
 * the complex refractive index (Kramers–Kronig decrement) when stored per point;
 * use only when finite `SpectrumPoint.delta` exists for the active trace.
 */
export type SpectrumYAxisQuantity =
  | "optical-density"
  | "mass-absorption"
  | "beta"
  | "delta"
  | "intensity"
  | "raw-upload"
  | "scattering-f2"
  | "scattering-f1"
  | "permittivity-im"
  | "permittivity-re"
  | "susceptibility-im"
  | "susceptibility-re";

const SPECTRUM_Y_AXIS_ZERO_ANCHOR_QUANTITIES = new Set<SpectrumYAxisQuantity>([
  "optical-density",
  "beta",
  "delta",
  "intensity",
  "raw-upload",
  "scattering-f2",
  "permittivity-im",
  "susceptibility-im",
]);

/**
 * When true, the main plot y-domain is expanded to include zero after data padding.
 * Use for signed or baseline-centered channels (β, δ, Im(ε), Im(χ), OD, raw intensity, f₂).
 */
export function spectrumYAxisAnchorsAtZero(
  quantity: SpectrumYAxisQuantity | undefined,
): boolean {
  return (
    quantity !== undefined &&
    SPECTRUM_Y_AXIS_ZERO_ANCHOR_QUANTITIES.has(quantity)
  );
}

/**
 * When true, the y-domain follows trace min/max plus linear padding only (no mandatory zero).
 * Use for quantities that sit near unity or another offset (Re(ε), f₁, Re(χ), mass absorption).
 */
export function spectrumYAxisUsesDataExtentsOnly(
  quantity: SpectrumYAxisQuantity | undefined,
): boolean {
  return quantity !== undefined && !spectrumYAxisAnchorsAtZero(quantity);
}

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
  /**
   * Secondary geometry traces overlaid on the main plot (for example linked real/imaginary partners).
   * Unlike difference spectra, these do not hide the primary traces.
   */
  companionSpectra?: DifferenceSpectrum[];
  /**
   * When set, overlays a linked imaginary/real channel pair per geometry (β↔δ, f₂↔f₁, Im/Re ε, Im/Re χ)
   * with matching colors; imaginary-role lines are solid and real-role lines are dashed. Replaces flat `companionSpectra`
   * for imaginary/real link mode.
   */
  opticalLink?: OpticalLinkPlotConfig;
  /**
   * When true with `opticalLink`, stacks imaginary traces (top) and real traces (bottom) on one
   * shared energy axis and zoom domain; disables linked area between-fill bands.
   */
  opticalLinkSplitView?: boolean;
  /**
   * When true with {@link traceStackPanels}, stacks each panel on its own y-range sharing one energy axis.
   */
  traceStackSplitView?: boolean;
  /** Per-panel points for multi-channel STXM (or similar) stacked split view. */
  traceStackPanels?: readonly TraceStackPanel[];
  /**
   * @deprecated Pass split/coalesce controls via `headerAnalysis` on the right analysis rail.
   */
  opticalLinkSplitToggle?: ReactNode;
  /**
   * @deprecated Use `opticalLink`. Kept for callers not yet migrated.
   */
  betaDeltaLink?: OpticalLinkPlotConfig;
  /**
   * Optional controls for the **left** vertical plot tool rail (`PlotToolRailsDeck` display rail):
   * trace basis toggles, difference/bare-atom view, and normalization tooling when applicable.
   */
  headerRight?: ReactNode;
  /**
   * Optional controls for the **right** vertical plot tool rail (`PlotToolRailsDeck` analysis rail),
   * for example peak editing and Kramers–Kronig actions that should stay off the left rail. Pass
   * `suppressAnalysisRailLeadingGrip` when this rail should omit the decorative top grip.
   */
  headerAnalysis?: ReactNode;
  /**
   * When true, hides the decorative grip control at the top of the right analysis rail
   * (`PlotToolRailsDeck`) so stacked analysis toolbars (peaks, KK) fill the rail without a dummy
   * handle. Defaults to false so other plots keep the prior chrome.
   */
  suppressAnalysisRailLeadingGrip?: boolean;
  /**
   * Optional controls for the bottom plot tool rail (`PlotToolRailsDeck`), for example
   * Kramers–Kronig recalculate actions that should not sit on the right analysis stack.
   */
  plotBottomTools?: ReactNode;
  /**
   * Optional icon actions rendered in the top plot rail after Home (for example spectrum CSV download/copy menus). Fragments and arrays are flattened so each control is a direct sibling inside the same `ButtonGroup` as Home (continuous segment styling). When set, the default top-rail plot export shortcut is omitted; callers that still need export UI should include it inside this node or elsewhere.
   */
  plotTopRailDataActions?: ReactNode;
  /**
   * Optional controls rendered in the top plot rail to the right of the cursor mode toggle group. Each child becomes a direct sibling inside the rail toolbar, separated from inspect/zoom/pan by a vertical divider. Use for standalone affordances such as a dataset edit toggle that should sit outside the cursor cluster.
   */
  plotTopRailTrailingActions?: ReactNode;
  showThetaData?: boolean;
  showPhiData?: boolean;
  selectedGeometry?: { theta?: number; phi?: number } | null;
  /**
   * When true, renders pre/post normalization band shading from `normalizationRegions` without enabling the interactive normalization brush (no `plotContext.kind === "normalize"` required).
   */
  showNormalizationShading?: boolean;
  /**
   * When true with `normalizationRegions`, renders draggable axis handles at each pre/post window edge (four handles when both ranges are set). Parents map drag updates back into draft or persisted regions.
   */
  normalizationEdgeHandlesEnabled?: boolean;
  /**
   * Invoked when the user drags a normalization window edge; energy is rounded to 0.01 eV. Parents enforce ordering within pre/post ranges.
   */
  onNormalizationEdgeEnergyChange?: (
    edge: NormalizationRegionEdgeId,
    energy: number,
  ) => void;
  /**
   * Replaces the default empty-state copy when `points` is empty (for example browse/preview surfaces that do not upload CSV here).
   */
  emptyStateMessage?: string;
  /**
   * Overrides the default "Fixed Geometry" legend label when the primary trace has no θ/φ metadata (for example STXM ingestion reduced spectra).
   */
  primaryTraceLabel?: string;
  /**
   * When true, hides θ/φ geometry legend rows and renders a region-name legend from primary plus companion trace labels (STXM multi-region line scans).
   */
  hideGeometryLegend?: boolean;
  /**
   * Overrides the primary trace stroke color when the plot has no θ/φ geometry metadata (for example the first STXM sample region color).
   */
  primaryTraceColor?: string;
  /**
   * Stable visibility id for the primary trace in region-scoped legend mode; must match companion {@link DifferenceSpectrum.legendId} keys.
   */
  primaryTraceLegendId?: string;
  /** Region spot label for the primary trace legend row (without channel prefix). */
  primaryRegionSpotLabel?: string;
  /** Short channel header for region-scoped legend mode (for example `OD`, `Norm OD`, `β`). */
  channelLegendGlyph?: string;
  /**
   * When set, right-click opens a minimal CSV context menu on the plot and Copy is hijacked to place total-dataset CSV on the clipboard (toolbar dropdown still handles per-geometry export).
   */
  spectrumCsvContextMenu?: SpectrumCsvContextMenuConfig;
};

export type SpectrumCsvContextMenuConfig = {
  disabled: boolean;
  filenameBase: string;
  sortedAllPoints: SpectrumPoint[];
  groupedTree: SpectrumPolarizationNode[];
  /** Molecule formula for derived f/ε/χ and bare-atom CSV columns; omit when unknown. */
  stoichiometryFormula?: string | null;
};

/**
 * Unified trace representation (replaces Plotly PlotData for abstraction)
 * Used internally for data processing and rendering
 */
export type TraceData = {
  type: "scattergl" | "scatter";
  mode: "lines" | "markers" | "lines+markers";
  /**
   * Stable id for legend visibility toggles; when set, overrides trace `name` for visibility keys.
   */
  legendId?: string;
  /** Region spot label for region-scoped in-plot legend rows (without channel prefix). */
  regionSpotLabel?: string;
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
    symbol?: TraceMarkerSymbol;
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
