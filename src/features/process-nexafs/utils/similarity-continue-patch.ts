/**
 * Applies field choices from the similarity compare modal onto a contribute
 * upload draft before `createWithSpectrum`.
 */

import type { ProcessMethod } from "~/prisma/browser";
import type {
  DatasetState,
  ExperimentTypeOption,
} from "~/features/process-nexafs/types";
import type { DatasetAttributionEntry } from "~/lib/nexafs-attribution";

/** Patch applied to the upload dataset when the contributor continues submit. */
export type SimilarityContinuePatch = {
  edgeId?: string;
  instrumentId?: string;
  experimentType?: ExperimentTypeOption;
  attributions?: DatasetAttributionEntry[];
  substrate?: string;
  processMethod?: ProcessMethod | null;
  thickness?: number | null;
  solvent?: string;
  patterningLayer?: string;
};

/**
 * Merges a similarity-modal field patch into a contribute dataset draft.
 *
 * @param dataset - Upload dataset about to submit.
 * @param patch - Field choices from the compare modal.
 * @returns New dataset with selected Existing values applied.
 */
export function applySimilarityContinuePatch(
  dataset: DatasetState,
  patch: SimilarityContinuePatch,
): DatasetState {
  const nextSample = { ...dataset.sampleInfo };
  if (patch.substrate !== undefined) {
    nextSample.substrate = patch.substrate;
  }
  if (patch.processMethod !== undefined) {
    nextSample.processMethod = patch.processMethod;
  }
  if (patch.thickness !== undefined) {
    nextSample.thickness = patch.thickness;
  }
  if (patch.solvent !== undefined) {
    nextSample.solvent = patch.solvent;
  }
  if (patch.patterningLayer !== undefined) {
    nextSample.patterningLayer = patch.patterningLayer;
  }

  return {
    ...dataset,
    ...(patch.edgeId ? { edgeId: patch.edgeId } : {}),
    ...(patch.instrumentId ? { instrumentId: patch.instrumentId } : {}),
    ...(patch.experimentType ? { experimentType: patch.experimentType } : {}),
    ...(patch.attributions ? { attributions: patch.attributions } : {}),
    sampleInfo: nextSample,
  };
}
