"use client";

import { useRouter } from "next/navigation";
import { Button, Input, Label, TextField } from "@heroui/react";
import { SimpleDialog } from "~/components/ui/dialog";
import { showToast } from "~/components/ui/toast";

type StxmUploadDialogProps = {
  isOpen: boolean;
  scanLabel: string;
  onClose: () => void;
  onKeepInCache: () => void;
};

/**
 * Quality gate dialog: keep reduced spectrum in session or open Atlas contribute upload.
 */
export function StxmUploadDialog({
  isOpen,
  scanLabel,
  onClose,
  onKeepInCache,
}: StxmUploadDialogProps) {
  const router = useRouter();

  return (
    <SimpleDialog isOpen={isOpen} onClose={onClose} title={`Upload ${scanLabel}`}>
      <div className="space-y-4">
        <p className="text-muted text-sm">
          Keep this reduced spectrum in the session cache for preview, or upload to
          Atlas with molecule, instrument, edge, and attribution on the contribute
          flow.
        </p>
        <TextField>
          <Label>Instrument</Label>
          <Input value="ALS Beamline 5.3.2.2 STXM" readOnly />
        </TextField>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onPress={onClose}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onPress={() => {
              onKeepInCache();
              onClose();
              showToast("Scan kept in session cache", "success");
            }}
          >
            Keep in cache
          </Button>
          <Button
            variant="primary"
            onPress={() => {
              onClose();
              router.push("/contribute/nexafs?from=dashboard-stxm");
              showToast("Open contribute flow to finish upload", "success");
            }}
          >
            Upload to Atlas
          </Button>
        </div>
      </div>
    </SimpleDialog>
  );
}
