import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  downsampleRegionSpectraForPersist,
  previewRegionSpectraToSeries,
} from "~/features/dashboard/instrument-workspace/downsample-region-spectra-for-persist";
import { buildStxmPreviewCacheUpdate } from "~/features/dashboard/instrument-workspace/sync-stxm-preview-cache";
import {
  resolveIngestionMetadataForScan,
  resolveRegionsMetadataForScan,
  type DashboardIngestionResult,
  type DashboardRegionsStepMetadata,
} from "~/lib/dashboard-processing-session";
import type { StxmRegionSpectrumSeries } from "~/lib/stxm/stxm-region-types";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toBeUndefined: () => void;
  toBeDefined: () => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const scanA = "beamtime/scan-a.hdr";
const scanB = "beamtime/scan-b.hdr";

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

describe("resolveIngestionMetadataForScan", () => {
  it("prefers preview ingestion cache over legacy top-level ingestion", () => {
    const resolved = resolveIngestionMetadataForScan(
      {
        ingestion: sampleIngestion(scanB),
        preview: {
          spectra: [],
          standardOverlays: [],
          compareScanIds: [],
          compareTraceKeys: [],
          atlasExperiments: [],
          ingestionCache: {
            [scanA]: sampleIngestion(scanA),
          },
        },
      },
      scanA,
    );
    expect(resolved?.scanId).toBe(scanA);
    expect(resolved?.delta?.[1]).toBe(0.002);
  });

  it("returns undefined when legacy ingestion belongs to another scan", () => {
    const resolved = resolveIngestionMetadataForScan(
      { ingestion: sampleIngestion(scanB) },
      scanA,
    );
    expect(resolved).toBeUndefined();
  });
});

describe("quick scan switch persistence helpers", () => {
  it("retains per-scan regions cache entries independently", () => {
    const metadata = {
      regionsCache: {
        [scanA]: sampleRegions(scanA, 2),
        [scanB]: sampleRegions(scanB, 8),
      },
    };
    expect(resolveRegionsMetadataForScan(metadata, scanA)?.sampleRegions?.[0]?.sampleLo).toBe(
      2,
    );
    expect(resolveRegionsMetadataForScan(metadata, scanB)?.sampleRegions?.[0]?.sampleLo).toBe(
      8,
    );
  });

  it("roundtrips delta through preview region spectra cache", () => {
    const downsampled = downsampleRegionSpectraForPersist(sampleRegionSpectra());
    const restored = previewRegionSpectraToSeries(downsampled);
    expect(restored[0]?.delta?.[1]).toBe(0.002);
  });

  it("merges scan A preview cache without dropping scan B on sequential updates", () => {
    const previewA = buildStxmPreviewCacheUpdate({
      scanId: scanA,
      scanLabel: scanA,
      previewMetadata: undefined,
      ingestionResult: sampleIngestion(scanA),
      regionSpectra: sampleRegionSpectra(),
    });
    expect(previewA).toBeDefined();

    const previewB = buildStxmPreviewCacheUpdate({
      scanId: scanB,
      scanLabel: scanB,
      previewMetadata: previewA!,
      ingestionResult: sampleIngestion(scanB),
      regionSpectra: sampleRegionSpectra(),
    });
    expect(previewB?.ingestionCache?.[scanA]?.delta?.[1]).toBe(0.002);
    expect(previewB?.ingestionCache?.[scanB]?.scanId).toBe(scanB);
    expect(previewB?.regionSpectraCache?.[scanA]?.[0]?.delta?.[1]).toBe(0.002);
  });
});
