/**
 * Unified NEXAFS search — shared type contracts.
 *
 * Owns facet dimensions, catalog filter state (acquisition, verification),
 * tokens, and `FacetData` used across the URL codec, selection hook, and
 * search UI. Institution is excluded from v1 scope.
 */

import type { ExperimentType } from "~/prisma/browser";
import type { VerificationSource } from "../nexafs-browse-experiment-utils";

/** The four searchable facet dimensions for the NEXAFS catalog. */
export type FacetField = "edge" | "mol" | "instrument" | "contributor";

/** Non-facet catalog filters surfaced as tokens in the unified search bar. */
export type CatalogFilterField = FacetField | "acquisition" | "verification";

/**
 * Acquisition and verification constraints for NEXAFS browse list/search.
 *
 * @param experimentType - Prisma `ExperimentType` when filtered; omitted when any mode.
 * @param verifiedOnly - When true, only datasets with Atlas or publication verification.
 * @param verificationSource - Which verification tier to require when `verifiedOnly` is true.
 */
export interface NexafsCatalogFilters {
  experimentType?: ExperimentType;
  verifiedOnly: boolean;
  verificationSource: VerificationSource;
}

/**
 * One active selection token rendered as a dismissible chip in the search bar.
 *
 * @param field - Facet dimension this token belongs to.
 * @param id - UUID or ORCID iD used as the API filter value.
 * @param label - Human-readable display string, e.g. `"C K"` or `"Benzene"`.
 */
export interface FacetToken {
  field: FacetField;
  id: string;
  label: string;
}

/**
 * One dismissible chip in the unified search bar (facet or catalog filter).
 *
 * @param field - Facet dimension, `acquisition`, or `verification`.
 * @param id - UUID/ORCID for facets; experiment type enum for acquisition;
 *   verification source key for verification.
 * @param label - Human-readable chip text.
 */
export interface CatalogToken {
  field: CatalogFilterField;
  id: string;
  label: string;
}

/**
 * Full multi-select state for all four facets.
 *
 * Each value is an ordered list of selected UUIDs or ORCID iDs.
 * An empty array means no filter is applied for that field.
 * Same-field values are OR-combined; cross-field values are AND-combined.
 */
export type FacetSelection = Record<FacetField, string[]>;

/**
 * One facet value with its experiment count, used for popularity panels and
 * typeahead results.
 *
 * @param id - UUID or ORCID key passed to the API filter.
 * @param label - Display string shown in the dropdown.
 * @param count - Number of experiments associated with this value.
 */
export interface FacetItem {
  id: string;
  label: string;
  count: number;
}

/**
 * Grouped facet data returned by `experiments.facetCounts` and
 * `experiments.searchEntities`.
 *
 * All arrays are ordered by `count` descending unless the procedure notes
 * otherwise.
 */
export interface FacetData {
  edges: FacetItem[];
  instruments: FacetItem[];
  molecules: FacetItem[];
  contributors: FacetItem[];
}
