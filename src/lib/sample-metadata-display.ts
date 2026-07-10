import type { ProcessMethod } from "~/prisma/browser";
import { PROCESS_METHOD_OPTIONS } from "~/features/process-nexafs/constants";
import type { SampleAuxFields } from "~/features/process-nexafs/types";
import {
  SAMPLE_DRY_METHOD_LABELS,
  SAMPLE_PROCESSING_MODE_LABELS,
  SAMPLE_WET_METHOD_LABELS,
} from "~/lib/sample-aux-preparation";
import { processMethodToProcessingMode } from "~/lib/sample-process-method-link";

export type SampleMetadataDisplayRow = {
  label: string;
  value: string;
  href?: string;
};

export type SampleMetadataDisplaySection = {
  title: string;
  rows: SampleMetadataDisplayRow[];
};

const SAMPLE_AUX_FIELD_LABELS: Record<
  Exclude<keyof SampleAuxFields, "processingMode" | "wetMethod" | "dryMethod">,
  string
> = {
  wetMethodOther: "Wet method (other)",
  dryMethodOther: "Dry method (other)",
  vaseThicknessNm: "VASE thickness (nm)",
  roughnessNm: "Roughness (nm)",
  orientationNotes: "Orientation notes",
  spinSpeedRpm: "Spin speed (rpm)",
  spinAccelerationRpmPerS: "Spin acceleration (rpm/s)",
  spinDurationS: "Spin duration (s)",
  bladeSpeedMmPerS: "Blade speed (mm/s)",
  bladeGapUm: "Blade gap (um)",
  bladeTemperatureC: "Blade temperature (C)",
  depositionRateAngstromPerS: "Deposition rate (A/s)",
  basePressureTorr: "Base pressure (Torr)",
  workingPressureTorr: "Working pressure (Torr)",
  sourceTemperatureC: "Source temperature (C)",
  substrateTemperatureC: "Substrate temperature (C)",
  concentrationMgPerMl: "Concentration (mg/mL)",
  solutionStirringTimeH: "Stirring time (h)",
  solutionStirringTemperatureC: "Stirring temperature (C)",
  filterSizeUm: "Filter size (um)",
  substrateOrientation: "Substrate orientation",
  substrateLot: "Substrate lot",
  oxideThicknessNm: "Oxide thickness (nm)",
  depositionAtmosphere: "Deposition atmosphere",
  gloveboxO2Ppm: "Glovebox O2 (ppm)",
  gloveboxH2oPpm: "Glovebox H2O (ppm)",
  annealingTemperatureC: "Annealing temperature (C)",
  annealingTimeMin: "Annealing time (min)",
  annealingAtmosphere: "Annealing atmosphere",
  annealingRampCPerMin: "Annealing ramp (C/min)",
  preparationDescription: "Preparation description",
  notes: "Notes",
};

const EXTENDED_AUX_SECTIONS: Array<{
  title: string;
  keys: Array<keyof SampleAuxFields>;
}> = [
  {
    title: "Processing",
    keys: ["processingMode", "wetMethod", "dryMethod", "wetMethodOther", "dryMethodOther"],
  },
  {
    title: "Spin coating",
    keys: ["spinSpeedRpm", "spinAccelerationRpmPerS", "spinDurationS"],
  },
  {
    title: "Blade coating",
    keys: ["bladeSpeedMmPerS", "bladeGapUm", "bladeTemperatureC"],
  },
  {
    title: "Vacuum deposition",
    keys: [
      "depositionRateAngstromPerS",
      "basePressureTorr",
      "workingPressureTorr",
      "sourceTemperatureC",
      "substrateTemperatureC",
    ],
  },
  {
    title: "Solution chemistry",
    keys: [
      "concentrationMgPerMl",
      "solutionStirringTimeH",
      "solutionStirringTemperatureC",
      "filterSizeUm",
      "vaseThicknessNm",
    ],
  },
  {
    title: "Substrate detail",
    keys: [
      "substrateOrientation",
      "substrateLot",
      "oxideThicknessNm",
      "roughnessNm",
      "orientationNotes",
    ],
  },
  {
    title: "Atmosphere",
    keys: ["depositionAtmosphere", "gloveboxO2Ppm", "gloveboxH2oPpm"],
  },
  {
    title: "Annealing",
    keys: [
      "annealingTemperatureC",
      "annealingTimeMin",
      "annealingAtmosphere",
      "annealingRampCPerMin",
    ],
  },
  {
    title: "Notes",
    keys: ["preparationDescription", "notes"],
  },
];

function formatProcessMethod(value: ProcessMethod | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const match = PROCESS_METHOD_OPTIONS.find((option) => option.value === value);
  return match?.label ?? value;
}

function formatNumericValue(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function formatSampleAuxScalar(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return formatNumericValue(value);
  }
  return null;
}

function pushRow(
  rows: SampleMetadataDisplayRow[],
  label: string,
  value: string | null | undefined,
  href?: string,
): void {
  if (value == null || value.trim().length === 0) {
    return;
  }
  rows.push({ label, value, href });
}

function formatAuxFieldLabel(key: keyof SampleAuxFields): string | null {
  if (key === "processingMode" || key === "wetMethod" || key === "dryMethod") {
    return null;
  }
  return SAMPLE_AUX_FIELD_LABELS[key];
}

