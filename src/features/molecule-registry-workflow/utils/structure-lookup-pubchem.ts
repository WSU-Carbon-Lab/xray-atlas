import type { StructureLookupComponent } from "~/features/molecule-sketcher/utils/structure-lookup-components";
import { structureLookupComponentsFromSmiles } from "~/features/molecule-sketcher/utils/structure-lookup-components";
import type { PubChemCandidateSummary } from "~/lib/pubchem-compound";

/**
 * Options passed with structure-initiated SMILES lookup.
 */
export interface StructureLookupOptions {
  /** Registry-persisted SMILES (may include abbreviations or repeat-unit form). */
  registrySmiles?: string;
  /** Explicit SMILES components; when omitted, derived from the lookup SMILES. */
  components?: StructureLookupComponent[];
}

type PubChemCandidatesFetcher = (input: {
  query: string;
  limit: number;
  type: "smiles";
}) => Promise<{ candidates: PubChemCandidateSummary[] }>;

/**
 * Queries PubChem for each structure component and merges unique CIDs.
 *
 * Searches the full expanded structure first, then repeat-unit, end-group, and
 * block fragments. Never queries BigSMILES notation strings.
 *
 * @param fetchCandidates - tRPC `searchPubchemCandidates` fetcher.
 * @param lookupSmiles - Primary expanded SMILES from the sketcher.
 * @param components - Optional explicit fragments; defaults to parsing `lookupSmiles`.
 * @param limitPerComponent - Maximum PubChem rows per component query.
 * @returns Deduped PubChem candidate summaries ordered by first hit.
 */
export async function mergePubChemCandidatesForComponents(
  fetchCandidates: PubChemCandidatesFetcher,
  lookupSmiles: string,
  components?: StructureLookupComponent[],
  limitPerComponent = 10,
): Promise<PubChemCandidateSummary[]> {
  const resolved =
    components !== undefined && components.length > 0
      ? components
      : structureLookupComponentsFromSmiles(lookupSmiles);

  if (resolved.length === 0) {
    const response = await fetchCandidates({
      query: lookupSmiles,
      limit: limitPerComponent,
      type: "smiles",
    });
    return response.candidates;
  }

  const byCid = new Map<string, PubChemCandidateSummary>();
  for (const component of resolved) {
    const response = await fetchCandidates({
      query: component.smiles,
      limit: limitPerComponent,
      type: "smiles",
    });
    for (const candidate of response.candidates) {
      if (!byCid.has(candidate.cid)) {
        byCid.set(candidate.cid, candidate);
      }
    }
  }
  return [...byCid.values()];
}
