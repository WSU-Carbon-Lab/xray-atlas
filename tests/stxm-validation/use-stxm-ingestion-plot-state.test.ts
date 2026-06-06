import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import type { StxmIngestionResult } from "~/features/dashboard/lib/computeStxmIngestion";
import { buildStxmIngestionPlotModel } from "~/features/dashboard/lib/stxm-plot-model";
import {
  resolveStxmIngestionPlotDisplay,
  type StxmIngestionPlotDisplayCache,
} from "~/features/dashboard/hooks/useStxmIngestionPlotState";
import type { StxmRegionSpectrumSeries } from "~/lib/stxm/stxm-region-types";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const sampleResult: StxmIngestionResult = {
  energyEv: [280, 281],
  i0: [2000, 2100],
  i0Err: [10, 10],
  iSample: [500, 400],
  iSampleErr: [5, 5],
  iTe: null,
  iTeErr: null,
  od: [0.69, 0.92],
  odErr: [0.01, 0.02],
  odNormalized: [0.1, 0.5],
  massAbsorption: [0.01, 0.02],
  massAbsorptionErr: [0.001, 0.001],
  beta: [0.001, 0.002],
  betaErr: [0.0001, 0.0001],
  delta: [0.01, 0.02],
  normalization: {
    preLo: 279,
    preHi: 280,
    postLo: 290,
    postHi: 291,
  },
  normalizationScale: 1,
  bareAtomScale: null,
  bareAtomOffset: null,
  thicknessCm: 0.0001,
  formula: "C8H8",
  weightingMode: "poisson_mle",
  kkEngineLabel: null,
};

const multiRegionSpectra = (): StxmRegionSpectrumSeries[] => [
  {
    spotLabel: "izero",
    regionId: "izero",
    sampleLo: 0,
    sampleHi: 1,
    energyEv: [280, 281],
    signal: [2000, 2100],
    signalErr: [10, 10],
    color: "#888",
    isIzero: true,
  },
  {
    spotLabel: "pure",
    regionId: "pure-id",
    sampleLo: 2,
    sampleHi: 3,
    energyEv: [280, 281],
    signal: [500, 400],
    signalErr: [5, 5],
    color: "#16a34a",
  },
  {
    spotLabel: "edge",
    regionId: "edge-id",
    sampleLo: 4,
    sampleHi: 5,
    energyEv: [280, 281],
    signal: [300, 250],
    signalErr: [4, 4],
    color: "#0891b2",
  },
];

const plotParams = {
  rawSignalTransform: "signal" as const,
  standards: [],
  bareAtomCurve: null,
  showBareAtomOverlay: false,
  showRegionOverlays: true,
  pureRegionLabel: "pure",
  hasSampleRegions: true,
};

describe("resolveStxmIngestionPlotDisplay", () => {
  it("reuses region multi-trace while regionSpectra is empty during async recompute", () => {
    const good = buildStxmIngestionPlotModel({
      result: sampleResult,
      regionSpectra: multiRegionSpectra(),
      channel: "od",
      ...plotParams,
    });
    expect(good.kind).toBe("regionMultiTrace");
    if (good.kind !== "regionMultiTrace") {
      return;
    }

    const cache: StxmIngestionPlotDisplayCache = {
      cacheKey: "od:2:1",
      build: good,
    };

    const transientLegacy = buildStxmIngestionPlotModel({
      result: sampleResult,
      regionSpectra: [],
      channel: "od",
      ...plotParams,
    });
    expect(transientLegacy.kind).toBe("empty");

    const resolved = resolveStxmIngestionPlotDisplay(transientLegacy, {
      hasSampleRegions: true,
      channel: "od",
      cacheKey: "od:0:1",
      previous: cache,
    });
    expect(resolved.display.kind).toBe("regionMultiTrace");
    expect(resolved.display.model?.regionScopedTraces).toBe(true);
    expect(resolved.display.model?.companionSpectra.length).toBe(1);
  });

  it("does not reuse stale OD multi-trace when channel switches to beta before enrichment", () => {
    const odGood = buildStxmIngestionPlotModel({
      result: sampleResult,
      regionSpectra: multiRegionSpectra(),
      channel: "od",
      ...plotParams,
    });
    expect(odGood.kind).toBe("regionMultiTrace");
    if (odGood.kind !== "regionMultiTrace") {
      return;
    }

    const cache: StxmIngestionPlotDisplayCache = {
      cacheKey: "od:3:2",
      build: odGood,
    };

    const betaPending = buildStxmIngestionPlotModel({
      result: sampleResult,
      regionSpectra: multiRegionSpectra(),
      channel: "beta",
      ...plotParams,
    });
    expect(betaPending.kind).toBe("empty");

    const resolved = resolveStxmIngestionPlotDisplay(betaPending, {
      hasSampleRegions: true,
      channel: "beta",
      cacheKey: "beta:3:2",
      previous: cache,
    });
    expect(resolved.display.kind).toBe("empty");
  });

  it("simulates drag preview then pipeline without flashing aggregated legacy", () => {
    const good = buildStxmIngestionPlotModel({
      result: sampleResult,
      regionSpectra: multiRegionSpectra(),
      channel: "od",
      regionSpectraEpoch: 5,
      pipelineEpoch: 4,
      ...plotParams,
    });
    expect(good.kind).toBe("regionMultiTrace");
    if (good.kind !== "regionMultiTrace") {
      return;
    }

    let cache: StxmIngestionPlotDisplayCache | null = {
      cacheKey: "od:5:4",
      build: good,
    };

    const previewLegacy = buildStxmIngestionPlotModel({
      result: sampleResult,
      regionSpectra: [],
      channel: "od",
      regionSpectraEpoch: 0,
      pipelineEpoch: 4,
      ...plotParams,
    });
    const previewResolved = resolveStxmIngestionPlotDisplay(previewLegacy, {
      hasSampleRegions: true,
      channel: "od",
      cacheKey: "od:0:4",
      previous: cache,
    });
    expect(previewResolved.display.kind).toBe("regionMultiTrace");
    cache = previewResolved.nextCache;

    const pipelineLegacy = buildStxmIngestionPlotModel({
      result: sampleResult,
      regionSpectra: [],
      channel: "od",
      regionSpectraEpoch: 0,
      pipelineEpoch: 5,
      ...plotParams,
    });
    const pipelineResolved = resolveStxmIngestionPlotDisplay(pipelineLegacy, {
      hasSampleRegions: true,
      channel: "od",
      cacheKey: "od:0:5",
      previous: cache,
    });
    expect(pipelineResolved.display.kind).toBe("regionMultiTrace");
    expect(pipelineResolved.display.model?.regionScopedTraces).toBe(true);
  });
});