function formatAuxFieldValue(
  key: keyof SampleAuxFields,
  aux: SampleAuxFields,
): string | null {
  if (key === "processingMode" && aux.processingMode) {
    return SAMPLE_PROCESSING_MODE_LABELS[aux.processingMode];
  }
  if (key === "wetMethod" && aux.wetMethod) {
    return SAMPLE_WET_METHOD_LABELS[aux.wetMethod];
  }
  if (key === "dryMethod" && aux.dryMethod) {
    return SAMPLE_DRY_METHOD_LABELS[aux.dryMethod];
  }
  const label = formatAuxFieldLabel(key);
  if (!label) {
    return null;
  }
  return formatSampleAuxScalar(aux[key]);
}

/**
 * Builds read-only label/value rows for core `samples` columns attached to an experiment.
 */
export function coreSampleMetadataRows(input: {
  processmethod?: ProcessMethod | null;
  substrate?: string | null;
  patterninglayer?: string | null;
  solvent?: string | null;
  thickness?: number | null;
  molecularweight?: number | null;
  vendorName?: string | null;
  vendorUrl?: string | null;
}): SampleMetadataDisplayRow[] {
  const rows: SampleMetadataDisplayRow[] = [];
  pushRow(rows, "Process method", formatProcessMethod(input.processmethod));
  pushRow(rows, "Substrate", input.substrate?.trim() ?? null);
  pushRow(rows, "Patterning layer", input.patterninglayer?.trim() ?? null);
  pushRow(rows, "Solvent", input.solvent?.trim() ?? null);
  if (input.thickness != null && Number.isFinite(input.thickness)) {
    pushRow(rows, "Thickness (nm)", formatNumericValue(input.thickness));
  }
  if (input.molecularweight != null && Number.isFinite(input.molecularweight)) {
    pushRow(rows, "Molecular weight (g/mol)", formatNumericValue(input.molecularweight));
  }
  const vendorName = input.vendorName?.trim() ?? null;
  const vendorUrl = input.vendorUrl?.trim() ?? null;
  if (vendorName && vendorUrl) {
    pushRow(rows, "Vendor", vendorName, vendorUrl);
  } else if (vendorName) {
    pushRow(rows, "Vendor", vendorName);
  } else if (vendorUrl) {
    pushRow(rows, "Vendor", vendorUrl, vendorUrl);
  }
  return rows;
}

/**
 * Groups core sample rows into preparation and vendor sections for browse display.
 */
export function coreSampleMetadataSections(
  rows: SampleMetadataDisplayRow[],
): SampleMetadataDisplaySection[] {
  const preparationLabels = new Set([
    "Process method",
    "Substrate",
    "Patterning layer",
    "Solvent",
    "Thickness (nm)",
    "Molecular weight (g/mol)",
  ]);
  const vendorLabels = new Set(["Vendor"]);

  const sections: SampleMetadataDisplaySection[] = [
    {
      title: "Preparation",
      rows: rows.filter((row) => preparationLabels.has(row.label)),
    },
    {
      title: "Vendor",
      rows: rows.filter((row) => vendorLabels.has(row.label)),
    },
  ];

  return sections.filter((section) => section.rows.length > 0);
}

/**
 * Builds read-only label/value rows for optional extended `sample_aux` preparation metadata.
 */
export function extendedSampleAuxMetadataRows(
  aux: SampleAuxFields | null | undefined,
): SampleMetadataDisplayRow[] {
  if (!aux) {
    return [];
  }

  const rows: SampleMetadataDisplayRow[] = [];

  for (const section of EXTENDED_AUX_SECTIONS) {
    for (const key of section.keys) {
      const label =
        key === "processingMode"
          ? "Processing branch"
          : key === "wetMethod"
            ? "Wet method"
            : key === "dryMethod"
              ? "Dry method"
              : formatAuxFieldLabel(key);
      if (!label) {
        continue;
      }
      pushRow(rows, label, formatAuxFieldValue(key, aux));
    }
  }

  return rows;
}

/**
 * Groups extended sample aux rows into preparation subsections for browse display.
 */
export function extendedSampleAuxMetadataSections(
  aux: SampleAuxFields | null | undefined,
  options?: { processMethod?: ProcessMethod | null },
): SampleMetadataDisplaySection[] {
  if (!aux) {
    return [];
  }

  const hideProcessingBranch =
    processMethodToProcessingMode(options?.processMethod) != null;

  return EXTENDED_AUX_SECTIONS.map((section) => {
    const rows: SampleMetadataDisplayRow[] = [];
    for (const key of section.keys) {
      if (hideProcessingBranch && key === "processingMode") {
        continue;
      }
      const label =
        key === "processingMode"
          ? "Processing branch"
          : key === "wetMethod"
            ? "Wet method"
            : key === "dryMethod"
              ? "Dry method"
              : formatAuxFieldLabel(key);
      if (!label) {
        continue;
      }
      pushRow(rows, label, formatAuxFieldValue(key, aux));
    }
    return { title: section.title, rows };
  }).filter((section) => section.rows.length > 0);
}

/**
 * Returns true when either core sample columns or extended aux metadata contain displayable values.
 */
export function sampleMetadataHasDisplayableRows(input: {
  coreRows: SampleMetadataDisplayRow[];
  extendedRows: SampleMetadataDisplayRow[];
}): boolean {
  return input.coreRows.length > 0 || input.extendedRows.length > 0;
}
