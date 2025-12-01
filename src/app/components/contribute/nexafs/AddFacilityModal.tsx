"use client";

import FacilityContributePage from "~/app/contribute/facility/page";
import { SimpleDialog } from "~/app/components/SimpleDialog";

interface AddFacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFacilityCreated: (facilityId: string, instrumentId: string) => void;
}

export function AddFacilityModal({
  isOpen,
  onClose,
  onFacilityCreated,
}: AddFacilityModalProps) {
  return (
    <SimpleDialog isOpen={isOpen} onClose={onClose} title="Add Facility and Instrument">
      <div className="max-h-[80vh] overflow-y-auto">
        <FacilityContributePage
          variant="modal"
          onCompleted={({ facilityId, instrumentId }) => {
            if (facilityId && instrumentId) {
              onFacilityCreated(facilityId, instrumentId);
            } else {
              console.warn("Facility created without instrument reference");
            }
          }}
          onClose={onClose}
        />
      </div>
    </SimpleDialog>
  );
}
