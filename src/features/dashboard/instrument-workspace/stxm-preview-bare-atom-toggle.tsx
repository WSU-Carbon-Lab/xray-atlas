"use client";

import { ToggleButton, ToggleButtonGroup, Toolbar } from "@heroui/react";
import { BareAtomStepEdgeIcon } from "~/components/icons";
import {
  plotToolbarAttachedToggleGroupHorizontalClass,
  plotToolbarAttachedToolbarHorizontalClass,
  plotToolbarGlyphToggleGroupItemHorizontalClass,
  PlotToolbarRichHint,
} from "~/components/plots/toolbars";

export type StxmPreviewBareAtomToggleProps = {
  showBareAtomOverlay: boolean;
  onShowBareAtomOverlayChange: (enabled: boolean) => void;
  disabled: boolean;
  disabledReason: string;
};

/**
 * Horizontal bare-atom step-edge toggle for the STXM preview compare plot header.
 */
export function StxmPreviewBareAtomToggle({
  showBareAtomOverlay,
  onShowBareAtomOverlayChange,
  disabled,
  disabledReason,
}: StxmPreviewBareAtomToggleProps) {
  return (
    <Toolbar
      isAttached
      aria-label="Bare atom reference"
      className={plotToolbarAttachedToolbarHorizontalClass}
    >
      <ToggleButtonGroup
        aria-label="Bare atom step-edge overlay"
        selectionMode="multiple"
        className={plotToolbarAttachedToggleGroupHorizontalClass}
        selectedKeys={showBareAtomOverlay ? ["bare-atom"] : []}
        onSelectionChange={(keys) => {
          onShowBareAtomOverlayChange(keys.has("bare-atom"));
        }}
      >
        <PlotToolbarRichHint
          title="Bare atom step edge"
          description="Overlay tabulated bare-atom reference on the compare energy grid."
          whenDisabledDescription={disabledReason}
          placement="bottom"
          disabled={disabled}
        >
          <ToggleButton
            isIconOnly
            aria-label={
              disabled
                ? "Bare atom overlay unavailable for the current selection"
                : "Bare atom step-edge reference"
            }
            id="bare-atom"
            isDisabled={disabled}
            className={plotToolbarGlyphToggleGroupItemHorizontalClass}
          >
            <BareAtomStepEdgeIcon className="h-6 w-6" aria-hidden />
          </ToggleButton>
        </PlotToolbarRichHint>
      </ToggleButtonGroup>
    </Toolbar>
  );
}
