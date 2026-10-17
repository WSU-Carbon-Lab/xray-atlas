/**
 * Suspended default NEXAFS dataset list for `/molecules/[id]`.
 *
 * Awaits the 60 second public browse cache for one molecule and renders the
 * embedded client list with that seed. The page owns filtered URLs and
 * `nexafsExperiment`, which skip this section. Does not call `auth()`.
 */

import type { ReactElement } from "react";
import {
  MoleculeNexafsBrowse,
  MoleculeNexafsBrowseGate,
} from "./molecule-detail-page-client";
import { loadDefaultMoleculeNexafsBrowseList } from "./molecule-detail-request";

/**
 * Loads the default embedded NEXAFS page and renders it.
 *
 * Calls `loadDefaultMoleculeNexafsBrowseList` for `moleculeId` (quality sort,
 * limit 12, offset 0). A cache miss renders `MoleculeNexafsBrowseGate` so the
 * client query fills the list. Does not read search params.
 *
 * @param props.moleculeId Molecule UUID locked by the embedded browse section.
 * @returns The seeded browse list, or the hydration gate when the cache read fails.
 */
export async function MoleculeNexafsDatasetSection({
  moleculeId,
}: {
  moleculeId: string;
}): Promise<ReactElement> {
  const initialBrowseList =
    await loadDefaultMoleculeNexafsBrowseList(moleculeId);
  if (!initialBrowseList) {
    return <MoleculeNexafsBrowseGate />;
  }
  return <MoleculeNexafsBrowse initialBrowseList={initialBrowseList} />;
}
