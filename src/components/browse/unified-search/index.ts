/**
 * Unified NEXAFS search bar — public surface.
 *
 * Re-exports the `UnifiedSearchBar` component, `useFacetSelection` hook,
 * `PeriodicEdgeModal` component, URL codec utilities, and shared type
 * contracts. Consumers import from this barrel rather than individual files.
 */

export { UnifiedSearchBar } from "./unified-search-bar";
export type { UnifiedSearchBarProps } from "./unified-search-bar";

export { PeriodicEdgeModal } from "./periodic-edge-modal";
export type { PeriodicEdgeModalProps, EdgeOption } from "./periodic-edge-modal";

export { useFacetSelection } from "./use-facet-selection";
export type {
  UseFacetSelectionOptions,
  UseFacetSelectionReturn,
} from "./use-facet-selection";

export { readFacetParams, writeFacetParams, emptyFacetSelection } from "./url-state";

export type { FacetField, FacetToken, FacetSelection, FacetItem, FacetData } from "./types";
