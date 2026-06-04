/**
 * Unified NEXAFS search — shared type contracts.
 *
 * Owns `FacetField`, `FacetToken`, `FacetSelection`, `FacetItem`, and
 * `FacetData` used across the URL codec, selection hook, and search UI.
 * Institution is excluded from v1 scope.
 */

/** The four searchable facet dimensions for the NEXAFS catalog. */
export type FacetField = "edge" | "mol" | "instrument" | "contributor";

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
