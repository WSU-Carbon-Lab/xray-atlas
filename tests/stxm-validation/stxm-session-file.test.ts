import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { buildStxmPreviewCacheUpdate } from "~/features/dashboard/instrument-workspace/sync-stxm-preview-cache";
import {
  createEmptyStxmSessionFile,
  importLegacyDashboardMetadataIntoSessionFile,
  mergeStxmSessionPreview,
  mergeStxmSessionScanEntry,
  parseStxmSessionFile,
  resolveStxmSessionIngestion,
  resolveStxmSessionPreview,
  resolveStxmSessionRegions,
  serializeStxmSessionFile,
} from "~/features/dashboard/lib/stxm-session-file";
import type {
  DashboardIngestionResult,
  DashboardRegionsStepMetadata,
} from "~/lib/dashboard-processing-session";
import type { StxmRegionSpectrumSeries } from "~/lib/stxm/stxm-region-types";
import { downsampleRegionSpectraForPersist } from "~/features/dashboard/instrument-workspace/downsample-region-spectra-for-persist";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toBeUndefined: () => void;
  toBeDefined: () => void;
  toBeNull: () => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const scanA = "beamtime/scan-a.hdr";
const scanB = "beamtime/scan-b.hdr";
const experimentName = "2024-03-AuNP";

const sampleRegions = (
  scanId: string,
  sampleLo: number,
): DashboardRegionsStepMetadata => ({
  scanId,
  sampleRegions: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      sampleLo,
      sampleHi: sampleLo + 1,
      spotLabel: "pure",
      role: "pure",
    },
  ],
  izeroBounds: { izeroLo: 10, izeroHi: 11 },
  pureRegionId: "11111111-1111-4111-8111-111111111111",
  weightingMode: "poisson_mle",
  normalization: {
    preLo: 270,
    preHi: 280,
    postLo: 320,
    postHi: 330,
  },
});

const sampleIngestion = (scanId: string): DashboardIngestionResult => ({
  scanId,
  computedAt: "2026-01-01T00:00:00.000Z",
  weightingMode: "poisson_mle",
  normalization: {
    preLo: 270,
    preHi: 280,
    postLo: 320,
    postHi: 330,
  },
  energyEv: [280, 290],
  od: [0.1, 0.2],
  odErr: [0.01, 0.02],
  delta: [0.001, 0.002],
  kkEngineLabel: "kkcalc2",
});

const sampleRegionSpectra = (): StxmRegionSpectrumSeries[] => [
  {
    regionId: "11111111-1111-4111-8111-111111111111",
    spotLabel: "pure",
    sampleLo: 2,
    sampleHi: 3,
    energyEv: [280, 290],
    signal: [100, 110],
    signalErr: [1, 1],
    od: [0.1, 0.2],
    odErr: [0.01, 0.02],
    delta: [0.001, 0.002],
    color: "var(--chart-1)",
  },
];

describe("stxm session file schema", () => {
  it("roundtrips through serialize and parse", () => {
    let session = createEmptyStxmSessionFile(experimentName);
    session = mergeStxmSessionScanEntry(session, scanA, {
      regions: sampleRegions(scanA, 2),
      ingestion: sampleIngestion(scanA),
    });
    const text = serializeStxmSessionFile(session);
    const parsed = parseStxmSessionFile(text);
    expect(parsed?.experimentName).toBe(experimentName);
    expect(parsed?.scans[scanA]?.regions?.sampleRegions?.[0]?.sampleLo).toBe(2);
    expect(parsed?.scans[scanA]?.ingestion?.delta?.[1]).toBe(0.002);
  });

  it("rejects unsupported version payloads", () => {
    const parsed = parseStxmSessionFile(
      JSON.stringify({
        version: 99,
        updatedAt: "2026-01-01T00:00:00.000Z",
        experimentName,
        scans: {},
      }),
    );
    expect(parsed).toBeNull();
  });
});

describe("mergeStxmSessionScanEntry", () => {
  it("retains independent scan rows on sequential merges", () => {
    let session = createEmptyStxmSessionFile(experimentName);
    session = mergeStxmSessionScanEntry(session, scanA, {
      regions: sampleRegions(scanA, 2),
    });
    session = mergeStxmSessionScanEntry(session, scanB, {
      regions: sampleRegions(scanB, 8),
    });
    expect(resolveStxmSessionRegions(session, scanA)?.sampleRegions?.[0]?.sampleLo).toBe(
      2,
    );
    expect(resolveStxmSessionRegions(session, scanB)?.sampleRegions?.[0]?.sampleLo).toBe(
      8,
    );
  });

  it("merges preview cache updates without dropping sibling scans", () => {
    let session = createEmptyStxmSessionFile(experimentName);
    const previewA = buildStxmPreviewCacheUpdate({
      scanId: scanA,
      scanLabel: scanA,
      previewMetadata: undefined,
      ingestionResult: sampleIngestion(scanA),
      regionSpectra: sampleRegionSpectra(),
    });
    expect(previewA).toBeDefined();
    session = mergeStxmSessionScanEntry(session, scanA, {
      ingestion: sampleIngestion(scanA),
      regionSpectra: downsampleRegionSpectraForPersist(sampleRegionSpectra()),
    });
    session = mergeStxmSessionPreview(session, previewA!);

    const previewB = buildStxmPreviewCacheUpdate({
      scanId: scanB,
      scanLabel: scanB,
      previewMetadata: resolveStxmSessionPreview(session),
      ingestionResult: sampleIngestion(scanB),
      regionSpectra: sampleRegionSpectra(),
    });
    expect(previewB).toBeDefined();
    session = mergeStxmSessionScanEntry(session, scanB, {
      ingestion: sampleIngestion(scanB),
      regionSpectra: downsampleRegionSpectraForPersist(sampleRegionSpectra()),
    });
    session = mergeStxmSessionPreview(session, previewB!);

    expect(resolveStxmSessionIngestion(session, scanA)?.delta?.[1]).toBe(0.002);
    expect(resolveStxmSessionIngestion(session, scanB)?.scanId).toBe(scanB);
    expect(
      resolveStxmSessionPreview(session).regionSpectraCache?.[scanA]?.[0]?.delta?.[1],
    ).toBe(0.002);
  });
});

describe("importLegacyDashboardMetadataIntoSessionFile", () => {
  it("copies regionsCache and preview caches into scan rows", () => {
    const empty = createEmptyStxmSessionFile(experimentName);
    const imported = importLegacyDashboardMetadataIntoSessionFile(empty, {
      regionsCache: {
        [scanA]: sampleRegions(scanA, 3),
        [scanB]: sampleRegions(scanB, 9),
      },
      preview: {
        spectra: [],
        standardOverlays: [],
        compareScanIds: [scanA],
        compareTraceKeys: [`${scanA}::aggregate`],
        atlasExperiments: [],
        ingestionCache: {
          [scanA]: sampleIngestion(scanA),
        },
        regionSpectraCache: {
          [scanA]: downsampleRegionSpectraForPersist(sampleRegionSpectra()),
        },
      },
    });
    expect(resolveStxmSessionRegions(imported, scanA)?.sampleRegions?.[0]?.sampleLo).toBe(
      3,
    );
    expect(resolveStxmSessionIngestion(imported, scanA)?.delta?.[1]).toBe(0.002);
    expect(imported.preview?.compareScanIds).toEqual([scanA]);
  });
});
