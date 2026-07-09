"use client";

import { useCallback } from "react";
import type { Key } from "@heroui/react";
import { ComboBox, Input, InputGroup, Label, ListBox, TextField } from "@heroui/react";
import { FieldTooltip } from "~/components/ui/field-tooltip";
import { SampleFormInsetTextRow } from "./sample-form-inset-field";
import {
  sampleFormLabelClass,
  sampleFormOptionalSuffix,
  sampleFormSelectPopoverClass,
  sampleFormSelectListBoxClass,
  sampleFormSelectListBoxItemClass,
  sampleFormSelectInsetTriggerClass,
  sampleFormSelectTriggerClass,
} from "./sample-form-select";

import {
  sampleFormInsetControlClass,
  sampleFormInsetLabelClass,
  sampleFormInsetRowClass,
  type SampleFormLayout,
} from "./sample-form-layout";

export type SampleVendorFieldOption = {
  id: string;
  name: string;
};

export type SampleVendorFieldsPatch = {
  selectedVendorId?: string;
  newVendorName?: string;
  newVendorUrl?: string;
};

export type SampleVendorFieldProps = {
  vendors: readonly SampleVendorFieldOption[];
  selectedVendorId: string;
  newVendorName: string;
  newVendorUrl: string;
  onSelectedVendorIdChange: (vendorId: string) => void;
  onNewVendorNameChange: (name: string) => void;
  onNewVendorUrlChange: (url: string) => void;
  /** Applies multiple vendor field updates in one commit (avoids stale batched overwrites). */
  onVendorFieldsChange?: (patch: SampleVendorFieldsPatch) => void;
  isLoadingVendors?: boolean;
  layout?: SampleFormLayout;
  /** When false, typed values must match an existing vendor (no create flow). */
  allowCreate?: boolean;
};

/**
 * Renders a vendor picker that searches existing vendors or accepts a new vendor name when allowed.
 */
export function SampleVendorField({
  vendors,
  selectedVendorId,
  newVendorName,
  newVendorUrl,
  onSelectedVendorIdChange,
  onNewVendorNameChange,
  onNewVendorUrlChange,
  onVendorFieldsChange,
  isLoadingVendors = false,
  layout = "stacked",
  allowCreate = true,
}: SampleVendorFieldProps) {
  const selectedVendor = vendors.find((vendor) => vendor.id === selectedVendorId);
  const inputValue = selectedVendor?.name ?? newVendorName;
  const selectedKey = selectedVendorId.length > 0 ? selectedVendorId : null;

  const isCreatingNew =
    allowCreate && !selectedVendorId && newVendorName.trim().length > 0;

  const applyVendorFields = useCallback(
    (patch: SampleVendorFieldsPatch) => {
      if (onVendorFieldsChange) {
        onVendorFieldsChange(patch);
        return;
      }
      if (patch.selectedVendorId !== undefined) {
        onSelectedVendorIdChange(patch.selectedVendorId);
      }
      if (patch.newVendorName !== undefined) {
        onNewVendorNameChange(patch.newVendorName);
      }
      if (patch.newVendorUrl !== undefined) {
        onNewVendorUrlChange(patch.newVendorUrl);
      }
    },
    [
      onVendorFieldsChange,
      onNewVendorNameChange,
      onNewVendorUrlChange,
      onSelectedVendorIdChange,
    ],
  );

  const comboControl = (
    <ComboBox
      fullWidth
      allowsCustomValue={allowCreate}
      allowsEmptyCollection
      aria-label="Vendor name"
      isDisabled={isLoadingVendors}
      selectedKey={selectedKey}
      inputValue={inputValue}
      onInputChange={(value) => {
        if (!allowCreate) {
          const matched = vendors.find(
            (vendor) => vendor.name.toLowerCase() === value.trim().toLowerCase(),
          );
          if (matched) {
            applyVendorFields({
              selectedVendorId: matched.id,
              newVendorName: "",
            });
            return;
          }
          applyVendorFields({
            selectedVendorId: "",
            newVendorName: value,
          });
          return;
        }
        applyVendorFields({
          selectedVendorId: "",
          newVendorName: value,
        });
      }}
      onSelectionChange={(key: Key | null) => {
        if (key == null) {
          return;
        }
        const vendorId = String(key);
        const vendor = vendors.find((entry) => entry.id === vendorId);
        if (!vendor) {
          return;
        }
        applyVendorFields({
          selectedVendorId: vendor.id,
          newVendorName: "",
        });
      }}
      items={[...vendors]}
      className={layout === "inset" ? sampleFormInsetControlClass : "min-w-0 w-full"}
    >
      {layout === "stacked" ? (
        <Label className={sampleFormLabelClass}>
          Vendor
          <FieldTooltip description="Search for an existing vendor or type a new name" />
          {sampleFormOptionalSuffix}
        </Label>
      ) : null}
      <ComboBox.InputGroup
        className={
          layout === "inset"
            ? sampleFormSelectInsetTriggerClass
            : sampleFormSelectTriggerClass
        }
      >
        <Input
          placeholder={
            isLoadingVendors
              ? "Loading vendors..."
              : allowCreate
                ? "Search or type a vendor name"
                : "Search vendors"
          }
          autoComplete="off"
        />
        <ComboBox.Trigger />
      </ComboBox.InputGroup>
      <ComboBox.Popover className={sampleFormSelectPopoverClass}>
        <ListBox
          aria-label="Vendor options"
          items={[...vendors]}
          className={sampleFormSelectListBoxClass}
        >
          {(vendor: SampleVendorFieldOption) => (
            <ListBox.Item
              id={vendor.id}
              key={vendor.id}
              textValue={vendor.name}
              className={sampleFormSelectListBoxItemClass}
            >
              {vendor.name}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          )}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  );

  const websiteField =
    layout === "inset" ? (
      <SampleFormInsetTextRow
        name="newVendorUrl"
        label="Vendor website"
        optional
        value={newVendorUrl}
        onChange={onNewVendorUrlChange}
        placeholder="https://example.com"
      />
    ) : (
      <TextField
        name="newVendorUrl"
        value={newVendorUrl}
        onChange={onNewVendorUrlChange}
        variant="secondary"
        fullWidth
      >
        <Label className={sampleFormLabelClass}>
          Vendor website
          {sampleFormOptionalSuffix}
        </Label>
        <InputGroup variant="secondary" fullWidth>
          <InputGroup.Input placeholder="https://example.com" />
        </InputGroup>
      </TextField>
    );

  if (layout === "inset") {
    return (
      <>
        <div className={sampleFormInsetRowClass}>
          <Label className={sampleFormInsetLabelClass}>
            Vendor
            <FieldTooltip description="Search for an existing vendor or type a new name" />
            {sampleFormOptionalSuffix}
          </Label>
          {comboControl}
        </div>
        {isCreatingNew ? websiteField : null}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {comboControl}
      {isCreatingNew ? websiteField : null}
    </div>
  );
}
