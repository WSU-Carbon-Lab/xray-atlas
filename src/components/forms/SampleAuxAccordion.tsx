"use client";

import { useEffect, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  Accordion,
  InputGroup,
  Label,
  TextField,
} from "@heroui/react";
import type { SampleAuxFields } from "~/features/process-nexafs/types";
import type { ProcessMethod } from "~/prisma/browser";
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
  SampleMetadataInsetGroup,
  SampleMetadataSectionCaption,
} from "~/components/nexafs/sample-metadata-chrome-shared";
import {
  SampleFormSelect,
} from "./sample-form-select";
import { sampleAuxAccordionChrome } from "./sample-aux-accordion-chrome";
import {
  resolveSampleFormLayout,
  type SampleFormLegacyAppearance,
} from "./sample-form-layout";

type SampleAuxAccordionProps = {
  value: SampleAuxFields;
  onChange: (next: SampleAuxFields) => void;
  disabled?: boolean;
  processMethod?: ProcessMethod | null;
  onProcessMethodChange?: (processMethod: ProcessMethod | null) => void;
  /** When true, wet/dry selectors render in {@link SamplePreparationMethodFields} instead. */
  hideMethodSelectors?: boolean;
  /** When `inset`, matches browse sample read-view grouped list styling. */
  appearance?: SampleFormLegacyAppearance;
  /** Preferred alias for {@link appearance}. */
  layout?: SampleFormLegacyAppearance;
};

type NumericFieldKey = {
  [K in keyof SampleAuxFields]-?: SampleAuxFields[K] extends number | undefined
    ? K
    : never;
}[keyof SampleAuxFields];

type TextFieldKey = {
  [K in keyof SampleAuxFields]-?: SampleAuxFields[K] extends string | undefined
    ? K
    : never;
}[keyof SampleAuxFields];

const NON_NEGATIVE_NUMERIC_KEYS = new Set<NumericFieldKey>([
  "vaseThicknessNm",
  "roughnessNm",
  "spinSpeedRpm",
  "spinAccelerationRpmPerS",
  "spinDurationS",
  "bladeSpeedMmPerS",
  "bladeGapUm",
  "depositionRateAngstromPerS",
  "basePressureTorr",
  "workingPressureTorr",
  "concentrationMgPerMl",
  "solutionStirringTimeH",
  "filterSizeUm",
  "oxideThicknessNm",
  "gloveboxO2Ppm",
  "gloveboxH2oPpm",
  "annealingTimeMin",
  "annealingRampCPerMin",
]);

const formLabelClass =
  "text-foreground mb-1.5 block text-sm font-medium leading-none";
const sectionHeaderClass = "text-muted text-sm font-medium leading-none";

function parseNumericInput(
  raw: string,
  key: NumericFieldKey,
): number | undefined {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  if (NON_NEGATIVE_NUMERIC_KEYS.has(key) && parsed < 0) {
    return undefined;
  }
  return parsed;
}

function NumericAuxField({
  fieldKey,
  label,
  value,
  onChange,
  disabled,
  step = "any",
}: {
  fieldKey: NumericFieldKey;
  label: string;
  value: number | undefined;
  onChange: (key: NumericFieldKey, value: number | undefined) => void;
  disabled?: boolean;
  step?: string;
}) {
  const [draft, setDraft] = useState(String(value ?? ""));

  useEffect(() => {
    setDraft(value == null ? "" : String(value));
  }, [value]);

  return (
    <TextField
      name={fieldKey}
      value={draft}
      onChange={(next) => {
        setDraft(next);
        onChange(fieldKey, parseNumericInput(next, fieldKey));
      }}
      variant="secondary"
      isDisabled={disabled}
      fullWidth
      className="min-w-0"
    >
      <Label className={formLabelClass}>{label}</Label>
      <InputGroup variant="secondary" fullWidth>
        <InputGroup.Input
          type="number"
          step={step}
          min={NON_NEGATIVE_NUMERIC_KEYS.has(fieldKey) ? 0 : undefined}
        />
      </InputGroup>
    </TextField>
  );
}

