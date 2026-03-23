"use client";

import {
  ArrowPathIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Label, Input, Tooltip } from "@heroui/react";
import { DefaultButton as Button } from "~/components/ui/button";
import { FieldTooltip } from "~/components/ui/field-tooltip";
import { SimpleDialog } from "~/components/ui/dialog";
import type { NexafsCreateEdgeDialogProps } from "./types";

export function NexafsCreateEdgeDialog({
  isOpen,
  onClose,
  targetAtom,
  onTargetAtomChange,
  coreState,
  onCoreStateChange,
  onCreate,
  isCreating,
}: NexafsCreateEdgeDialogProps) {
  return (
    <SimpleDialog isOpen={isOpen} onClose={onClose} title="Create New Edge">
      <div className="space-y-4">
        <div>
          <Label className="text-foreground mb-2 flex items-center gap-1 text-sm font-medium">
            Target Atom
            <span className="text-red-500">*</span>
            <FieldTooltip description="The target atom for the absorption edge (e.g., C for carbon K-edge)" />
          </Label>
          <Input
            name="targetAtom"
            value={targetAtom}
            onChange={(e) => onTargetAtomChange(e.target.value)}
            placeholder="e.g., C, N, O"
            required
            className="form-input"
            aria-label="Target atom"
          />
        </div>
        <div>
          <Label className="text-foreground mb-2 flex items-center gap-1 text-sm font-medium">
            Core State
            <span className="text-red-500">*</span>
            <FieldTooltip description="The core state of the electron (e.g., K for K-edge)" />
          </Label>
          <Input
            name="coreState"
            value={coreState}
            onChange={(e) => onCoreStateChange(e.target.value)}
            placeholder="e.g., K, L1, L2, L3"
            required
            className="form-input"
            aria-label="Core state"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Tooltip delay={0}>
            <Button type="button" variant="outline" onClick={onClose}>
              <XMarkIcon className="h-4 w-4" />
              <span>Cancel</span>
            </Button>
            <Tooltip.Content className="tooltip-content-panel">
              Cancel creating a new edge
            </Tooltip.Content>
          </Tooltip>
          <Tooltip delay={0}>
            <Button
              type="button"
              variant="primary"
              onClick={onCreate}
              isDisabled={isCreating}
            >
              {isCreating ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <PlusIcon className="h-4 w-4" />
                  <span>Create Edge</span>
                </>
              )}
            </Button>
            <Tooltip.Content className="tooltip-content-panel">
              Create a new absorption edge with the specified target atom and
              core state
            </Tooltip.Content>
          </Tooltip>
        </div>
      </div>
    </SimpleDialog>
  );
}
