"use client";

import type { ProcessMethod } from "~/prisma/browser";
import {
  SampleMetadataInsetGroup,
  SampleMetadataSectionCaption,
} from "~/components/nexafs/sample-metadata-chrome-shared";
import { SampleFormInsetTextRow } from "./sample-form-inset-field";
import {
  PROCESS_METHOD_ITEMS,
  PROCESS_METHOD_LABELS,
} from "./sample-preparation-method-fields";
import { SampleFormSelect } from "./sample-form-select";

export type SampleSpecimenFieldsProps = {
  showProcessMethodSelect: boolean;
  processMethod: ProcessMethod | null;
  setProcessMethod: (value: ProcessMethod | null) => void;
  substrate: string;
  setSubstrate: (value: string) => void;
  solvent: string;
  setSolvent: (value: string) => void;
  thickness: number | null;
  setThickness: (value: number | null) => void;
  molecularWeight: number | null;
  setMolecularWeight: (value: number | null) => void;
};

/**
 * Renders substrate, solvent, thickness, and molecular weight in one inset preparation group.
 */
export function SampleSpecimenFields({
  showProcessMethodSelect,
  processMethod,
  setProcessMethod,
  substrate,
  setSubstrate,
  solvent,
  setSolvent,
  thickness,
  setThickness,
  molecularWeight,
  setMolecularWeight,
}: SampleSpecimenFieldsProps) {
  return (
    <section aria-labelledby="sample-preparation-fields">
      <SampleMetadataSectionCaption title="Preparation" />
      <SampleMetadataInsetGroup ariaLabel="Sample preparation">
        {showProcessMethodSelect ? (
          <SampleFormSelect<ProcessMethod>
            label="Process method"
            tooltip="Method used to process the sample"
            optional
            layout="inset"
            items={PROCESS_METHOD_ITEMS}
            labels={PROCESS_METHOD_LABELS}
            selectedKey={processMethod ?? undefined}
            onSelectionChange={(next) => {
              setProcessMethod(next ?? null);
            }}
            ariaLabel="Process method (optional)"
          />
        ) : null}
        <SampleFormInsetTextRow
          name="substrate"
          label="Substrate"
          tooltip="Substrate material on which the sample sits"
          optional
          value={substrate}
          onChange={setSubstrate}
          placeholder="e.g., Si wafer, glass"
        />
        <SampleFormInsetTextRow
          name="solvent"
          label="Solvent"
          tooltip="Solvent used during sample prep (if any)"
          optional
          value={solvent}
          onChange={setSolvent}
          placeholder="e.g., chloroform, toluene"
        />
        <SampleFormInsetTextRow
          name="thickness"
          label="Thickness (nm)"
          tooltip="Sample thickness in nanometers"
          optional
          type="number"
          min={0}
          step={0.1}
          value={thickness != null ? String(thickness) : ""}
          onChange={(value) =>
            setThickness(value !== "" ? parseFloat(value) : null)
          }
          placeholder="e.g., 50"
        />
        <SampleFormInsetTextRow
          name="molecularWeight"
          label="Molecular weight (g/mol)"
          tooltip="Molecular weight in grams per mole"
          optional
          type="number"
          min={0}
          step={0.01}
          value={molecularWeight != null ? String(molecularWeight) : ""}
          onChange={(value) =>
            setMolecularWeight(value !== "" ? parseFloat(value) : null)
          }
          placeholder="e.g., 1000.5"
        />
      </SampleMetadataInsetGroup>
    </section>
  );
}
