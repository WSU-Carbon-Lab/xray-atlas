import { z } from "zod";

/** Primary sample preparation branch: solution-based (wet) vs vacuum/coating (dry). */
export const SAMPLE_PROCESSING_MODES = ["wet", "dry"] as const;
export type SampleProcessingMode = (typeof SAMPLE_PROCESSING_MODES)[number];

export const SAMPLE_WET_METHODS = [
  "spin",
  "blade",
  "drop",
  "spray",
  "other",
] as const;
export type SampleWetMethod = (typeof SAMPLE_WET_METHODS)[number];

export const SAMPLE_DRY_METHODS = [
  "pvd",
  "cvd",
  "sputter",
  "powder",
  "other",
] as const;
export type SampleDryMethod = (typeof SAMPLE_DRY_METHODS)[number];

export const SAMPLE_PROCESSING_MODE_LABELS: Record<
  SampleProcessingMode,
  string
> = {
  wet: "Wet processed",
  dry: "Dry coated",
};

export const SAMPLE_WET_METHOD_LABELS: Record<SampleWetMethod, string> = {
  spin: "Spin coating",
  blade: "Blade coating",
  drop: "Drop casting",
  spray: "Spray coating",
  other: "Other",
};

export const SAMPLE_DRY_METHOD_LABELS: Record<SampleDryMethod, string> = {
  pvd: "PVD",
  cvd: "CVD",
  sputter: "Sputter",
  powder: "Powder / pressed",
  other: "Other",
};

export const sampleProcessingModeSchema = z.enum(SAMPLE_PROCESSING_MODES);
export const sampleWetMethodSchema = z.enum(SAMPLE_WET_METHODS);
export const sampleDryMethodSchema = z.enum(SAMPLE_DRY_METHODS);
