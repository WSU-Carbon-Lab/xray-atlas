import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  insertCatalogEntrySorted,
  mergeCatalogEntries,
  mergeCatalogEntriesPreservingThumbnails,
  parsePlaceholderCatalogEntries,
} from "~/features/dashboard/lib/buildBeamtimeCatalog";
import { NEXAFS_LINE_SCAN_TYPE } from "~/lib/stxm/isNexafsLineScan";
import {
  applyParsedCatalogEntry,
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

describe("mergeCatalogEntriesPreservingThumbnails", () => {
  it("keeps thumbnail fields when stream progress replaces parsed rows", () => {
    const previous = [
      {
        ...catalogEntry("folder/line.hdr"),
        thumbnailDataUrl: "data:image/png;base64,abc",
        enrichmentStatus: "thumbnail" as const,
      },
    ];
    const incoming = [
      {
        ...catalogEntry("folder/line.hdr"),
        scanType: "NEXAFS Line Scan",
        enrichmentStatus: "parsed" as const,
      },
    ];
    const merged = mergeCatalogEntriesPreservingThumbnails(previous, incoming);
    expect(merged[0]?.thumbnailDataUrl).toBe("data:image/png;base64,abc");
    expect(merged[0]?.enrichmentStatus).toBe("thumbnail");
  });

  it("retains checkpoint rows while listing progress is partial", () => {
    const previous = [
      catalogEntry("a/scan.hdr"),
      catalogEntry("b/scan.hdr"),
    ];
    const incoming = [
      buildPlaceholderCatalogEntry({
        name: "scan.hdr",
        relativePath: "a/scan.hdr",
      }),
    ];
    const merged = mergeCatalogEntriesPreservingThumbnails(previous, incoming);
    expect(merged.map((row) => row.relativePath)).toEqual([
      "a/scan.hdr",
      "b/scan.hdr",
    ]);
  });

  it("appends newly discovered paths from incoming listing progress", () => {
    const previous = [catalogEntry("cached.hdr")];
    const incoming = [
      catalogEntry("cached.hdr"),
      buildPlaceholderCatalogEntry({
        name: "new.hdr",
        relativePath: "folder/new.hdr",
      }),
    ];
    const merged = mergeCatalogEntriesPreservingThumbnails(previous, incoming);
    expect(merged.map((row) => row.relativePath)).toEqual([
      "cached.hdr",
      "folder/new.hdr",
    ]);
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

describe("buildPlaceholderCatalogEntry", () => {
  it("marks rows as placeholder enrichment status", () => {
    const row = buildPlaceholderCatalogEntry({
      name: "line.hdr",
      relativePath: "folder/line.hdr",
    });
    expect(row.basename).toBe("line.hdr");
    expect(row.enrichmentStatus).toBe("placeholder");
    expect(catalogEntryEnrichmentStatus(row)).toBe("placeholder");
  });
});

describe("parsePlaceholderCatalogEntries", () => {
  it("replaces placeholder rows with parsed fallback when hdr read fails", async () => {
    const placeholder = buildPlaceholderCatalogEntry({
      name: "line.hdr",
      relativePath: "folder/line.hdr",
    });
    const entries = [placeholder];
    const failingHandle = {
      getFile: async () => {
        throw new Error("read denied");
      },
    };
    await parsePlaceholderCatalogEntries(
      [
        {
          name: "line.hdr",
          relativePath: "folder/line.hdr",
          handle: failingHandle as never,
        },
      ],
      entries,
    );
    expect(entries).toHaveLength(1);
    expect(catalogEntryEnrichmentStatus(entries[0]!)).toBe("parsed");
    expect(entries[0]?.scanType).toBe("Unknown");
  });

  it("skips rows that are already parsed", async () => {
    const parsed = {
      ...catalogEntry("ready.hdr"),
      enrichmentStatus: "parsed" as const,
    };
    const entries = [parsed];
    await parsePlaceholderCatalogEntries(
      [
        {
          name: "ready.hdr",
          relativePath: "ready.hdr",
          handle: {
            getFile: async () => {
              throw new Error("should not read");
            },
          } as never,
        },
      ],
      entries,
    );
    expect(entries[0]?.scanType).toBe("NEXAFS Line Scan");
  });

  it("classifies line scans from a header type peek without full axis parsing", async () => {
    const placeholder = buildPlaceholderCatalogEntry({
      name: "line.hdr",
      relativePath: "folder/line.hdr",
    });
    const entries = [placeholder];
    await parsePlaceholderCatalogEntries(
      [
        {
          name: "line.hdr",
          relativePath: "folder/line.hdr",
          handle: {
            getFile: async () => {
              const hdrText = `${NEXAFS_LINE_SCAN_TYPE}\n`;
              const blob = {
                text: async () => hdrText,
              };
              return {
                size: hdrText.length,
                text: async () => hdrText,
                slice: () => blob,
              } as File;
            },
          } as never,
        },
      ],
      entries,
    );
    expect(entries[0]?.scanType).toBe("NEXAFS Line Scan");
    expect(entries[0]?.category).toBe("line_scan");
    expect(entries[0]?.isNexafsLineScan).toBe(true);
    expect(entries[0]?.energyMinEv).toBe(null);
  });

  it("stops parsing when the abort signal is already set", async () => {
    const placeholder = buildPlaceholderCatalogEntry({
      name: "line.hdr",
      relativePath: "folder/line.hdr",
    });
    const entries = [placeholder];
    const controller = new AbortController();
    controller.abort();
    await parsePlaceholderCatalogEntries(
      [
        {
          name: "line.hdr",
          relativePath: "folder/line.hdr",
          handle: {
            getFile: async () => {
              throw new Error("should not read");
            },
          } as never,
        },
      ],
      entries,
      { signal: controller.signal },
    );
    expect(catalogEntryEnrichmentStatus(entries[0]!)).toBe("placeholder");
  });
});

describe("applyParsedCatalogEntry", () => {
  it("replaces a placeholder row in place", () => {
    const placeholder = buildPlaceholderCatalogEntry({
      name: "line.hdr",
      relativePath: "folder/line.hdr",
    });
    const parsed = {
      ...catalogEntry("folder/line.hdr"),
      enrichmentStatus: "parsed" as const,
    };
    const next = applyParsedCatalogEntry([placeholder], parsed);
    expect(next).toHaveLength(1);
    expect(next[0]?.enrichmentStatus).toBe("parsed");
    expect(next[0]?.scanType).toBe("NEXAFS Line Scan");
  });

  it("inserts parsed rows when no placeholder exists", () => {
    const next = applyParsedCatalogEntry(
      [catalogEntry("a/scan.hdr")],
      catalogEntry("b/scan.hdr"),
    );
    expect(next.map((row) => row.relativePath)).toEqual([
      "a/scan.hdr",
      "b/scan.hdr",
    ]);
  });
});
