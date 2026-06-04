import type { FacetData, FacetField, FacetItem } from "./types";

export interface PopularitySection {
  field: FacetField;
  items: FacetItem[];
}

export interface PopularitySectionLimits {
  edge?: number;
  mol?: number;
  instrument?: number;
  contributor?: number;
}

const DEFAULT_LIMITS: Required<PopularitySectionLimits> = {
  edge: 8,
  mol: 6,
  instrument: 5,
  contributor: 5,
};

/**
 * Builds popularity panel sections from unfiltered `experiments.facetCounts` data.
 *
 * Omits empty dimensions and caps each list so home and browse dropdowns stay compact.
 */
export function buildPopularitySections(
  facetCounts: FacetData | null | undefined,
  limits: PopularitySectionLimits = {},
): PopularitySection[] {
  if (!facetCounts) return [];
  const cap = { ...DEFAULT_LIMITS, ...limits };
  const sections: PopularitySection[] = [];
  if (facetCounts.edges.length > 0) {
    sections.push({
      field: "edge",
      items: facetCounts.edges.slice(0, cap.edge),
    });
  }
  if (facetCounts.molecules.length > 0) {
    sections.push({
      field: "mol",
      items: facetCounts.molecules.slice(0, cap.mol),
    });
  }
  if (facetCounts.instruments.length > 0) {
    sections.push({
      field: "instrument",
      items: facetCounts.instruments.slice(0, cap.instrument),
    });
  }
  if (facetCounts.contributors.length > 0) {
    sections.push({
      field: "contributor",
      items: facetCounts.contributors.slice(0, cap.contributor),
    });
  }
  return sections;
}
