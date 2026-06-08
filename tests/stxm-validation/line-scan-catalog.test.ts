import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  filterCatalogLineScans,
  isCatalogLineScanStripEntry,
  partitionCatalogEntries,
} from "~/features/dashboard/lib/line-scan-catalog";
import type { StxmCatalogEntry } from "~/lib/stxm";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function catalogRow(
  overrides: Partial<StxmCatalogEntry> & Pick<StxmCatalogEntry, "relativePath">,
): StxmCatalogEntry {
  return {
    basename: overrides.basename ?? overrides.relativePath,
    scanType: overrides.scanType ?? "NEXAFS LINE SCAN",
    category: overrides.category ?? "line_scan",
    isNexafsLineScan: overrides.isNexafsLineScan ?? true,
    paxisCount: null,
    qaxisCount: null,
    energyMinEv: null,
    energyMaxEv: null,
    thumbnailDataUrl: null,
    ...overrides,
  };
}

describe("partitionCatalogEntries", () => {
  it("splits placeholder and parsed rows", () => {
    const placeholder = catalogRow({
      relativePath: "a.hdr",
      enrichmentStatus: "placeholder",
      category: "other",
    });
    const parsed = catalogRow({
      relativePath: "b.hdr",
      enrichmentStatus: "parsed",
    });
    const { placeholders, parsed: parsedRows } = partitionCatalogEntries([
      placeholder,
      parsed,
    ]);
    expect(placeholders).toHaveLength(1);
    expect(parsedRows).toHaveLength(1);
  });
});

describe("filterCatalogLineScans", () => {
  it("returns all rows during placeholder-only discovery", () => {
    const rows = [
      catalogRow({ relativePath: "a.hdr", enrichmentStatus: "placeholder" }),
      catalogRow({ relativePath: "b.hdr", enrichmentStatus: "placeholder" }),
    ];
    expect(filterCatalogLineScans(rows)).toEqual(rows);
  });

  it("returns parsed line scans without image scans", () => {
    const line = catalogRow({ relativePath: "line.hdr", category: "line_scan" });
    const image = catalogRow({
      relativePath: "image.hdr",
      category: "image_scan",
      isNexafsLineScan: false,
      scanType: "IMAGE SCAN",
    });
    const filtered = filterCatalogLineScans([line, image]);
    expect(filtered.map((row) => row.relativePath)).toEqual(["line.hdr"]);
  });

  it("includes pending placeholders alongside parsed line scans during refresh", () => {
    const line = catalogRow({
      relativePath: "line.hdr",
      category: "line_scan",
      enrichmentStatus: "parsed",
    });
    const newPlaceholder = catalogRow({
      relativePath: "new-line.hdr",
      enrichmentStatus: "placeholder",
      category: "other",
    });
    const filtered = filterCatalogLineScans([line, newPlaceholder]);
    expect(filtered.map((row) => row.relativePath)).toEqual([
      "new-line.hdr",
      "line.hdr",
    ]);
  });
});

describe("isCatalogLineScanStripEntry", () => {
  it("accepts placeholders and line scans", () => {
    expect(
      isCatalogLineScanStripEntry(
        catalogRow({ relativePath: "p.hdr", enrichmentStatus: "placeholder" }),
      ),
    ).toBe(true);
    expect(
      isCatalogLineScanStripEntry(
        catalogRow({ relativePath: "l.hdr", category: "line_scan" }),
      ),
    ).toBe(true);
    expect(
      isCatalogLineScanStripEntry(
        catalogRow({
          relativePath: "i.hdr",
          category: "image_scan",
          isNexafsLineScan: false,
        }),
      ),
    ).toBe(false);
  });
});
