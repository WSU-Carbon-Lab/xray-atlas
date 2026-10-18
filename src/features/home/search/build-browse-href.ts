import type { ExperimentType } from "~/prisma/browser";
import {
  emptyFacetSelection,
  emptyNexafsCatalogFilters,
  writeFacetParams,
  writeNexafsCatalogFilterParams,
} from "~/components/browse/unified-search/url-state";

/** `/browse/nexafs` URL for a home search; trims query and omits empty keys. */
export function buildBrowseHref(input: {
  query: string;
  edgeIds: readonly string[];
  experimentType: ExperimentType | undefined;
}): string {
  const sp = new URLSearchParams();
  const q = input.query.trim();
  if (q) sp.set("q", q);
  writeFacetParams(sp, { ...emptyFacetSelection(), edge: [...input.edgeIds] });
  writeNexafsCatalogFilterParams(sp, {
    ...emptyNexafsCatalogFilters(),
    experimentType: input.experimentType,
  });
  const s = sp.toString();
  return s ? `/browse/nexafs?${s}` : "/browse/nexafs";
}
