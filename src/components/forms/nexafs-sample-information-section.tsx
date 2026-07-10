"use client";

import { SamplePreparationMethodFields } from "./sample-preparation-method-fields";
import { SampleInformationSectionHeading } from "./sample-information-section-heading";
import { SampleSpecimenFields } from "./sample-specimen-fields";
import { SampleVendorSection } from "./sample-vendor-section";
import type { NexafsSampleInformationSectionProps } from "./types";

export function NexafsSampleInformationSection({
  showSectionHeading = true,
  showVendorCreateFields = true,
  linkedSampleAux,
  processMethod,
  setProcessMethod,
  substrate,
  setSubstrate,
  patterningLayer,
  setPatterningLayer,
  solvent,
  setSolvent,
  thickness,
  setThickness,
  molecularWeight,
  setMolecularWeight,
  selectedVendorId,
  setSelectedVendorId,
  newVendorName,
  setNewVendorName,
  newVendorUrl,
  setNewVendorUrl,
  onVendorFieldsChange,
  vendors,
  isLoadingVendors,
}: NexafsSampleInformationSectionProps) {
  return (
    <div className="flex flex-col gap-5">
      {showSectionHeading ? <SampleInformationSectionHeading /> : null}

      {linkedSampleAux ? (
        <SamplePreparationMethodFields
          appearance="inset"
          processMethod={processMethod}
          setProcessMethod={setProcessMethod}
          aux={linkedSampleAux.value}
          onAuxChange={linkedSampleAux.onChange}
          onProcessMethodChange={linkedSampleAux.onProcessMethodChange}
        />
      ) : null}

      <SampleSpecimenFields
        showProcessMethodSelect={!linkedSampleAux}
        processMethod={processMethod}
        processingMode={linkedSampleAux?.value.processingMode}
        setProcessMethod={setProcessMethod}
        substrate={substrate}
        setSubstrate={setSubstrate}
        patterningLayer={patterningLayer}
        setPatterningLayer={setPatterningLayer}
        solvent={solvent}
        setSolvent={setSolvent}
        thickness={thickness}
        setThickness={setThickness}
        molecularWeight={molecularWeight}
        setMolecularWeight={setMolecularWeight}
      />

      <SampleVendorSection
        allowCreate={showVendorCreateFields}
        vendors={vendors}
        selectedVendorId={selectedVendorId}
        newVendorName={newVendorName}
        newVendorUrl={newVendorUrl}
        onSelectedVendorIdChange={setSelectedVendorId}
        onNewVendorNameChange={setNewVendorName}
        onNewVendorUrlChange={setNewVendorUrl}
        onVendorFieldsChange={onVendorFieldsChange}
        isLoadingVendors={isLoadingVendors}
      />
    </div>
  );
}
