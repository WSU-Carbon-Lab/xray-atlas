import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  buildStxmPreviewCacheUpdate,
  stxmPreviewCacheHasPlottableSpectra,
} from "./sync-stxm-preview-cache";
import {
  isAtlasPreviewCompareTraceKey,
  isStxmPreviewCompareTraceKey,
  partitionPreviewCompareTraceKeys,
} from "./preview-compare-trace-key";
import {
  buildPreviewCompareStyledTraces,
  stxmPreviewChannelToNexafsChannelId,
} from "./stxm-preview-styled-traces";
import { buildPlotViewerTraceKey } from "~/features/dashboard/plot-viewer/plot-viewer-trace-key";
import { buildStxmPreviewTraceKey } from "./stxm-preview-trace-key";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toHaveLength: (length: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("sync-stxm-preview-cache", () => {
  it("stxmPreviewCacheHasPlottableSpectra detects finite region od", () => {
    expect(
      stxmPreviewCacheHasPlottableSpectra({
        ingestionResult: null,
        regionSpectra: [
          {
            regionId: "pure",
            spotLabel: "pure",
            sampleLo: 0,
            sampleHi: 1,
            energyEv: [280],
            signal: [1],
            od: [0.2],
            signalErr: [],
            color: "var(--chart-1)",
          },
        ],
      }),
    ).toBe(true);
  });

  it("buildStxmPreviewCacheUpdate upserts scan and trace keys", () => {
    const update = buildStxmPreviewCacheUpdate({
      scanId: "scan/a.hdr",
      scanLabel: "scan-a",
      edgeLabel: "C K-edge",
      moleculeName: "Y6",
      previewMetadata: {
        spectra: [],
        standardOverlays: [],
        compareScanIds: [],
        compareTraceKeys: [],
        atlasExperiments: [],
      },
      ingestionResult: {
        scanId: "scan/a.hdr",
        computedAt: "2026-01-01T00:00:00.000Z",
        weightingMode: "poisson_mle",
        normalization: { preLo: 270, preHi: 280, postLo: 320, postHi: 330 },
        energyEv: [280, 285],
        od: [0.1, 0.5],
        odErr: [0.01, 0.02],
      },
      regionSpectra: [
        {
          regionId: "pure",
          spotLabel: "pure",
          sampleLo: 0,
          sampleHi: 1,
          energyEv: [280, 285],
          signal: [80, 40],
          od: [0.1, 0.5],
          signalErr: [],
          color: "var(--chart-1)",
        },
      ],
    });
    expect(update?.spectra).toHaveLength(1);
    expect(update?.spectra[0]?.moleculeName).toBe("Y6");
    expect(update?.compareTraceKeys).toHaveLength(1);
  });
});

describe("preview-compare-trace-key", () => {
  it("partitionPreviewCompareTraceKeys splits STXM and Atlas keys", () => {
    const stxmKey = buildStxmPreviewTraceKey("scan/a.hdr", "pure");
    const atlasKey = buildPlotViewerTraceKey(
      "30539a6a-8690-6b55-8690-6b5586906b55",
      "55:0",
    );
    const parts = partitionPreviewCompareTraceKeys([stxmKey, atlasKey]);
    expect(parts.stxmTraceKeys).toEqual([stxmKey]);
    expect(parts.atlasTraceKeys).toEqual([atlasKey]);
    expect(isStxmPreviewCompareTraceKey(stxmKey)).toBe(true);
    expect(isAtlasPreviewCompareTraceKey(atlasKey)).toBe(true);
  });
});

describe("mixed preview compare styled traces", () => {
  it("stxmPreviewChannelToNexafsChannelId maps od to normalized", () => {
    expect(stxmPreviewChannelToNexafsChannelId("od")).toBe("normalized");
    expect(stxmPreviewChannelToNexafsChannelId("mass_absorption")).toBe(
      "mass-absorption",
    );
  });

  it("buildPreviewCompareStyledTraces merges STXM and Atlas traces", () => {
    const stxmKey = buildStxmPreviewTraceKey("scan/a.hdr", "pure");
    const atlasExperimentId = "30539a6a-8690-6b55-8690-6b5586906b55";
    const atlasKey = buildPlotViewerTraceKey(atlasExperimentId, "fixed");
    const styled = buildPreviewCompareStyledTraces({
      entries: [
        {
          scanId: "scan/a.hdr",
          scanLabel: "scan-a",
          keptAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      ingestionByScanId: {
        "scan/a.hdr": {
          scanId: "scan/a.hdr",
          computedAt: "2026-01-01T00:00:00.000Z",
          weightingMode: "poisson_mle",
          normalization: { preLo: 270, preHi: 280, postLo: 320, postHi: 330 },
          energyEv: [280, 285],
          od: [0.1, 0.5],
          odErr: [0.01, 0.02],
        },
      },
      regionSpectraByScanId: {
        "scan/a.hdr": [
          {
            regionId: "pure",
            spotLabel: "pure",
            energyEv: [280, 285],
            od: [0.1, 0.5],
          },
        ],
      },
      atlasEntries: [
        {
          experimentId: atlasExperimentId,
          label: "Atlas molecule",
          addedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      atlasDatasets: [
        {
          experimentId: atlasExperimentId,
          label: "Atlas molecule",
          chemicalFormula: null,
          spectrumPoints: [
            { energy: 280, absorption: 0.2, od: 0.2 },
            { energy: 285, absorption: 0.6, od: 0.6 },
          ],
        },
      ],
      atlasGeometryByExperimentId: {
        [atlasExperimentId]: ["fixed"],
      },
      selectedTraceKeys: [stxmKey, atlasKey],
      channel: "od",
      paletteId: "spectrum",
      colorBy: "molecule",
      lineStyleBy: "experiment",
      markerBy: "edge",
      isDark: false,
    });
    expect(styled.isEmpty).toBe(false);
    expect(styled.traces).toHaveLength(2);
    expect(styled.traces[0]?.descriptors.facility).toBe("Local cache");
    expect(styled.traces[1]?.descriptors.facility).toBe("Atlas");
  });

  it("buildPreviewCompareStyledTraces shows theta in Region for unnamed STXM and Atlas geometry", () => {
    const stxmKey = buildStxmPreviewTraceKey("scan/a.hdr", "sample-1");
    const atlasExperimentId = "30539a6a-8690-6b55-8690-6b5586906b55";
    const atlasKey = buildPlotViewerTraceKey(atlasExperimentId, "55:0");
    const styled = buildPreviewCompareStyledTraces({
      entries: [
        {
          scanId: "scan/a.hdr",
          scanLabel: "scan-a",
          keptAt: "2026-01-01T00:00:00.000Z",
          incidentThetaDeg: 55,
        },
      ],
      ingestionByScanId: {
        "scan/a.hdr": {
          scanId: "scan/a.hdr",
          computedAt: "2026-01-01T00:00:00.000Z",
          weightingMode: "poisson_mle",
          normalization: { preLo: 270, preHi: 280, postLo: 320, postHi: 330 },
          energyEv: [280, 285],
          od: [0.1, 0.5],
          odErr: [0.01, 0.02],
        },
      },
      regionSpectraByScanId: {
        "scan/a.hdr": [
          {
            regionId: "sample-1",
            spotLabel: "",
            energyEv: [280, 285],
            od: [0.1, 0.5],
          },
        ],
      },
      atlasEntries: [
        {
          experimentId: atlasExperimentId,
          label: "Atlas molecule",
          addedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      atlasDatasets: [
        {
          experimentId: atlasExperimentId,
          label: "Atlas molecule",
          chemicalFormula: null,
          spectrumPoints: [
            { energy: 280, absorption: 0.2, od: 0.2, theta: 55, phi: 0 },
            { energy: 285, absorption: 0.6, od: 0.6, theta: 55, phi: 0 },
          ],
        },
      ],
      atlasGeometryByExperimentId: {
        [atlasExperimentId]: ["55:0"],
      },
      selectedTraceKeys: [stxmKey, atlasKey],
      channel: "od",
      paletteId: "spectrum",
      colorBy: "molecule",
      lineStyleBy: "experiment",
      markerBy: "edge",
      isDark: false,
    });
    expect(styled.traces[0]?.descriptors.region).toBe("55°");
    expect(styled.traces[1]?.descriptors.region).toBe("55°");
  });
});
