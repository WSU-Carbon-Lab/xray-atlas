"use client";

import MoleculeContributePage from "~/app/contribute/molecule/page";
import { SimpleDialog } from "~/app/components/SimpleDialog";

interface AddMoleculeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMoleculeCreated: (moleculeId: string) => void;
}

export function AddMoleculeModal({
  isOpen,
  onClose,
  onMoleculeCreated,
}: AddMoleculeModalProps) {
  return (
    <SimpleDialog isOpen={isOpen} onClose={onClose} title="Add New Molecule">
      <div className="max-h-[80vh] overflow-y-auto">
        <MoleculeContributePage
          variant="modal"
          onCompleted={({ moleculeId }) => {
            if (moleculeId) {
              onMoleculeCreated(moleculeId);
            }
          }}
          onClose={onClose}
        />
      </div>
    </SimpleDialog>
  );
}
