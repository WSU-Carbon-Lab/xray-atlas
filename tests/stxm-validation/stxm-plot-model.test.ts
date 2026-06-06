import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import type { StxmIngestionResult } from "~/features/dashboard/lib/computeStxmIngestion";
import {
  buildStxmIngestionPlotModel,
  resolveStxmIngestionPlotModelKind,
} from "~/features/dashboard/lib/stxm-plot-model";
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

const rawMultiRegionSpectra = (): StxmRegionSpectrumSeries[] => [
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

describe("buildStxmIngestionPlotModel", () => {
  it("keeps region multi-trace mode for OD when aggregated result exists", () => {
    const build = buildStxmIngestionPlotModel({
      result: sampleResult,
      regionSpectra: rawMultiRegionSpectra(),
      channel: "od",
      rawSignalTransform: "signal",
      standards: [],
      bareAtomCurve: null,
      showBareAtomOverlay: false,
      showRegionOverlays: true,
      pureRegionLabel: "pure",
    });
    expect(build.kind).toBe("regionMultiTrace");
    expect(build.model?.regionScopedTraces).toBe(true);
    expect(build.model?.primaryTraceLabel).toBe("OD (pure)");
    expect(build.model?.primaryTraceLabel === "OD (pure)" && build.model?.companionSpectra.length === 1).toBe(true);
  });

  it("does not fall back to aggregated legacy when beta enrichment is still pending", () => {
    const kind = resolveStxmIngestionPlotModelKind({
      result: sampleResult,
      regionSpectra: rawMultiRegionSpectra(),
      channel: "beta",
      rawSignalTransform: "signal",
      standards: [],
      bareAtomCurve: null,
      showBareAtomOverlay: false,
      showRegionOverlays: true,
      pureRegionLabel: "pure",
    });
    expect(kind).toBe("empty");

    const build = buildStxmIngestionPlotModel({
      result: sampleResult,
      regionSpectra: rawMultiRegionSpectra(),
      channel: "beta",
      rawSignalTransform: "signal",
      standards: [],
      bareAtomCurve: null,
      showBareAtomOverlay: false,
      showRegionOverlays: true,
      pureRegionLabel: "pure",
    });
    expect(build.kind).toBe("empty");
  });

  it("uses aggregated legacy only when no sample regions exist", () => {
    const build = buildStxmIngestionPlotModel({
      result: sampleResult,
      regionSpectra: [],
      channel: "od",
      rawSignalTransform: "signal",
      standards: [],
      bareAtomCurve: null,
      showBareAtomOverlay: false,
      showRegionOverlays: false,
      pureRegionLabel: "pure",
    });
    expect(build.kind).toBe("aggregatedLegacy");
    expect(build.model?.regionScopedTraces === true).toBe(false);
    expect(build.model?.primaryTraceLabel).toBe("OD (pure)");
  });

  it("never returns aggregated legacy when hasSampleRegions is true but regionSpectra is empty", () => {
    const build = buildStxmIngestionPlotModel({
      result: sampleResult,
      regionSpectra: [],
      channel: "od",
      rawSignalTransform: "signal",
      standards: [],
      bareAtomCurve: null,
      showBareAtomOverlay: false,
      showRegionOverlays: true,
      pureRegionLabel: "pure",
      hasSampleRegions: true,
    });
    expect(build.kind).toBe("empty");
  });

  it("plot invariant: sample regions require regionMultiTrace or empty, never aggregated legacy", () => {
    const spectra = rawMultiRegionSpectra();
    const build = buildStxmIngestionPlotModel({
      result: sampleResult,
      regionSpectra: spectra,
      channel: "od",
      rawSignalTransform: "signal",
      standards: [],
      bareAtomCurve: null,
      showBareAtomOverlay: false,
      showRegionOverlays: true,
      pureRegionLabel: "pure",
      hasSampleRegions: true,
    });
    expect(build.kind === "regionMultiTrace" || build.kind === "empty").toBe(true);
    if (build.kind === "regionMultiTrace") {
      expect(build.model?.regionScopedTraces).toBe(true);
    }
  });

  it("returns empty without throwing when sample regions exist but regionSpectra is empty", () => {
    const build = buildStxmIngestionPlotModel({
      result: sampleResult,
      regionSpectra: [],
      channel: "od",
      rawSignalTransform: "signal",
      standards: [],
      bareAtomCurve: null,
      showBareAtomOverlay: false,
      showRegionOverlays: true,
      pureRegionLabel: "pure",
      hasSampleRegions: true,
    });
    expect(build.kind).toBe("empty");
    expect(build.model).toBe(null);
  });
});
