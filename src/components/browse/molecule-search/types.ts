/**
 * Molecule browse unified search — facet contracts.
 *
 * Tags, dataset presence, and identifier facets combine with AND semantics
 * on the server. Material type is UI-only until schema support ships.
 */

export type MoleculeFacetField =
  | "tag"
  | "hasData"
  | "hasCas"
  | "hasPubchem";

export interface MoleculeFacetToken {
  field: MoleculeFacetField;
  id: string;
  label: string;
}

export interface MoleculeFacetSelection {
  tagIds: string[];
  hasExperimentData: boolean;
  hasCas: boolean;
  hasPubchem: boolean;
}

export interface MoleculeTagFacetItem {
  id: string;
  label: string;
  count: number;
  color: string | null;
}
