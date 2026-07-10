import type { ProcessMethod } from "~/prisma/browser";
import type { SampleVendorDraft } from "~/lib/sample-vendor-update";

/** Editable core sample metadata bound to sample information form controls. */
export type SampleCoreDraft = SampleVendorDraft & {
  processMethod: ProcessMethod | null;
  substrate: string;
  patterningLayer: string;
  solvent: string;
  thickness: number | null;
  molecularWeight: number | null;
};

type PersistedSampleCoreRow = {
  processmethod: ProcessMethod | null;
  substrate: string | null;
  patterninglayer: string | null;
  solvent: string | null;
  thickness: number | null;
  molecularweight: number | null;
  vendorid: string | null;
};

/**
 * Builds an edit draft from persisted sample columns; vendor create fields start empty.
 */
export function sampleCoreDraftFromPersistedRow(
  sample: PersistedSampleCoreRow,
): SampleCoreDraft {
  return {
    processMethod: sample.processmethod,
    substrate: sample.substrate ?? "",
    patterningLayer: sample.patterninglayer ?? "",
    solvent: sample.solvent ?? "",
    thickness: sample.thickness,
    molecularWeight: sample.molecularweight,
    selectedVendorId: sample.vendorid ?? "",
    newVendorName: "",
    newVendorUrl: "",
  };
}
