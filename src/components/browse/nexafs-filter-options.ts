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

/** Unified search verification chip: all datasets or a verified tier. */
export type VerificationFilterChoice = "any" | VerificationSource;

/** Mutually exclusive verification chips for the unified search panel. */
export const VERIFICATION_FILTER_PANEL_OPTIONS: ReadonlyArray<{
  value: VerificationFilterChoice;
  label: string;
}> = [
  { value: "any", label: "Any" },
  ...VERIFICATION_SOURCE_OPTIONS.map((value) => ({
    value,
    label: VERIFICATION_SOURCE_LABELS[value],
  })),
];

/**
 * Maps catalog filter state to the active verification chip.
 */
export function verificationFilterChoiceFromCatalog(filters: {
  verifiedOnly: boolean;
  verificationSource: VerificationSource;
}): VerificationFilterChoice {
  if (!filters.verifiedOnly) return "any";
  return filters.verificationSource;
}

/**
 * Maps a verification chip selection to `verifiedOnly` and `verificationSource`.
 */
export function catalogFiltersFromVerificationChoice(choice: VerificationFilterChoice): {
  verifiedOnly: boolean;
  verificationSource: VerificationSource;
} {
  if (choice === "any") {
    return { verifiedOnly: false, verificationSource: "either" };
  }
  return { verifiedOnly: true, verificationSource: choice };
}

export { VERIFICATION_SOURCE_LABELS };
