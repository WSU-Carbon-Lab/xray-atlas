import type {
  SpectrumPoint,
  SpectrumSelection,
} from "~/components/plots/types";
import type { AuxFileKind } from "~/lib/aux-file-client";
import type {
  SampleDryMethod,
  SampleProcessingMode,
  SampleWetMethod,
} from "~/lib/sample-aux-preparation";
import type { DatasetAttributionEntry } from "~/lib/nexafs-attribution";
import type { PublicationCitation } from "~/lib/publication-citation";
import type { ProcessMethod } from "~/prisma/browser";
import { type EXPERIMENT_TYPE_OPTIONS } from "./constants";

export type { DatasetAttributionEntry };

export { EXPERIMENT_TYPE_OPTIONS, PROCESS_METHOD_OPTIONS } from "./constants";

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

export type PrimaryRepresentation =
  | "raw_mu"
  | "od"
  | "mass_absorption"
  | "beta"
  | "f2"
  | "epsilon2"
  | "chi2";

export const PRIMARY_REPRESENTATION_LABELS: Record<
  PrimaryRepresentation,
  string
> = {
  raw_mu: "Raw mu-like signal",
  od: "Optical density (0-1)",
  mass_absorption: "Mass absorption (mu_a)",
  beta: "Beta (imaginary index)",
  f2: "f2 (imaginary ASF)",
  epsilon2: "Epsilon2 (loss)",
  chi2: "Chi2 (loss)",
};

export interface CSVColumnMappings {
  energy: string;
  absorption: string;
  theta?: string;
  phi?: string;
  i0?: string;
  od?: string;
  rawabsError?: string;
  odError?: string;
  massabsorption?: string;
  massabsorptionError?: string;
  beta?: string;
  betaError?: string;
  delta?: string;
  deltaError?: string;
  f2?: string;
  epsilon2?: string;
  chi2?: string;
}

export type NormalizationScope = "none" | "unified" | "per_channel";

export type NormalizationRange = [number, number] | null;

export interface UnifiedNormalizationRanges {
  pre: NormalizationRange;
  post: NormalizationRange;
}

export interface PerChannelNormalizationRanges {
  od: UnifiedNormalizationRanges;
  massabsorption: UnifiedNormalizationRanges;
  beta: UnifiedNormalizationRanges;
}

export type NormalizationRanges =
  | UnifiedNormalizationRanges
  | PerChannelNormalizationRanges
  | null;

export type UploadedChannel = "rawabs" | "od" | "massabsorption" | "beta";

export type ChannelProvenanceStatus =
  | "uploaded_authoritative"
  | "derived"
  | "derived_with_assumptions"
  | "missing";

export type ChannelProvenance = Record<UploadedChannel, ChannelProvenanceStatus>;

export type ExperimentChannelProvenance = {
  channels: ChannelProvenance;
  primaryRepresentation: PrimaryRepresentation;
};

export interface ValidationOverrideState {
  bypass: boolean;
  reason: string;
}

export interface DatasetValidationSummary {
  mode: "ranges" | "single_point";
  passed: boolean;
  warnings: string[];
  checks: {
    od: "pass" | "warn" | "skip";
    massabsorption: "pass" | "warn" | "skip";
    betaCrossCheck: "pass" | "warn" | "skip";
  };
  bypass: ValidationOverrideState;
}

export interface QualityScoreComponent {
  pointSpacing: number | null;
  snr: number | null;
  normalizationTargetDistance: number | null;
}

export interface ChannelQualityScores {
  rawabs: QualityScoreComponent;
  od: QualityScoreComponent;
  massabsorption: QualityScoreComponent;
  beta: QualityScoreComponent;
}

export interface ExperimentQualityScores {
  perChannel: ChannelQualityScores;
  doiPresent: boolean;
  normalizationRangesPresent: boolean;
  aggregateScore: number | null;
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
  amplitude?: number;
  width?: number;
  id?: string;
  isStep?: boolean;
  peakKind?: string | null;
};

export type BareAtomPoint = {
  energy: number;
  absorption: number;
};

export type SampleInfo = {
  processMethod: ProcessMethod | null;
  substrate: string;
  solvent: string;
  thickness: number | null;
  molecularWeight: number | null;
  vendorId: string;
  newVendorName: string;
  newVendorUrl: string;
};

