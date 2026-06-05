/** Sample region bar on the spatial axis of a line scan. */
export type StxmSampleRegion = {
  id: string;
  sampleLo: number;
  sampleHi: number;
  spotLabel: string;
  role: StxmRegionRole;
};

/** Semantic role for a sample region used in reduction and legends. */
export type StxmRegionRole = "pure" | "edge" | "custom";

/** Izero reference band bounds on the spatial axis. */
export type StxmIzeroBounds = {
  izeroLo: number;
  izeroHi: number;
};

/** Shared linear/log display scaling for heatmaps and compatible spectrum axes. */
export type StxmPlotScaleMode = "linear" | "log";

/** Ingestion spectrum Y-axis channel aligned with stxm `ui.py` toggles. */
export type StxmIngestionYDisplayMode =
  | "signal"
  | "signal_inverse"
  | "od"
  | "od_normalized"
  | "mass_absorption"
  | "beta"
  | "delta"
  | "f1"
  | "chi"
  | "bare_atom";

/** Per-region raw or reduced spectrum series for ingestion plots. */
export type StxmRegionSpectrumSeries = {
  spotLabel: string;
  regionId: string;
  sampleLo: number;
  sampleHi: number;
  energyEv: number[];
  signal: number[];
  signalErr: number[];
  od?: number[];
  odErr?: number[];
  odNormalized?: number[];
  massAbsorption?: number[];
  massAbsorptionErr?: number[];
  beta?: number[];
  betaErr?: number[];
  delta?: number[];
  color: string;
  isIzero?: boolean;
  /** Optional TEY drain-current per energy when parsed from scan metadata. */
  teyDrain?: number[];
  teyDrainErr?: number[];
};

/** Atlas reference standard overlay trace loaded from browse API. */
export type StxmStandardOverlay = {
  id: string;
  label: string;
  experimentId: string;
  energyEv: number[];
  values: number[];
  color: string;
  enabled: boolean;
};
