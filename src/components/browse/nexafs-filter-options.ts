import type { ExperimentType } from "~/prisma/browser";
import {
  EXPERIMENT_TYPE_LABELS,
  VERIFICATION_SOURCE_LABELS,
  type VerificationSource,
} from "./nexafs-browse-experiment-utils";

/** Acquisition mode choices for NEXAFS catalog filters (Prisma enum + label). */
export const ACQUISITION_MODE_OPTIONS = Object.entries(
  EXPERIMENT_TYPE_LABELS,
) as Array<[ExperimentType, string]>;

/** Verification source radio options when verified-only is active. */
export const VERIFICATION_SOURCE_OPTIONS = [
  "either",
  "publication",
  "atlas",
] as const satisfies readonly VerificationSource[];

export { VERIFICATION_SOURCE_LABELS };
