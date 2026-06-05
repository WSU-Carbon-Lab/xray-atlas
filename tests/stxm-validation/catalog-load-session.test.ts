import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  hydrateBeamtimeCatalogFromCheckpoint,
  streamBeamtimeCatalogFast,
} from "~/features/dashboard/lib/buildBeamtimeCatalog";
import {
  buildStxmCatalogCheckpoint,
  serializeStxmCatalogCheckpoint,
  STXM_CATALOG_CHECKPOINT_FILENAME,
  summarizeCheckpointEntryCounts,
} from "~/features/dashboard/lib/stxm-catalog-checkpoint";
import {
  catalogEntryEnrichmentStatus,
  type StxmCatalogEntry,
} from "~/lib/stxm";
import type { StxmDirectoryLayout } from "~/features/dashboard/lib/resolveDirectoryLayout";

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

function mockExperimentTree(
  experimentName: string,
  hdrPaths: string[],
  checkpoint?: ReturnType<typeof buildStxmCatalogCheckpoint>,
) {
  const files = new Map<string, string>();
  if (checkpoint) {
    files.set(
      STXM_CATALOG_CHECKPOINT_FILENAME,
      serializeStxmCatalogCheckpoint(checkpoint),
    );
  }
  for (const path of hdrPaths) {
    files.set(path, "sampletype NEXAFS Line Scan\n");
  }

  const experimentDir = {
    name: experimentName,
    entries: async function* () {
      for (const path of files.keys()) {
        yield [
          path,
          {
            kind: "file",
            getFile: async () => ({
              text: async () => files.get(path) ?? "",
              size: 128,
              name: path,
            }),
          },
        ] as const;
      }
    },
    getFileHandle: async (name: string) => ({
      getFile: async () => ({
        text: async () => files.get(name) ?? "",
        size: 128,
        name,
      }),
    }),
  };

  const root = {
    name: "BL5321",
    entries: async function* () {
      yield [experimentName, { kind: "directory", ...experimentDir }] as const;
    },
    getDirectoryHandle: async () => experimentDir,
  };

  const layout: StxmDirectoryLayout = {
    mode: "multi-experiment",
    experimentNames: [experimentName],
  };

  return { root: root as never, layout, experimentDir: experimentDir as never };
}

describe("hydrateBeamtimeCatalogFromCheckpoint", () => {
  it("returns parsed rows without walking hdr files", async () => {
    const checkpoint = buildStxmCatalogCheckpoint("2026-03(March)", [
      parsedEntry("line_a.hdr"),
      parsedEntry("line_b.hdr"),
    ]);
    const { root, layout } = mockExperimentTree(
      "2026-03(March)",
      [],
      checkpoint,
    );
    const rows = await hydrateBeamtimeCatalogFromCheckpoint(
      root,
      layout,
      "2026-03(March)",
    );
    expect(rows).toHaveLength(2);
    expect(catalogEntryEnrichmentStatus(rows[0]!)).toBe("parsed");
  });
});

describe("summarizeCheckpointEntryCounts", () => {
  it("counts total and NEXAFS line scans for beamtime pills", () => {
    const checkpoint = buildStxmCatalogCheckpoint("2026-03(March)", [
      parsedEntry("line_a.hdr"),
      {
        ...parsedEntry("image_a.hdr"),
        category: "image_scan",
        isNexafsLineScan: false,
      },
    ]);
    const counts = summarizeCheckpointEntryCounts(checkpoint);
    expect(counts.total).toBe(2);
    expect(counts.nexafs).toBe(1);
  });
});

describe("streamBeamtimeCatalogFast abort", () => {
  it("returns partial rows and does not throw when aborted mid-listing", async () => {
    const checkpoint = buildStxmCatalogCheckpoint("2026-03(March)", [
      parsedEntry("cached.hdr"),
    ]);
    const { root, layout } = mockExperimentTree(
      "2026-03(March)",
      ["cached.hdr", "new.hdr"],
      checkpoint,
    );
    const controller = new AbortController();
    controller.abort();
    const result = await streamBeamtimeCatalogFast(
      root,
      layout,
      "2026-03(March)",
      {
        signal: controller.signal,
        skipInitialCheckpoint: true,
      },
    );
    expect(result.complete).toBe(false);
    expect(Array.isArray(result.entries)).toBe(true);
  });
});