function TextAuxField({
  fieldKey,
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  fieldKey: TextFieldKey;
  label: string;
  value: string | undefined;
  onChange: (key: TextFieldKey, value: string | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <TextField
      name={fieldKey}
      value={value ?? ""}
      onChange={(next) => {
        onChange(fieldKey, next.trim().length > 0 ? next : undefined);
      }}
      variant="secondary"
      isDisabled={disabled}
      fullWidth
      className="min-w-0"
    >
      <Label className={formLabelClass}>{label}</Label>
      <InputGroup variant="secondary" fullWidth>
        <InputGroup.Input placeholder={placeholder} />
      </InputGroup>
    </TextField>
  );
}

export function SampleAuxAccordion({
  value,
  onChange,
  disabled = false,
  processMethod = null,
  onProcessMethodChange,
  hideMethodSelectors = false,
  appearance = "form",
  layout,
}: SampleAuxAccordionProps) {
  const formLayout = resolveSampleFormLayout(layout, appearance);
  const chrome = sampleAuxAccordionChrome(formLayout);
  const isInset = formLayout === "inset";
  const selectLayout = formLayout;
  const setNumeric = (key: NumericFieldKey, next: number | undefined) => {
    onChange({ ...value, [key]: next });
  };

  const setText = (key: TextFieldKey, next: string | undefined) => {
    onChange({ ...value, [key]: next });
  };

  const linkedMode = processMethodToProcessingMode(processMethod);
  const mode = effectiveSampleProcessingMode({
    processMethod,
    processingMode: value.processingMode,
  });
  const wetMethod = value.wetMethod;
  const dryMethod = value.dryMethod;

  const showWetSpin =
    mode === "wet" && (wetMethod === "spin" || wetMethod === undefined);
  const showWetBlade = mode === "wet" && wetMethod === "blade";
  const showWetSolution =
    mode === "wet" &&
    (wetMethod === "spin" ||
      wetMethod === "blade" ||
      wetMethod === "drop" ||
      wetMethod === "spray" ||
      wetMethod === "other" ||
      wetMethod === undefined);
  const showDryVacuum =
    mode === "dry" &&
    (dryMethod === "pvd" ||
      dryMethod === "cvd" ||
      dryMethod === "sputter" ||
      dryMethod === undefined);
  const showDryPowder = mode === "dry" && dryMethod === "powder";
  const showAtmosphere =
    mode === "dry" && dryMethod !== "powder" && dryMethod !== undefined;
  const showExtendedFields = mode === "wet" || mode === "dry";
  const showOtherMethodFields =
    (mode === "wet" && wetMethod === "other") ||
    (mode === "dry" && dryMethod === "other");
  const showMethodSelectorPanel = !hideMethodSelectors || showOtherMethodFields;

  const methodSelectorFields = (
    <>
      {!hideMethodSelectors ? (
        <>
          {linkedMode == null ? (
            <SampleFormSelect<SampleProcessingMode>
              label="Processing branch"
              layout={selectLayout}
              items={SAMPLE_PROCESSING_MODES}
              labels={SAMPLE_PROCESSING_MODE_LABELS}
              selectedKey={value.processingMode}
              onSelectionChange={(next) => {
                onChange(sampleAuxFieldsForProcessingMode(value, next));
                onProcessMethodChange?.(processingModeToProcessMethod(next));
              }}
              disabled={disabled}
              ariaLabel="Sample processing branch"
            />
          ) : null}

          {mode === "wet" ? (
            <SampleFormSelect<SampleWetMethod>
              label="Wet method"
              layout={selectLayout}
              items={SAMPLE_WET_METHODS}
              labels={SAMPLE_WET_METHOD_LABELS}
              selectedKey={value.wetMethod}
              onSelectionChange={(next) => onChange({ ...value, wetMethod: next })}
              disabled={disabled}
              ariaLabel="Wet preparation method"
            />
          ) : null}

          {mode === "dry" ? (
            <SampleFormSelect<SampleDryMethod>
              label="Dry method"
              layout={selectLayout}
              items={SAMPLE_DRY_METHODS}
              labels={SAMPLE_DRY_METHOD_LABELS}
              selectedKey={value.dryMethod}
              onSelectionChange={(next) => onChange({ ...value, dryMethod: next })}
              disabled={disabled}
              ariaLabel="Dry preparation method"
            />
          ) : null}
        </>
      ) : null}

      {mode === "wet" && wetMethod === "other" ? (
        <TextAuxField
          fieldKey="wetMethodOther"
          label="Wet method (other)"
          value={value.wetMethodOther}
          onChange={setText}
          disabled={disabled}
          placeholder="Describe the wet method"
        />
      ) : null}

      {mode === "dry" && dryMethod === "other" ? (
        <TextAuxField
          fieldKey="dryMethodOther"
          label="Dry method (other)"
          value={value.dryMethodOther}
          onChange={setText}
          disabled={disabled}
          placeholder="Describe the dry method"
        />
      ) : null}
    </>
  );

  return (
    <section
      className={isInset ? "flex flex-col gap-3" : "flex flex-col gap-3"}
      aria-labelledby="sample-aux-heading"
    >
      {isInset ? (
        <SampleMetadataSectionCaption
          title="Extended preparation"
          hint="Composition, solution, substrate, and annealing details."
        />
      ) : (
        <div>
          <h2 id="sample-aux-heading" className={sectionHeaderClass}>
            Extended sample preparation
            <span className="font-normal"> (optional)</span>
          </h2>
          <p className="text-muted mt-1 text-xs leading-snug">
            Optional deposition, solution, substrate, and annealing details.
          </p>
        </div>
      )}

      {showMethodSelectorPanel ? (
        isInset ? (
          <SampleMetadataInsetGroup ariaLabel="Extended preparation method">
            {methodSelectorFields}
          </SampleMetadataInsetGroup>
        ) : (
          <div className="border-border bg-surface relative z-[1] grid gap-4 overflow-visible rounded-lg border p-4 sm:grid-cols-2">
            {methodSelectorFields}
          </div>
        )
      ) : null}

      {!showExtendedFields ? (
        <p className="text-muted text-xs">
          Choose wet or dry processing to reveal method-specific fields.
        </p>
      ) : null}

      {showExtendedFields ? (
        <Accordion
          allowsMultipleExpanded
          variant="surface"
          aria-label="Extended sample preparation sections"
          className={chrome.rootClass}
        >
          {showWetSpin ? (
            <Accordion.Item id="deposition-spin" className={chrome.itemClass}>
              <Accordion.Heading>
                <Accordion.Trigger className={chrome.triggerClass}>
                  <span className="text-foreground min-w-0 flex-1 truncate text-[15px] font-medium">
                    Spin coating
                  </span>
                  <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
                    <ChevronDownIcon className="h-4 w-4" />
                  </Accordion.Indicator>
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body className={chrome.bodySpinGridClass}>
                  <NumericAuxField
                    fieldKey="spinSpeedRpm"
                    label="Spin speed (rpm)"
                    value={value.spinSpeedRpm}
                    onChange={setNumeric}
                    disabled={disabled}
                  />
                  <NumericAuxField
                    fieldKey="spinAccelerationRpmPerS"
                    label="Spin acceleration (rpm/s)"
                    value={value.spinAccelerationRpmPerS}
                    onChange={setNumeric}
                    disabled={disabled}
                  />
                  <NumericAuxField
                    fieldKey="spinDurationS"
                    label="Spin duration (s)"
                    value={value.spinDurationS}
                    onChange={setNumeric}
                    disabled={disabled}
                  />
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ) : null}

          {showWetBlade ? (
            <Accordion.Item id="deposition-blade" className={chrome.itemClass}>
              <Accordion.Heading>
                <Accordion.Trigger className={chrome.triggerClass}>
                  <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                    Blade coating
                  </span>
                  <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
                    <ChevronDownIcon className="h-4 w-4" />
                  </Accordion.Indicator>
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body className={chrome.bodyGridClass}>
                  <NumericAuxField
                    fieldKey="bladeSpeedMmPerS"
                    label="Blade speed (mm/s)"
                    value={value.bladeSpeedMmPerS}
                    onChange={setNumeric}
                    disabled={disabled}
                  />
                  <NumericAuxField
                    fieldKey="bladeGapUm"
                    label="Blade gap (um)"
                    value={value.bladeGapUm}
                    onChange={setNumeric}
                    disabled={disabled}
                  />
                  <NumericAuxField
                    fieldKey="bladeTemperatureC"
                    label="Blade temperature (C)"
                    value={value.bladeTemperatureC}
                    onChange={setNumeric}
                    disabled={disabled}
                  />
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ) : null}

          {showDryVacuum ? (
            <Accordion.Item id="deposition-vacuum" className={chrome.itemClass}>
              <Accordion.Heading>
                <Accordion.Trigger className={chrome.triggerClass}>
                  <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                    Vacuum deposition
                  </span>
                  <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
                    <ChevronDownIcon className="h-4 w-4" />
                  </Accordion.Indicator>
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body className={chrome.bodyGridClass}>
                  <NumericAuxField
                    fieldKey="depositionRateAngstromPerS"
                    label="Deposition rate (A/s)"
                    value={value.depositionRateAngstromPerS}
                    onChange={setNumeric}
                    disabled={disabled}
                  />
                  <NumericAuxField
                    fieldKey="basePressureTorr"
                    label="Base pressure (Torr)"
                    value={value.basePressureTorr}
                    onChange={setNumeric}
                    disabled={disabled}
                  />
                  <NumericAuxField
                    fieldKey="workingPressureTorr"
                    label="Working pressure (Torr)"
                    value={value.workingPressureTorr}
                    onChange={setNumeric}
                    disabled={disabled}
                  />
                  <NumericAuxField
                    fieldKey="sourceTemperatureC"
                    label="Source temperature (C)"
                    value={value.sourceTemperatureC}
                    onChange={setNumeric}
                    disabled={disabled}
                  />
                  <NumericAuxField
                    fieldKey="substrateTemperatureC"
                    label="Substrate temperature (C)"
                    value={value.substrateTemperatureC}
                    onChange={setNumeric}
                    disabled={disabled}
                  />
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ) : null}

          {showWetSolution ? (
            <Accordion.Item id="solution-chemistry" className={chrome.itemClass}>
              <Accordion.Heading>
                <Accordion.Trigger className={chrome.triggerClass}>
                  <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                    Solution chemistry
                  </span>
                  <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
                    <ChevronDownIcon className="h-4 w-4" />
                  </Accordion.Indicator>
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body className={chrome.bodyGridClass}>
                  <NumericAuxField
                    fieldKey="concentrationMgPerMl"
                    label="Concentration (mg/mL)"
                    value={value.concentrationMgPerMl}
                    onChange={setNumeric}
                    disabled={disabled}
                  />
                  <NumericAuxField
                    fieldKey="solutionStirringTimeH"
                    label="Stirring time (h)"
                    value={value.solutionStirringTimeH}
                    onChange={setNumeric}
                    disabled={disabled}
                  />
                  <NumericAuxField
                    fieldKey="solutionStirringTemperatureC"
                    label="Stirring temperature (C)"
                    value={value.solutionStirringTemperatureC}
                    onChange={setNumeric}
                    disabled={disabled}
                  />
                  <NumericAuxField
                    fieldKey="filterSizeUm"
                    label="Filter size (um)"
                    value={value.filterSizeUm}
                    onChange={setNumeric}
                    disabled={disabled}
                  />
                  <NumericAuxField
                    fieldKey="vaseThicknessNm"
                    label="VASE thickness (nm)"
                    value={value.vaseThicknessNm}
                    onChange={setNumeric}
                    disabled={disabled}
                  />
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ) : null}

          <Accordion.Item id="substrate-detail" className={chrome.itemClass}>
            <Accordion.Heading>
              <Accordion.Trigger className={chrome.triggerClass}>
                <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                  Substrate detail
                </span>
                <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
                  <ChevronDownIcon className="h-4 w-4" />
                </Accordion.Indicator>
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className={chrome.bodyGridClass}>
                <TextAuxField
                  fieldKey="substrateOrientation"
                  label="Substrate orientation"
                  value={value.substrateOrientation}
                  onChange={setText}
                  disabled={disabled}
                />
                <TextAuxField
                  fieldKey="substrateLot"
                  label="Substrate lot"
                  value={value.substrateLot}
                  onChange={setText}
                  disabled={disabled}
                />
                <NumericAuxField
                  fieldKey="oxideThicknessNm"
                  label="Oxide thickness (nm)"
                  value={value.oxideThicknessNm}
                  onChange={setNumeric}
                  disabled={disabled}
                />
                <NumericAuxField
                  fieldKey="roughnessNm"
                  label="Roughness (nm)"
                  value={value.roughnessNm}
                  onChange={setNumeric}
                  disabled={disabled}
                />
                <TextAuxField
                  fieldKey="orientationNotes"
                  label="Orientation notes"
                  value={value.orientationNotes}
                  onChange={setText}
                  disabled={disabled}
                />
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>

          {showAtmosphere ? (
            <Accordion.Item id="atmosphere" className={chrome.itemClass}>
              <Accordion.Heading>
                <Accordion.Trigger className={chrome.triggerClass}>
                  <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                    Atmosphere
                  </span>
                  <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
                    <ChevronDownIcon className="h-4 w-4" />
                  </Accordion.Indicator>
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body className={chrome.bodyGridClass}>
                  <TextAuxField
                    fieldKey="depositionAtmosphere"
                    label="Deposition atmosphere"
                    value={value.depositionAtmosphere}
                    onChange={setText}
                    disabled={disabled}
                  />
                  <NumericAuxField
                    fieldKey="gloveboxO2Ppm"
                    label="Glovebox O2 (ppm)"
                    value={value.gloveboxO2Ppm}
                    onChange={setNumeric}
                    disabled={disabled}
                  />
                  <NumericAuxField
                    fieldKey="gloveboxH2oPpm"
                    label="Glovebox H2O (ppm)"
                    value={value.gloveboxH2oPpm}
                    onChange={setNumeric}
                    disabled={disabled}
                  />
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ) : null}

          {showDryPowder ? (
            <Accordion.Item id="powder-prep" className={chrome.itemClass}>
              <Accordion.Heading>
                <Accordion.Trigger className={chrome.triggerClass}>
                  <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                    Powder preparation
                  </span>
                  <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
                    <ChevronDownIcon className="h-4 w-4" />
                  </Accordion.Indicator>
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body className={chrome.bodyGridClass}>
                  <NumericAuxField
                    fieldKey="roughnessNm"
                    label="Particle / surface roughness (nm)"
                    value={value.roughnessNm}
                    onChange={setNumeric}
                    disabled={disabled}
                  />
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ) : null}

          <Accordion.Item id="annealing" className={chrome.itemClass}>
            <Accordion.Heading>
              <Accordion.Trigger className={chrome.triggerClass}>
                <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                  Annealing
                </span>
                <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
                  <ChevronDownIcon className="h-4 w-4" />
                </Accordion.Indicator>
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className={chrome.bodyGridClass}>
                <NumericAuxField
                  fieldKey="annealingTemperatureC"
                  label="Annealing temperature (C)"
                  value={value.annealingTemperatureC}
                  onChange={setNumeric}
                  disabled={disabled}
                />
                <NumericAuxField
                  fieldKey="annealingTimeMin"
                  label="Annealing time (min)"
                  value={value.annealingTimeMin}
                  onChange={setNumeric}
                  disabled={disabled}
                />
                <TextAuxField
                  fieldKey="annealingAtmosphere"
                  label="Annealing atmosphere"
                  value={value.annealingAtmosphere}
                  onChange={setText}
                  disabled={disabled}
                />
                <NumericAuxField
                  fieldKey="annealingRampCPerMin"
                  label="Annealing ramp (C/min)"
                  value={value.annealingRampCPerMin}
                  onChange={setNumeric}
                  disabled={disabled}
                />
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item id="sample-aux-notes" className={chrome.itemClass}>
            <Accordion.Heading>
              <Accordion.Trigger className={chrome.triggerClass}>
                <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                  Notes
                </span>
                <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
                  <ChevronDownIcon className="h-4 w-4" />
                </Accordion.Indicator>
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className={chrome.bodyStackGridClass}>
                <TextAuxField
                  fieldKey="preparationDescription"
                  label="Preparation description"
                  value={value.preparationDescription}
                  onChange={setText}
                  disabled={disabled}
                />
                <TextAuxField
                  fieldKey="notes"
                  label="Notes"
                  value={value.notes}
                  onChange={setText}
                  disabled={disabled}
                />
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      ) : null}
    </section>
  );
}

export function sampleAuxFieldsHasData(fields: SampleAuxFields): boolean {
  return Object.values(fields).some((entry) => {
    if (entry == null) {
      return false;
    }
    if (typeof entry === "string") {
      return entry.trim().length > 0;
    }
    return Number.isFinite(entry);
  });
}

export function emptySampleAuxFields(): SampleAuxFields {
  return {};
}
