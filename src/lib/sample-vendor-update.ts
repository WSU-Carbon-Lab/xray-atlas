import { findMatchingVendorId } from "~/lib/nexafsVendorLabel";

export type SampleVendorDraft = {
  selectedVendorId: string;
  newVendorName: string;
  newVendorUrl: string;
};

export type SampleVendorLookup = {
  id: string;
  name: string;
};

export type SampleVendorUpdatePayload =
  | { vendorid: string }
  | { vendorid: null; vendorName: string; vendorUrl?: string }
  | { vendorid: null };

/**
 * Maps vendor picker state to `samples.update` vendor fields, reusing alias matching before create.
 */
export function resolveSampleVendorUpdatePayload(
  draft: SampleVendorDraft,
  vendors: readonly SampleVendorLookup[],
): SampleVendorUpdatePayload {
  if (draft.selectedVendorId) {
    return { vendorid: draft.selectedVendorId };
  }

  const trimmedName = draft.newVendorName.trim();
  if (!trimmedName) {
    return { vendorid: null };
  }

  const matchedVendorId = findMatchingVendorId(trimmedName, vendors);
  if (matchedVendorId) {
    return { vendorid: matchedVendorId };
  }

  return {
    vendorid: null,
    vendorName: trimmedName,
    vendorUrl: draft.newVendorUrl.trim() || undefined,
  };
}
