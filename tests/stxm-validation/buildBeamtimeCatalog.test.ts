import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  insertCatalogEntrySorted,
  mergeCatalogEntries,
} from "~/features/dashboard/lib/buildBeamtimeCatalog";
import type { StxmCatalogEntry } from "~/lib/stxm";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function catalogEntry(relativePath: string): StxmCatalogEntry {
  const basename = relativePath.split("/").pop() ?? relativePath;
  return {
    basename,
    relativePath,
    scanType: "NEXAFS Line Scan",
    category: "line_scan",
    isNexafsLineScan: true,
    paxisCount: 10,
    qaxisCount: 1,
    energyMinEv: 280,
    energyMaxEv: 320,
    thumbnailDataUrl: null,
  };
}

describe("insertCatalogEntrySorted", () => {
  it("inserts rows in relativePath order", () => {
    const entries: StxmCatalogEntry[] = [];
    insertCatalogEntrySorted(entries, catalogEntry("b/scan.hdr"));
    insertCatalogEntrySorted(entries, catalogEntry("a/scan.hdr"));
    insertCatalogEntrySorted(entries, catalogEntry("c/scan.hdr"));
    expect(entries.map((row) => row.relativePath)).toEqual([
      "a/scan.hdr",
      "b/scan.hdr",
      "c/scan.hdr",
    ]);
  });

  it("skips duplicate relativePath rows", () => {
    const entries: StxmCatalogEntry[] = [];
    expect(insertCatalogEntrySorted(entries, catalogEntry("a/scan.hdr"))).toBe(
      true,
    );
    expect(insertCatalogEntrySorted(entries, catalogEntry("a/scan.hdr"))).toBe(
      false,
    );
    expect(entries).toHaveLength(1);
  });
});

describe("mergeCatalogEntries", () => {
  it("merges additions without mutating the source list", () => {
    const base = [catalogEntry("a/scan.hdr")];
    const merged = mergeCatalogEntries(base, [
      catalogEntry("c/scan.hdr"),
      catalogEntry("b/scan.hdr"),
    ]);
    expect(base.map((row) => row.relativePath)).toEqual(["a/scan.hdr"]);
    expect(merged.map((row) => row.relativePath)).toEqual([
      "a/scan.hdr",
      "b/scan.hdr",
      "c/scan.hdr",
    ]);
  });
});
