import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  stxmPreviewCacheHasPlottableSpectra,
  buildStxmPreviewCacheUpdate,
} from "~/features/dashboard/instrument-workspace/sync-stxm-preview-cache";
import { downsampleRegionSpectraForPersist } from "~/features/dashboard/instrument-workspace/downsample-region-spectra-for-persist";
import {
  createEmptyStxmSessionFile,
  applyPreviewCacheToSessionScans,
  mergeStxmSessionScanEntry,
  resolveStxmSessionPreview,
} from "~/features/dashboard/lib/stxm-session-file";
import type { DashboardIngestionResult } from "~/lib/dashboard-processing-session";
import type { StxmRegionSpectrumSeries } from "~/lib/stxm/stxm-region-types";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeDefined: () => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const scanId = "beamtime/scan-a.hdr";

const normalizedIngestion = (): DashboardIngestionResult => ({
  scanId,
  computedAt: "2026-01-01T00:00:00.000Z",
  weightingMode: "poisson_mle",
  normalization: {
    preLo: 270,
    preHi: 280,
    postLo: 320,
    postHi: 330,
  },
  energyEv: [280, 285, 290],
  od: [0.1, 0.5, 0.9],
  odErr: [0.01, 0.02, 0.03],
  odNormalized: [0, 0.5, 1],
  massAbsorption: [0.2, 0.4, 0.6],
  beta: [0.01, 0.02, 0.03],
});

const enrichedRegionSpectra = (): StxmRegionSpectrumSeries[] => [
  {
    regionId: "pure",
    spotLabel: "pure",
    sampleLo: 2,
    sampleHi: 3,
    energyEv: [280, 285, 290],
    signal: [80, 40, 20],
    signalErr: [1, 1, 1],
    od: [0.1, 0.5, 0.9],
    odErr: [0.01, 0.02, 0.03],
    odNormalized: [0, 0.5, 1],
    massAbsorption: [0.2, 0.4, 0.6],
    beta: [0.01, 0.02, 0.03],
    color: "var(--chart-1)",
  },
];

describe("stxm preview normalization cache", () => {
  it("stxmPreviewCacheHasPlottableSpectra accepts normalized region channels", () => {
    expect(
      stxmPreviewCacheHasPlottableSpectra({
        ingestionResult: null,
        regionSpectra: enrichedRegionSpectra(),
      }),
    ).toBe(true);
  });

  it("buildStxmPreviewCacheUpdate persists normalized ingestion and region spectra", () => {
    const update = buildStxmPreviewCacheUpdate({
      scanId,
      scanLabel: scanId,
      previewMetadata: undefined,
      ingestionResult: normalizedIngestion(),
      regionSpectra: enrichedRegionSpectra(),
    });
    expect(update).toBeDefined();
    expect(update?.ingestionCache?.[scanId]?.odNormalized?.[0]).toBe(0);
    expect(
      update?.regionSpectraCache?.[scanId]?.[0]?.odNormalized?.[2],
    ).toBe(1);
    expect(update?.ingestionCache?.[scanId]?.normalization?.preLo).toBe(270);
  });

  it("applyPreviewCacheToSessionScans replaces stale scan-level normalized series", () => {
    const experimentName = "2024-test";
    const staleIngestion: DashboardIngestionResult = {
      ...normalizedIngestion(),
      odNormalized: [0.1, 0.5, 0.9],
    };
    const staleRegions = downsampleRegionSpectraForPersist([
      {
        ...enrichedRegionSpectra()[0]!,
        odNormalized: [0.1, 0.5, 0.9],
      },
    ]);
    let session = createEmptyStxmSessionFile(experimentName);
    session = mergeStxmSessionScanEntry(session, scanId, {
      ingestion: staleIngestion,
      regionSpectra: staleRegions,
    });

    const update = buildStxmPreviewCacheUpdate({
      scanId,
      scanLabel: scanId,
      previewMetadata: resolveStxmSessionPreview(session),
      ingestionResult: normalizedIngestion(),
      regionSpectra: enrichedRegionSpectra(),
    });
    expect(update).toBeDefined();
    session = applyPreviewCacheToSessionScans(session, update!);

    const resolved = resolveStxmSessionPreview(session);
    expect(resolved.ingestionCache?.[scanId]?.odNormalized?.[0]).toBe(0);
    expect(resolved.ingestionCache?.[scanId]?.odNormalized?.[2]).toBe(1);
    expect(resolved.regionSpectraCache?.[scanId]?.[0]?.odNormalized?.[0]).toBe(
      0,
    );
    expect(resolved.regionSpectraCache?.[scanId]?.[0]?.odNormalized?.[2]).toBe(
      1,
    );
  });
});
