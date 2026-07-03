"use client";

import type { ProcessMethod } from "~/prisma/browser";
import { PROCESS_METHOD_OPTIONS } from "~/features/process-nexafs/constants";
import type { SampleAuxFields } from "~/features/process-nexafs/types";
import {
  SampleMetadataInsetGroup,
  SampleMetadataSectionCaption,
} from "~/components/nexafs/sample-metadata-chrome-shared";
import {
  SAMPLE_DRY_METHODS,
  SAMPLE_DRY_METHOD_LABELS,
  SAMPLE_PROCESSING_MODES,
  SAMPLE_PROCESSING_MODE_LABELS,
  SAMPLE_WET_METHODS,
  SAMPLE_WET_METHOD_LABELS,
  type SampleDryMethod,
  type SampleProcessingMode,
  type SampleWetMethod,
} from "~/lib/sample-aux-preparation";
import {
  effectiveSampleProcessingMode,
  processMethodToProcessingMode,
  processingModeToProcessMethod,
  sampleAuxFieldsForProcessingMode,
} from "~/lib/sample-process-method-link";
import {
  sampleFormOptionalSuffix,
  SampleFormSelect,
} from "./sample-form-select";

const PROCESS_METHOD_ITEMS = PROCESS_METHOD_OPTIONS.map(
  (option) => option.value,
);

const PROCESS_METHOD_LABELS = Object.fromEntries(
  PROCESS_METHOD_OPTIONS.map((option) => [option.value, option.label]),
) as Record<ProcessMethod, string>;

const preparationHint =
  "Process method sets wet or dry extended fields. Choose a specific technique when you know it.";

export type SamplePreparationMethodFieldsProps = {
  processMethod: ProcessMethod | null;
  setProcessMethod: (value: ProcessMethod | null) => void;
  aux: SampleAuxFields;
  onAuxChange: (next: SampleAuxFields) => void;
  onProcessMethodChange?: (processMethod: ProcessMethod | null) => void;
  disabled?: boolean;
  appearance?: "form" | "inset";
};

function LinkedTechniqueSelect({
  linkedMode,
  mode,
  aux,
  onAuxChange,
  onProcessMethodChange,
  disabled,
  layout,
}: {
  linkedMode: ReturnType<typeof processMethodToProcessingMode>;
  mode: ReturnType<typeof effectiveSampleProcessingMode>;
  aux: SampleAuxFields;
  onAuxChange: (next: SampleAuxFields) => void;
  onProcessMethodChange?: (processMethod: ProcessMethod | null) => void;
  disabled: boolean;
  layout: "stacked" | "inset";
}) {
  if (linkedMode == null) {
    return (
      <SampleFormSelect<SampleProcessingMode>
        label="Processing branch"
        optional
        layout={layout}
        items={SAMPLE_PROCESSING_MODES}
        labels={SAMPLE_PROCESSING_MODE_LABELS}
        selectedKey={aux.processingMode}
        onSelectionChange={(next) => {
          onAuxChange(sampleAuxFieldsForProcessingMode(aux, next));
          onProcessMethodChange?.(processingModeToProcessMethod(next));
        }}
        disabled={disabled}
        ariaLabel="Sample processing branch"
      />
    );
  }

  if (mode === "wet") {
    return (
      <SampleFormSelect<SampleWetMethod>
        label="Wet technique"
        optional
        layout={layout}
        items={SAMPLE_WET_METHODS}
        labels={SAMPLE_WET_METHOD_LABELS}
        selectedKey={aux.wetMethod}
        onSelectionChange={(next) => onAuxChange({ ...aux, wetMethod: next })}
        disabled={disabled}
        ariaLabel="Wet preparation technique"
      />
    );
  }

  if (mode === "dry") {
    return (
      <SampleFormSelect<SampleDryMethod>
        label="Dry technique"
        optional
        layout={layout}
        items={SAMPLE_DRY_METHODS}
        labels={SAMPLE_DRY_METHOD_LABELS}
        selectedKey={aux.dryMethod}
        onSelectionChange={(next) => onAuxChange({ ...aux, dryMethod: next })}
        disabled={disabled}
        ariaLabel="Dry preparation technique"
      />
    );
  }

  if (layout === "inset") {
    return (
      <div className="text-muted px-4 py-3.5 text-[15px] leading-snug">
        Select a process method to choose a wet or dry technique.
      </div>
    );
  }

  return (
    <div className="border-border/70 flex min-h-[44px] items-center rounded-lg border border-dashed px-3">
      <p className="text-muted text-sm">
        Select a process method to choose a wet or dry technique.
      </p>
    </div>
  );
}

/**
 * Renders process method and linked wet/dry preparation selectors as one grouped control.
 */
export function SamplePreparationMethodFields({
  processMethod,
  setProcessMethod,
  aux,
  onAuxChange,
  onProcessMethodChange,
  disabled = false,
  appearance = "form",
}: SamplePreparationMethodFieldsProps) {
  const linkedMode = processMethodToProcessingMode(processMethod);
  const mode = effectiveSampleProcessingMode({
    processMethod,
    processingMode: aux.processingMode,
  });
  const layout = appearance === "inset" ? "inset" : "stacked";

  const fields = (
    <>
      <SampleFormSelect<ProcessMethod>
        label="Process method"
        tooltip="Broad sample preparation route: solvent-based or dry coating"
        optional
        layout={layout}
        items={PROCESS_METHOD_ITEMS}
        labels={PROCESS_METHOD_LABELS}
        selectedKey={processMethod ?? undefined}
        onSelectionChange={(next) => {
          setProcessMethod(next ?? null);
        }}
        disabled={disabled}
        ariaLabel="Process method (optional)"
      />
      <LinkedTechniqueSelect
        linkedMode={linkedMode}
        mode={mode}
        aux={aux}
        onAuxChange={onAuxChange}
        onProcessMethodChange={onProcessMethodChange}
        disabled={disabled}
        layout={layout}
      />
    </>
  );

  if (appearance === "inset") {
    return (
      <section aria-labelledby="sample-preparation-method-heading">
        <SampleMetadataSectionCaption
          title="Preparation method"
          hint={preparationHint}
        />
        <SampleMetadataInsetGroup ariaLabel="Preparation method">
          {fields}
        </SampleMetadataInsetGroup>
      </section>
    );
  }

  return (
    <fieldset className="border-border bg-surface-2 rounded-xl border p-4">
      <legend className="text-foreground px-1 text-sm font-semibold">
        Preparation method
        {sampleFormOptionalSuffix}
      </legend>
      <p className="text-muted mb-4 text-xs leading-snug">{preparationHint}</p>
      <div className="grid gap-4 md:grid-cols-2">{fields}</div>
    </fieldset>
  );
}

export { PROCESS_METHOD_ITEMS, PROCESS_METHOD_LABELS };
