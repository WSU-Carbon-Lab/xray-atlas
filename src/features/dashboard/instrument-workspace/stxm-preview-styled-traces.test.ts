import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  buildStxmPreviewStyledTraces,
  defaultStxmPreviewTraceKeys,
  listStxmPreviewTraceCandidates,
} from "./stxm-preview-styled-traces";
import { buildStxmPreviewTraceKey } from "./stxm-preview-trace-key";

type ExpectAssertions = {
  toHaveLength: (length: number) => void;
  toBe: (expected: unknown) => void;
  not: ExpectAssertions;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const entry = {
  scanId: "beamtime/scan001.hdr",
  scanLabel: "scan001",
  keptAt: "2026-01-01T00:00:00.000Z",
  edgeLabel: "C K-edge",
};

const ingestion = {
  scanId: entry.scanId,
  computedAt: "2026-01-01T00:00:00.000Z",
  weightingMode: "poisson_mle" as const,
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
};

describe("stxm-preview-styled-traces", () => {
  it("listStxmPreviewTraceCandidates prefers sample regions over aggregate", () => {
    const candidates = listStxmPreviewTraceCandidates({
      entries: [entry],
      ingestionByScanId: { [entry.scanId]: ingestion },
      regionSpectraByScanId: {
        [entry.scanId]: [
          {
            regionId: "izero",
            spotLabel: "izero",
            isIzero: true,
            energyEv: [280, 285, 290],
            signal: [100, 100, 100],
          },
          {
            regionId: "pure",
            spotLabel: "pure",
            energyEv: [280, 285, 290],
            signal: [80, 40, 20],
            od: [0.1, 0.5, 0.9],
          },
        ],
      },
    });
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.regionLabel).toBe("pure");
  });

  it("buildStxmPreviewStyledTraces returns overlay traces for selected keys", () => {
    const traceKey = buildStxmPreviewTraceKey(entry.scanId, "pure");
    const styled = buildStxmPreviewStyledTraces({
      entries: [entry],
      ingestionByScanId: { [entry.scanId]: ingestion },
      regionSpectraByScanId: {
        [entry.scanId]: [
          {
            regionId: "pure",
            spotLabel: "pure",
            energyEv: [280, 285, 290],
            signal: [80, 40, 20],
            od: [0.1, 0.5, 0.9],
          },
        ],
      },
      selectedTraceKeys: [traceKey],
      channel: "od",
      paletteId: "spectrum",
      colorBy: "molecule",
      lineStyleBy: "experiment",
      markerBy: "edge",
      isDark: false,
    });
    expect(styled.isEmpty).toBe(false);
    expect(styled.traces).toHaveLength(1);
    expect(styled.traces[0]?.descriptors.molecule).toBe("scan001");
    expect(styled.traces[0]?.descriptors.region).toBe("pure");
  });

  it("buildStxmPreviewStyledTraces uses incident theta when spot label is unnamed", () => {
    const traceKey = buildStxmPreviewTraceKey(entry.scanId, "sample-1");
    const styled = buildStxmPreviewStyledTraces({
      entries: [{ ...entry, incidentThetaDeg: 55 }],
      ingestionByScanId: { [entry.scanId]: ingestion },
      regionSpectraByScanId: {
        [entry.scanId]: [
          {
            regionId: "sample-1",
            spotLabel: "",
            energyEv: [280, 285, 290],
            signal: [80, 40, 20],
            od: [0.1, 0.5, 0.9],
          },
        ],
      },
      selectedTraceKeys: [traceKey],
      channel: "od",
      paletteId: "spectrum",
      colorBy: "molecule",
      lineStyleBy: "experiment",
      markerBy: "edge",
      isDark: false,
    });
    expect(styled.traces[0]?.descriptors.region).toBe("55°");
    expect(styled.traces[0]?.descriptors.theta).toBe("55°");
  });

  it("buildStxmPreviewStyledTraces applies ingestion normalization when region cache lacks odNormalized", () => {
    const traceKey = buildStxmPreviewTraceKey(entry.scanId, "pure");
    const styled = buildStxmPreviewStyledTraces({
      entries: [entry],
      ingestionByScanId: { [entry.scanId]: ingestion },
      regionSpectraByScanId: {
        [entry.scanId]: [
          {
            regionId: "pure",
            spotLabel: "pure",
            energyEv: [280, 285, 290],
            signal: [80, 40, 20],
            od: [0.1, 0.5, 0.9],
          },
        ],
      },
      selectedTraceKeys: [traceKey],
      channel: "od_normalized",
      paletteId: "spectrum",
      colorBy: "molecule",
      lineStyleBy: "experiment",
      markerBy: "edge",
      isDark: false,
    });
    expect(styled.isEmpty).toBe(false);
    expect(styled.traces[0]?.points[0]?.absorption).toBe(0);
    expect(styled.traces[0]?.points[1]?.absorption).not.toBe(0.5);
  });

  it("buildStxmPreviewStyledTraces reads cached region odNormalized without recomputing from raw od", () => {
    const traceKey = buildStxmPreviewTraceKey(entry.scanId, "pure");
    const styled = buildStxmPreviewStyledTraces({
      entries: [entry],
      ingestionByScanId: { [entry.scanId]: ingestion },
      regionSpectraByScanId: {
        [entry.scanId]: [
          {
            regionId: "pure",
            spotLabel: "pure",
            energyEv: [280, 285, 290],
            signal: [80, 40, 20],
            od: [0.1, 0.5, 0.9],
            odNormalized: [0, 0.75, 1],
          },
        ],
      },
      selectedTraceKeys: [traceKey],
      channel: "od_normalized",
      paletteId: "spectrum",
      colorBy: "molecule",
      lineStyleBy: "experiment",
      markerBy: "edge",
      isDark: false,
    });
    expect(styled.traces[0]?.points[1]?.absorption).toBe(0.75);
    expect(styled.traces[0]?.points[1]?.absorption).not.toBe(0.5);
  });

  it("defaultStxmPreviewTraceKeys selects every listed candidate", () => {
    const candidates = listStxmPreviewTraceCandidates({
      entries: [entry],
      ingestionByScanId: { [entry.scanId]: ingestion },
      regionSpectraByScanId: {},
    });
    expect(defaultStxmPreviewTraceKeys(candidates)).toHaveLength(1);
  });
});