export type SampleAuxFields = {
  processingMode?: SampleProcessingMode;
  wetMethod?: SampleWetMethod;
  dryMethod?: SampleDryMethod;
  wetMethodOther?: string;
  dryMethodOther?: string;
  vaseThicknessNm?: number;
  roughnessNm?: number;
  orientationNotes?: string;
  spinSpeedRpm?: number;
  spinAccelerationRpmPerS?: number;
  spinDurationS?: number;
  bladeSpeedMmPerS?: number;
  bladeGapUm?: number;
  bladeTemperatureC?: number;
  depositionRateAngstromPerS?: number;
  basePressureTorr?: number;
  workingPressureTorr?: number;
  sourceTemperatureC?: number;
  substrateTemperatureC?: number;
  concentrationMgPerMl?: number;
  solutionStirringTimeH?: number;
  solutionStirringTemperatureC?: number;
  filterSizeUm?: number;
  substrateOrientation?: string;
  substrateLot?: string;
  oxideThicknessNm?: number;
  depositionAtmosphere?: string;
  gloveboxO2Ppm?: number;
  gloveboxH2oPpm?: number;
  annealingTemperatureC?: number;
  annealingTimeMin?: number;
  annealingAtmosphere?: string;
  annealingRampCPerMin?: number;
  preparationDescription?: string;
  notes?: string;
};

export type PendingAuxFile = {
  id: string;
  file: File;
  kind: AuxFileKind;
  description?: string;
  clientKey: string;
};

export type NormalizationType = "bare-atom" | "zero-one";

export type DatasetViewNormalizationTypes = {
  od: NormalizationType;
  absorption: NormalizationType;
  beta: NormalizationType;
};

export const defaultDatasetViewNormalizationTypes =
  (): DatasetViewNormalizationTypes => ({
    od: "zero-one",
    absorption: "bare-atom",
    beta: "bare-atom",
  });

export type DatasetState = {
  id: string;
  file: File;
  fileName: string;
  csvColumns: string[];
  csvRawData: Record<string, unknown>[];
  columnMappings: CSVColumnMappings;
  primaryRepresentation: PrimaryRepresentation;
  primaryInferenceNeedsChoice: boolean;
  primaryRepresentationLocked: boolean;
  uploadParseWarnings: string[];
  spectrumPoints: SpectrumPoint[];
  normalizedPoints: SpectrumPoint[] | null;
  normalization: ExperimentNormalization | null;
  normalizationScope: NormalizationScope;
  normalizationRegions: {
    pre: [number, number] | null;
    post: [number, number] | null;
  };
  validationOverride: ValidationOverrideState;
  normalizationLocked: boolean;
  normalizationTypes: DatasetViewNormalizationTypes;
  peaks: PeakData[];
  selectedPeakId: string | null;
  moleculeId: string | null;
  moleculeLocked: boolean;
  bareAtomPoints: BareAtomPoint[] | null;
  sampleInfo: SampleInfo;
  instrumentId: string;
  edgeId: string;
  experimentType: ExperimentTypeOption;
  calibrationId: string;
  referenceStandard: string;
  isStandard: boolean;
  fixedTheta: string;
  fixedPhi: string;
  spectrumError: string | null;
  spectrumStats: SpectrumStats | null;
  collectedByUserIds: string[];
  attributions: DatasetAttributionEntry[];
  computeKkDeltaOnSubmit: boolean;
  sourcePaperPublications: PublicationCitation[];
  sampleAux: SampleAuxFields;
  pendingExperimentAuxFiles: PendingAuxFile[];
  pendingSampleAuxFiles: PendingAuxFile[];
  /** Set after `createWithSpectrum` succeeds so contributors can upload aux files post-submit. */
  persistedExperimentId: string | null;
  /** Sample row linked to the persisted experiment; required for sample-scoped aux uploads. */
  persistedSampleId: string | null;
};

export function createEmptyDatasetState(file: File): DatasetState {
  return {
    id: crypto.randomUUID(),
    file,
    fileName: file.name,
    csvColumns: [],
    csvRawData: [],
    columnMappings: { energy: "", absorption: "" },
    primaryRepresentation: "raw_mu",
    primaryInferenceNeedsChoice: false,
    primaryRepresentationLocked: false,
    uploadParseWarnings: [],
    spectrumPoints: [],
    normalizedPoints: null,
    normalization: null,
    normalizationScope: "unified",
    normalizationRegions: { pre: null, post: null },
    validationOverride: { bypass: false, reason: "" },
    normalizationLocked: false,
    normalizationTypes: defaultDatasetViewNormalizationTypes(),
    peaks: [],
    selectedPeakId: null,
    moleculeId: null,
    moleculeLocked: false,
    bareAtomPoints: null,
    sampleInfo: {
      processMethod: null,
      substrate: "",
      solvent: "",
      thickness: null,
      molecularWeight: null,
      vendorId: "",
      newVendorName: "",
      newVendorUrl: "",
    },
    instrumentId: "",
    edgeId: "",
    experimentType: "TOTAL_ELECTRON_YIELD",
    calibrationId: "",
    referenceStandard: "",
    isStandard: false,
    fixedTheta: "",
    fixedPhi: "",
    spectrumError: null,
    spectrumStats: null,
    collectedByUserIds: [],
    attributions: [],
    computeKkDeltaOnSubmit: false,
    sourcePaperPublications: [],
    sampleAux: {},
    pendingExperimentAuxFiles: [],
    pendingSampleAuxFiles: [],
    persistedExperimentId: null,
    persistedSampleId: null,
  };
}
