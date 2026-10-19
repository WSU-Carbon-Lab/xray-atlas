"use client";

import { Button, Modal } from "@heroui/react";

/** Server-computed description of the version change a pending edit will cause. */
export interface VersionBumpPreview {
  currentVersion: string;
  nextVersion: string;
  level: "major" | "minor" | "patch";
  willMintDoi: boolean;
}

export interface VersionBumpConfirmDialogProps {
  /** Controls visibility of the dialog. */
  isOpen: boolean;
  /** Preview from `experiments.previewVersionBump`; the dialog states its versions verbatim. */
  preview: VersionBumpPreview;
  /** Invoked when the user accepts the version bump. */
  onConfirm: () => void;
  /** Invoked on Cancel, Escape, or backdrop dismissal; the edit must not be saved. */
  onCancel: () => void;
}

/**
 * Confirmation modal shown before a dataset edit that advances the dataset version.
 * States the current and next version and whether a new Zenodo version DOI will be minted.
 */
export function VersionBumpConfirmDialog({
  isOpen,
  preview,
  onConfirm,
  onCancel,
}: VersionBumpConfirmDialogProps) {
  const { currentVersion, nextVersion, willMintDoi } = preview;
  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <Modal.Container size="md">
        <Modal.Dialog aria-label="Confirm dataset version change">
          <Modal.Header>Confirm version change</Modal.Header>
          <Modal.Body>
            <p className="text-text-secondary text-sm">
              {willMintDoi
                ? `This change will bump your Zenodo version from ${currentVersion} to ${nextVersion} and mint a new version DOI.`
                : `This change will advance the dataset version from ${currentVersion} to ${nextVersion}. No new DOI will be minted because this dataset has no Zenodo deposit.`}
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onPress={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" onPress={onConfirm}>
              Confirm
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
