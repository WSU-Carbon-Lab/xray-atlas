"use client";

import dynamic, { type DynamicOptionsLoadingProps } from "next/dynamic";
import { BeakerIcon } from "@heroicons/react/24/outline";
import type { MoleculeContributePageProps } from "~/components/forms/types";
import { AddEntityModal } from "./add-entity-modal";

/**
 * Browse trigger that opens the molecule contribution dialog.
 *
 * The molecule contribute page, including the sketcher and OpenChemLib, stays
 * in a separate client chunk. That chunk evaluates only after this dialog is
 * open. Facility and instrument triggers do not use this module.
 */

interface AddMoleculeButtonProps {
  /** Optional classes applied to the trigger card. */
  className?: string;
  /**
   * Called with the created molecule id when the form finishes.
   * The id is omitted when the form completes without one.
   */
  onCreated?: (moleculeId?: string) => void;
}

function MoleculeContributeModalFallback({
  error,
  isLoading,
}: DynamicOptionsLoadingProps) {
  if (error) {
    return (
      <p className="text-danger text-sm" role="alert">
        The molecule form could not be loaded. Close this dialog and try again.
      </p>
    );
  }
  if (!isLoading) {
    return null;
  }
  return (
    <p className="text-muted text-sm" aria-busy="true">
      Loading molecule form...
    </p>
  );
}

const MoleculeContributePage = dynamic<MoleculeContributePageProps>(
  () => import("~/app/contribute/molecule/page").then((mod) => mod.default),
  {
    ssr: false,
    loading: MoleculeContributeModalFallback,
  },
);

/**
 * Renders the Add Molecule trigger and, once the dialog is open, the molecule
 * contribute form.
 *
 * `onCreated` receives the molecule id from the form completion payload.
 * `onClose` from the dialog is forwarded to the form so decline and dismiss
 * still close the dialog. Chunk load failure renders an alert inside the
 * dialog and does not throw to the caller.
 *
 * @param props.className - Optional classes on the trigger card.
 * @param props.onCreated - Completion callback. Receives `moleculeId` when the form supplies one.
 * @returns The trigger card and the contribution dialog.
 */
export function AddMoleculeButton({
  className,
  onCreated,
}: AddMoleculeButtonProps) {
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
