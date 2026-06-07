import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { hasActivePlotViewerCatalogFilter } from "./plot-viewer-catalog-filter";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const emptyFacets = {
  mol: [] as string[],
  edge: [] as string[],
  instrument: [] as string[],
  facility: [] as string[],
};

describe("hasActivePlotViewerCatalogFilter", () => {
  it("is false with no search text and no facets", () => {
    expect(hasActivePlotViewerCatalogFilter("", emptyFacets)).toBe(false);
  });

  it("is true when debounced search query is non-empty", () => {
    expect(hasActivePlotViewerCatalogFilter("carbon", emptyFacets)).toBe(true);
  });

  it("is true when any facet array is non-empty", () => {
    expect(
      hasActivePlotViewerCatalogFilter("", {
        ...emptyFacets,
        mol: ["uuid"],
      }),
    ).toBe(true);
    expect(
      hasActivePlotViewerCatalogFilter("", {
        ...emptyFacets,
        edge: ["uuid"],
      }),
    ).toBe(true);
    expect(
      hasActivePlotViewerCatalogFilter("", {
        ...emptyFacets,
        instrument: ["id"],
      }),
    ).toBe(true);
    expect(
      hasActivePlotViewerCatalogFilter("", {
        ...emptyFacets,
        facility: ["als"],
      }),
    ).toBe(true);
  });
});
