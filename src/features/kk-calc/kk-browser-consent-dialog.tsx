"use client";

import type { ReactNode } from "react";
import { SimpleDialog } from "~/components/ui/dialog";
import { Button } from "@heroui/react";

export interface KkBrowserConsentDialogProps {
  readonly isOpen: boolean;
  readonly onDismiss: () => void;
  readonly onAccept: () => void;
  readonly title?: string;
  readonly children?: ReactNode;
}

/**
 * Session-gated consent surface for CPU-heavy browser-side Kramers–Kronig transforms.
 *
 * @param isOpen Controls dialog visibility.
 * @param onDismiss Invoked for cancel, backdrop close, or the header close control without granting consent.
 * @param onAccept Invoked when the user explicitly accepts; callers persist consent and continue work.
 */
export function KkBrowserConsentDialog({
  isOpen,
  onDismiss,
  onAccept,
  title = "Browser Kramers–Kronig calculation",
  children,
}: KkBrowserConsentDialogProps) {
  return (
    <SimpleDialog isOpen={isOpen} onClose={onDismiss} title={title}>
      <div className="text-muted space-y-4 text-left text-sm">
        {children ?? (
          <p>
            Kramers–Kronig delta-from-beta integration runs entirely in your browser and
            may take noticeable time on large spectra. Results are written only after you
            submit or use an authorized recalculate action.
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onPress={onDismiss}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onPress={onAccept}>
            Allow for this session
          </Button>
        </div>
      </div>
    </SimpleDialog>
  );
}
