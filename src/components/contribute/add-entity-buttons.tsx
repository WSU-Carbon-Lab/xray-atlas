"use client";

import {
  BeakerIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { AddEntityModal } from "./add-entity-modal";
import MoleculeContributePage from "~/app/contribute/molecule/page";
import FacilityContributePage from "~/app/contribute/facility/page";
import { InstrumentContributionForm } from "~/components/forms/instrument-contribution-form";

type BaseTriggerProps = {
  className?: string;
};

type MoleculeTriggerProps = BaseTriggerProps & {
  onCreated?: (moleculeId?: string) => void;
};

export function AddMoleculeButton({
  className,
  onCreated,
}: MoleculeTriggerProps) {
  return (
    <AddEntityModal
      title="Contribute Molecule"
      description="Upload a molecule entry with synonyms, identifiers, and structural metadata."
      triggerLabel="Add Molecule"
      triggerDescription="Share a new molecule with the community."
      triggerIcon={BeakerIcon}
      triggerClassName={className}
      size="xl"
      fullWidth
    >
      {({ close }) => (
        <MoleculeContributePage
          variant="modal"
          onCompleted={(payload) => {
            onCreated?.(payload.moleculeId);
          }}
          onClose={close}
        />
      )}
    </AddEntityModal>
  );
}

type FacilityTriggerProps = BaseTriggerProps & {
  onCreated?: (facilityId?: string) => void;
};

export function AddFacilityButton({
  className,
  onCreated,
}: FacilityTriggerProps) {
  return (
    <AddEntityModal
      title="Contribute Facility"
      description="Register a new facility and optionally its instruments."
      triggerLabel="Add Facility"
      triggerDescription="Document a facility that hosts instrumentation."
      triggerIcon={BuildingOfficeIcon}
      triggerClassName={className}
      size="lg"
      fullWidth
    >
      {({ close }) => (
        <FacilityContributePage
          variant="modal"
          onCompleted={(payload) => {
            onCreated?.(payload.facilityId);
          }}
          onClose={close}
        />
      )}
    </AddEntityModal>
  );
}

type InstrumentTriggerProps = BaseTriggerProps & {
  facilityId?: string;
  facilityName?: string;
  onCreated?: (payload: { instrumentId: string; facilityId: string }) => void;
};

export function AddInstrumentButton({
  className,
  facilityId,
  facilityName,
  onCreated,
}: InstrumentTriggerProps) {
  const variant = facilityId ? "compact" : "card";
  return (
    <AddEntityModal
      title={`Add Instrument${facilityName ? ` · ${facilityName}` : ""}`}
      description={
        facilityName
          ? `Register a new instrument for ${facilityName}.`
          : "Register an instrument and associate it with a facility."
      }
      triggerLabel="Add Instrument"
      triggerDescription={
        facilityName
          ? "Document an instrument operating at this facility."
          : "Link an instrument to a facility."
      }
      triggerIcon={WrenchScrewdriverIcon}
      triggerClassName={className}
      size="lg"
      fullWidth={variant === "card"}
      variant={variant}
    >
      {({ close }) => (
        <InstrumentContributionForm
          facilityId={facilityId}
          facilityName={facilityName}
          onCompleted={(payload) => {
            onCreated?.(payload);
          }}
          onClose={close}
        />
      )}
    </AddEntityModal>
  );
}
