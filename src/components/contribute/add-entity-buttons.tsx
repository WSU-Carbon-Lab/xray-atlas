"use client";

import {
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { AddEntityModal } from "./add-entity-modal";
import FacilityContributePage from "~/app/contribute/facility/page";
import { InstrumentContributionForm } from "~/components/forms/instrument-contribution-form";

/**
 * Facility and instrument contribution triggers.
 *
 * These forms stay statically imported. The molecule trigger lives in
 * `add-molecule-button.tsx` so the molecule sketcher is not part of this module.
 */

interface BaseTriggerProps {
  /** Optional classes applied to the trigger card. */
  className?: string;
}

interface FacilityTriggerProps extends BaseTriggerProps {
  /**
   * Called with the created facility id when the form finishes.
   * The id is omitted when the form completes without one.
   */
  onCreated?: (facilityId?: string) => void;
}

/**
 * Renders the Add Facility trigger and, once the dialog is open, the facility
 * contribute form.
 *
 * @param props.className - Optional classes on the trigger card.
 * @param props.onCreated - Completion callback. Receives `facilityId` when the form supplies one.
 * @returns The trigger card and the contribution dialog.
 */
export function AddFacilityButton({
  className,
  onCreated,
}: FacilityTriggerProps) {
  return (
    <AddEntityModal
      title="Contribute Facility"
      description="Pick or register a facility, then add instruments in the same form."
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

interface InstrumentTriggerProps extends BaseTriggerProps {
  /** Facility the new instrument is attached to. Omit to let the form pick one. */
  facilityId?: string;
  /** Display name included in the dialog title when `facilityId` is set. */
  facilityName?: string;
  /** Called with the created instrument id and its facility id. */
  onCreated?: (payload: { instrumentId: string; facilityId: string }) => void;
}

/**
 * Renders the Add Instrument trigger and, once the dialog is open, the
 * instrument contribution form.
 *
 * When `facilityId` is set, the trigger uses the header variant and the form
 * is bound to that facility. Otherwise the trigger is a card and the form
 * asks for a facility.
 *
 * @param props.className - Optional classes on the trigger card.
 * @param props.facilityId - Facility id passed through to the form.
 * @param props.facilityName - Facility label shown in the dialog title and trigger description.
 * @param props.onCreated - Completion callback with `instrumentId` and `facilityId`.
 * @returns The trigger card and the contribution dialog.
 */
export function AddInstrumentButton({
  className,
  facilityId,
  facilityName,
  onCreated,
}: InstrumentTriggerProps) {
  const variant = facilityId ? "header" : "card";
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
