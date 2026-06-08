import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  buildStxmCatalogCheckpoint,
  catalogEntryFromCheckpointEntry,
  catalogEntryToCheckpointEntry,
  mergeParsedCatalogEntries,
  parseStxmCatalogCheckpoint,
  reconcileCatalogWithDiskListing,
  serializeStxmCatalogCheckpoint,
  STXM_CATALOG_CHECKPOINT_VERSION,
} from "~/features/dashboard/lib/stxm-catalog-checkpoint";
import {
  buildPlaceholderCatalogEntry,
  catalogEntryEnrichmentStatus,
  type StxmCatalogEntry,
} from "~/lib/stxm";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function parsedEntry(relativePath: string): StxmCatalogEntry {
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
    enrichmentStatus: "parsed",
  };
}

describe("parseStxmCatalogCheckpoint", () => {
  it("round-trips a valid checkpoint document", () => {
    const checkpoint = buildStxmCatalogCheckpoint("2026-03(March)", [
      parsedEntry("line_a.hdr"),
    ]);
    const parsed = parseStxmCatalogCheckpoint(
      serializeStxmCatalogCheckpoint(checkpoint),
    );
    expect(parsed?.version).toBe(STXM_CATALOG_CHECKPOINT_VERSION);
    expect(parsed?.experimentName).toBe("2026-03(March)");
    expect(parsed?.entries).toHaveLength(1);
    expect(parsed?.entries[0]?.relativePath).toBe("line_a.hdr");
  });

  it("rejects unsupported schema versions", () => {
    const parsed = parseStxmCatalogCheckpoint(
      JSON.stringify({
        version: 99,
        generatedAt: new Date().toISOString(),
        experimentName: "x",
        entries: [],
      }),
    );
    expect(parsed).toBe(null);
  });
});

describe("reconcileCatalogWithDiskListing", () => {
  it("hydrates cached rows and adds placeholders for new paths", () => {
    const checkpointEntry = catalogEntryToCheckpointEntry(
      parsedEntry("cached.hdr"),
    );
    const rows = reconcileCatalogWithDiskListing(
      [
        { name: "cached.hdr", relativePath: "cached.hdr", handle: {} as never },
        { name: "new.hdr", relativePath: "folder/new.hdr", handle: {} as never },
      ],
      [checkpointEntry],
    );
    expect(rows).toHaveLength(2);
    expect(catalogEntryEnrichmentStatus(rows[0]!)).toBe("parsed");
    expect(catalogEntryEnrichmentStatus(rows[1]!)).toBe("placeholder");
  });
});

describe("catalogEntryFromCheckpointEntry", () => {
  it("marks hydrated rows as parsed without thumbnails", () => {
    const row = catalogEntryFromCheckpointEntry(
      catalogEntryToCheckpointEntry(parsedEntry("scan.hdr")),
    );
    expect(row.enrichmentStatus).toBe("parsed");
    expect(row.thumbnailDataUrl).toBe(null);
    expect(row.scanType).toBe("NEXAFS Line Scan");
  });
});

describe("mergeParsedCatalogEntries", () => {
  it("preserves existing thumbnails when metadata is refreshed", () => {
    const placeholder = buildPlaceholderCatalogEntry({
      name: "line.hdr",
      relativePath: "line.hdr",
    });
    const parsed = parsedEntry("line.hdr");
    const merged = mergeParsedCatalogEntries(
      [{ ...placeholder, thumbnailDataUrl: "data:image/png;base64,abc" }],
      [parsed],
    );
    expect(merged[0]?.scanType).toBe("NEXAFS Line Scan");
    expect(merged[0]?.thumbnailDataUrl).toBe("data:image/png;base64,abc");
  });
});

describe("buildStxmCatalogCheckpoint", () => {
  it("skips placeholder rows in persisted metadata", () => {
    const checkpoint = buildStxmCatalogCheckpoint("beamtime", [
      buildPlaceholderCatalogEntry({
        name: "pending.hdr",
        relativePath: "pending.hdr",
      }),
      parsedEntry("ready.hdr"),
    ]);
    expect(checkpoint.entries).toHaveLength(1);
    expect(checkpoint.entries[0]?.relativePath).toBe("ready.hdr");
  });
});
