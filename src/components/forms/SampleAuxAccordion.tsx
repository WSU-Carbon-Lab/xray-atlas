"use client";

import { useEffect, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { Accordion, Input, Label, TextField } from "@heroui/react";
import type { SampleAuxFields } from "~/features/process-nexafs/types";

type SampleAuxAccordionProps = {
  value: SampleAuxFields;
  onChange: (next: SampleAuxFields) => void;
  disabled?: boolean;
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

const labelClass = "text-foreground text-xs font-medium";

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
      isDisabled={disabled}
      fullWidth
    >
      <Label className={labelClass}>{label}</Label>
      <Input type="number" step={step} min={NON_NEGATIVE_NUMERIC_KEYS.has(fieldKey) ? 0 : undefined} />
    </TextField>
  );
}

function TextAuxField({
  fieldKey,
  label,
  value,
  onChange,
  disabled,
}: {
  fieldKey: TextFieldKey;
  label: string;
  value: string | undefined;
  onChange: (key: TextFieldKey, value: string | undefined) => void;
  disabled?: boolean;
}) {
  return (
    <TextField
      name={fieldKey}
      value={value ?? ""}
      onChange={(next) => {
        onChange(fieldKey, next.trim().length > 0 ? next : undefined);
      }}
      isDisabled={disabled}
      fullWidth
    >
      <Label className={labelClass}>{label}</Label>
      <Input />
    </TextField>
  );
}

/**
 * Optional extended sample preparation fields grouped in a surface accordion.
 */
export function SampleAuxAccordion({
  value,
  onChange,
  disabled = false,
}: SampleAuxAccordionProps) {
  const setNumeric = (key: NumericFieldKey, next: number | undefined) => {
    onChange({ ...value, [key]: next });
  };

  const setText = (key: TextFieldKey, next: string | undefined) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <section className="flex flex-col gap-2" aria-labelledby="sample-aux-heading">
      <div>
        <h2
          id="sample-aux-heading"
          className="text-muted text-sm font-medium leading-none"
        >
          Extended sample preparation
        </h2>
        <p className="text-muted mt-1 text-xs leading-snug">
          Optional deposition, solution, substrate, and annealing details.
        </p>
      </div>

      <Accordion
        allowsMultipleExpanded
        variant="surface"
        aria-label="Extended sample preparation sections"
        className="border-border w-full rounded-lg border"
      >
        <Accordion.Item id="deposition-kinematics">
          <Accordion.Heading>
            <Accordion.Trigger className="flex w-full items-center gap-2 text-start">
              <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                Deposition kinematics
              </span>
              <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
                <ChevronDownIcon className="h-4 w-4" />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="grid gap-3 pt-0 sm:grid-cols-2">
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

        <Accordion.Item id="solution-chemistry">
          <Accordion.Heading>
            <Accordion.Trigger className="flex w-full items-center gap-2 text-start">
              <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                Solution chemistry
              </span>
              <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
                <ChevronDownIcon className="h-4 w-4" />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="grid gap-3 pt-0 sm:grid-cols-2">
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
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item id="substrate-detail">
          <Accordion.Heading>
            <Accordion.Trigger className="flex w-full items-center gap-2 text-start">
              <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                Substrate detail
              </span>
              <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
                <ChevronDownIcon className="h-4 w-4" />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="grid gap-3 pt-0 sm:grid-cols-2">
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
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item id="atmosphere">
          <Accordion.Heading>
            <Accordion.Trigger className="flex w-full items-center gap-2 text-start">
              <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                Atmosphere
              </span>
              <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
                <ChevronDownIcon className="h-4 w-4" />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="grid gap-3 pt-0 sm:grid-cols-2">
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

        <Accordion.Item id="annealing">
          <Accordion.Heading>
            <Accordion.Trigger className="flex w-full items-center gap-2 text-start">
              <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                Annealing
              </span>
              <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
                <ChevronDownIcon className="h-4 w-4" />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="grid gap-3 pt-0 sm:grid-cols-2">
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

        <Accordion.Item id="sample-aux-notes">
          <Accordion.Heading>
            <Accordion.Trigger className="flex w-full items-center gap-2 text-start">
              <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                Notes
              </span>
              <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
                <ChevronDownIcon className="h-4 w-4" />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="grid gap-3 pt-0">
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
