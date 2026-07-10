"use client";

import {
  SampleMetadataInsetGroup,
  SampleMetadataSectionCaption,
} from "~/components/nexafs/sample-metadata-chrome-shared";
import {
  SampleVendorField,
  type SampleVendorFieldOption,
  type SampleVendorFieldsPatch,
} from "./sample-vendor-field";

export type SampleVendorSectionProps = {
  vendors: readonly SampleVendorFieldOption[];
  selectedVendorId: string;
  newVendorName: string;
  newVendorUrl: string;
  onSelectedVendorIdChange: (vendorId: string) => void;
  onNewVendorNameChange: (name: string) => void;
  onNewVendorUrlChange: (url: string) => void;
  onVendorFieldsChange?: (patch: SampleVendorFieldsPatch) => void;
  isLoadingVendors?: boolean;
  allowCreate?: boolean;
};

/**
 * Renders the vendor combobox (and optional website row) inside the inset vendor group.
 */
export function SampleVendorSection({
  vendors,
  selectedVendorId,
  newVendorName,
  newVendorUrl,
  onSelectedVendorIdChange,
  onNewVendorNameChange,
  onNewVendorUrlChange,
  onVendorFieldsChange,
  isLoadingVendors = false,
  allowCreate = true,
}: SampleVendorSectionProps) {
  return (
    <section aria-labelledby="sample-vendor-fields">
      <SampleMetadataSectionCaption
        title="Vendor"
        hint="Search for an existing vendor or type a new name."
      />
      <SampleMetadataInsetGroup ariaLabel="Sample vendor">
        <SampleVendorField
          layout="inset"
          allowCreate={allowCreate}
          vendors={vendors}
          selectedVendorId={selectedVendorId}
          newVendorName={newVendorName}
          newVendorUrl={newVendorUrl}
          onSelectedVendorIdChange={onSelectedVendorIdChange}
          onNewVendorNameChange={onNewVendorNameChange}
          onNewVendorUrlChange={onNewVendorUrlChange}
          onVendorFieldsChange={onVendorFieldsChange}
          isLoadingVendors={isLoadingVendors}
        />
      </SampleMetadataInsetGroup>
    </section>
  );
}
