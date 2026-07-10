import { PROCESS_METHOD_OPTIONS } from "~/features/process-nexafs/constants";
import type { SampleAuxFields } from "~/features/process-nexafs/types";
import {
  SAMPLE_PROCESSING_MODE_LABELS,
  type SampleProcessingMode,
} from "~/lib/sample-aux-preparation";
import type { ProcessMethod } from "~/prisma/browser";

/**
 * Maps core sample `processmethod` values to extended `sample_aux` processing branches.
 */
export function processMethodToProcessingMode(
  processMethod: ProcessMethod | null | undefined,
): SampleProcessingMode | undefined {
  if (processMethod === "DRY") {
    return "dry";
  }
  if (processMethod === "SOLVENT") {
    return "wet";
  }
  return undefined;
}

/**
 * Maps extended `sample_aux` processing branches to core sample `processmethod` values.
 */
export function processingModeToProcessMethod(
  processingMode: SampleProcessingMode | undefined,
): ProcessMethod | null {
  if (processingMode === "dry") {
    return "DRY";
  }
  if (processingMode === "wet") {
    return "SOLVENT";
  }
  return null;
}

/**
 * Applies a processing branch to aux fields and clears method fields from the opposite branch.
 */
export function sampleAuxFieldsForProcessingMode(
  fields: SampleAuxFields,
  processingMode: SampleProcessingMode | undefined,
): SampleAuxFields {
  if (processingMode === "wet") {
    return {
      ...fields,
      processingMode: "wet",
      dryMethod: undefined,
      dryMethodOther: undefined,
    };
  }
  if (processingMode === "dry") {
    return {
      ...fields,
      processingMode: "dry",
      wetMethod: undefined,
      wetMethodOther: undefined,
    };
  }
  return {
    ...fields,
    processingMode: undefined,
    wetMethod: undefined,
    wetMethodOther: undefined,
    dryMethod: undefined,
    dryMethodOther: undefined,
  };
}

/**
 * Aligns extended aux fields with a core process method when one is selected.
 */
export function linkedSampleAuxForProcessMethod(
  fields: SampleAuxFields,
  processMethod: ProcessMethod | null | undefined,
): SampleAuxFields {
  const mode = processMethodToProcessingMode(processMethod);
  if (!mode) {
    return fields;
  }
  return sampleAuxFieldsForProcessingMode(fields, mode);
}

/**
 * Resolves the effective processing branch from core process method and stored aux metadata.
 */
export function effectiveSampleProcessingMode(input: {
  processMethod?: ProcessMethod | null;
  processingMode?: SampleProcessingMode;
}): SampleProcessingMode | undefined {
  return (
    processMethodToProcessingMode(input.processMethod) ?? input.processingMode
  );
}

/**
 * Returns true when sample preparation should expose the solvent field (wet / solvent-based route).
 */
export function samplePreparationUsesSolvent(input: {
  processMethod?: ProcessMethod | null;
  processingMode?: SampleProcessingMode;
}): boolean {
  return effectiveSampleProcessingMode(input) === "wet";
}

/**
 * Applies a process method to core sample fields and clears solvent when the route is not wet.
 */
export function applyProcessMethodToSampleFields<
  T extends { processMethod?: ProcessMethod | null; solvent: string },
>(fields: T, processMethod: ProcessMethod | null): T {
  if (samplePreparationUsesSolvent({ processMethod })) {
    return { ...fields, processMethod };
  }
  return { ...fields, processMethod, solvent: "" };
}

/**
 * Builds reader-facing copy explaining how process method and processing branch relate.
 */
export function sampleProcessMethodLinkDescription(
  processMethod: ProcessMethod,
): string {
  const processLabel =
    PROCESS_METHOD_OPTIONS.find((option) => option.value === processMethod)
      ?.label ?? processMethod;
  const branchLabel =
    SAMPLE_PROCESSING_MODE_LABELS[
      processMethodToProcessingMode(processMethod) ?? "wet"
    ];
  return `Extended preparation fields follow ${branchLabel.toLowerCase()} details from process method ${processLabel}.`;
}
