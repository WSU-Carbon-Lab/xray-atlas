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
import type { NexafsCreateCalibrationDialogProps } from "./types";

export function NexafsCreateCalibrationDialog({
  isOpen,
  onClose,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  onCreate,
  isCreating,
}: NexafsCreateCalibrationDialogProps) {
  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Calibration Method"
    >
      <div className="space-y-4">
        <div>
          <Label className="text-foreground mb-2 flex items-center gap-1 text-sm font-medium">
            Name
            <span className="text-red-500">*</span>
            <FieldTooltip description="The name of the calibration method" />
          </Label>
          <Input
            name="calibrationName"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g., Carbon K-edge calibration"
            required
            className="form-input"
            aria-label="Calibration method name"
          />
        </div>
        <div>
          <Label className="text-foreground mb-2 flex items-center gap-1 text-sm font-medium">
            Description
            <FieldTooltip description="Additional details about the calibration method" />
          </Label>
          <textarea
            name="calibrationDescription"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Optional description of the calibration method"
            rows={3}
            className="form-input min-h-[80px] resize-y"
            aria-label="Calibration method description"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Tooltip delay={0}>
            <Button type="button" variant="outline" onClick={onClose}>
              <XMarkIcon className="h-4 w-4" />
              <span>Cancel</span>
            </Button>
            <Tooltip.Content className="tooltip-content-panel">
              Cancel creating a new calibration method
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
                  <span>Create Method</span>
                </>
              )}
            </Button>
            <Tooltip.Content className="tooltip-content-panel">
              Create a new calibration method with the specified name and
              description
            </Tooltip.Content>
          </Tooltip>
        </div>
      </div>
    </SimpleDialog>
  );
}
