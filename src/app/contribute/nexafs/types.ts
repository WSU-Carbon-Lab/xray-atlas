import type {
  SpectrumPoint,
  SpectrumSelection,
} from "~/app/components/plots/SpectrumPlot";
import type { ProcessMethod } from "@prisma/client";

export const EXPERIMENT_TYPE_OPTIONS = [
  { value: "TOTAL_ELECTRON_YIELD", label: "Total Electron Yield" },
  { value: "PARTIAL_ELECTRON_YIELD", label: "Partial Electron Yield" },
  { value: "FLUORESCENT_YIELD", label: "Fluorescent Yield" },
  { value: "TRANSMISSION", label: "Transmission" },
] as const;

export const PROCESS_METHOD_OPTIONS = [
  { value: "DRY", label: "Dry" },
  { value: "SOLVENT", label: "Solvent" },
] as const;

export type ExperimentTypeOption =
  (typeof EXPERIMENT_TYPE_OPTIONS)[number]["value"];

export interface MoleculeSearchResult {
  id: string;
  iupacName: string;
  commonName: string;
  synonyms: string[];
  inchi: string;
  smiles: string;
  chemicalFormula: string;
  casNumber: string | null;
  pubChemCid: string | null;
  imageUrl?: string;
}

export type GeometryPair = {
  theta: number;
  phi: number;
};

export type GeometryMode = "csv" | "fixed";

export type GeometryPayload =
  | { mode: "csv"; csvGeometries: GeometryPair[] }
  | { mode: "fixed"; fixedTheta: number; fixedPhi: number };

export type ColumnStats = {
  min: number | null;
  max: number | null;
  nanCount: number;
  validCount: number;
};

export type SpectrumStats = {
  totalRows: number;
  validPoints: number;
  energy: ColumnStats;
  absorption: ColumnStats;
  theta?: ColumnStats;
  phi?: ColumnStats;
};

export interface CSVColumnMappings {
  energy: string;
  absorption: string;
  theta?: string;
  phi?: string;
}

export interface ExperimentNormalization {
  scale: number;
  offset: number;
  preRange: [number, number] | null;
  postRange: [number, number] | null;
}

export interface ExperimentConfig {
  id: string;
  instrumentId: string;
  edgeId: string;
  experimentType: ExperimentTypeOption;
  measurementDate: string;
  calibrationId: string;
  referenceStandard: string;
  isStandard: boolean;
  fixedTheta: string;
  fixedPhi: string;
  spectrumPoints: SpectrumPoint[];
  normalizedPoints: SpectrumPoint[] | null;
  normalization: ExperimentNormalization | null;
  spectrumFile: File | null;
  spectrumError: string | null;
  csvColumns: string[];
  csvRawData: Record<string, unknown>[];
  csvColumnMappings: CSVColumnMappings;
  spectrumStats: SpectrumStats | null;
  selectionSummary: SpectrumSelection | null;
  datasets: ExperimentDatasetMeta[];
  activeDatasetId: string | null;
}

export interface ExperimentDatasetMeta {
  id: string;
  file?: File | null;
  fileName: string;
  fileSize: number;
  label: string;
  doi: string;
  processedAt: number | null;
}

export type PeakData = {
  energy: number;
  intensity?: number;
  bond?: string;
  transition?: string;
};

export type BareAtomPoint = {
  energy: number;
  absorption: number;
};

export type SampleInfo = {
  processMethod: ProcessMethod | "";
  substrate: string;
  solvent: string;
  thickness: number | "";
  molecularWeight: number | "";
  preparationDate: string;
  vendorId: string | "";
  newVendorName: string;
  newVendorUrl: string;
};

export type DatasetState = {
  id: string;
  file: File;
  fileName: string;
  csvColumns: string[];
  csvRawData: Record<string, unknown>[];
  columnMappings: CSVColumnMappings;
  spectrumPoints: SpectrumPoint[];
  normalizedPoints: SpectrumPoint[] | null;
  normalization: ExperimentNormalization | null;
  normalizationRegions: { pre: [number, number] | null; post: [number, number] | null };
  normalizationLocked: boolean;
  peaks: PeakData[];
  moleculeId: string | null;
  bareAtomPoints: BareAtomPoint[] | null;
  sampleInfo: SampleInfo;
  instrumentId: string | "";
  edgeId: string | "";
  experimentType: ExperimentTypeOption;
  measurementDate: string;
  calibrationId: string | "";
  referenceStandard: string;
  isStandard: boolean;
  fixedTheta: string;
  fixedPhi: string;
  spectrumError: string | null;
  spectrumStats: SpectrumStats | null;
};

export function createEmptyDatasetState(file: File): DatasetState {
  return {
    id: crypto.randomUUID(),
    file,
    fileName: file.name,
    csvColumns: [],
    csvRawData: [],
    columnMappings: { energy: "", absorption: "" },
    spectrumPoints: [],
    normalizedPoints: null,
    normalization: null,
    normalizationRegions: { pre: null, post: null },
    normalizationLocked: false,
    peaks: [],
    moleculeId: null,
    bareAtomPoints: null,
    sampleInfo: {
      processMethod: "",
      substrate: "",
      solvent: "",
      thickness: "",
      molecularWeight: "",
      preparationDate: "",
      vendorId: "",
      newVendorName: "",
      newVendorUrl: "",
    },
    instrumentId: "",
    edgeId: "",
    experimentType: "TOTAL_ELECTRON_YIELD",
    measurementDate: "",
    calibrationId: "",
    referenceStandard: "",
    isStandard: false,
    fixedTheta: "",
    fixedPhi: "",
    spectrumError: null,
    spectrumStats: null,
  };
}
