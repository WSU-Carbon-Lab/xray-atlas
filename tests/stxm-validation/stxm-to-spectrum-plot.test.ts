import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  buildStxmRegionTraceLabel,
  buildStxmSpectrumPlotModel,
  shouldUseStxmRegionScopedTraces,
} from "~/features/dashboard/lib/stxm-to-spectrum-plot";
import type { StxmIngestionResult } from "~/features/dashboard/lib/computeStxmIngestion";
import type { StxmRegionSpectrumSeries } from "~/lib/stxm/stxm-region-types";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeCloseTo: (expected: number, precision?: number) => void;
  toBeNull: () => void;
  toHaveLength: (expected: number) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const sampleResult: StxmIngestionResult = {
  energyEv: [280, 281, 282],
  i0: [1000, 1010, 1020],
  i0Err: [10, 10, 10],
  iSample: [500, 400, 300],
  iSampleErr: [5, 5, 5],
  iTe: null,
  iTeErr: null,
  od: [0.69, 0.92, 1.22],
  odErr: [0.01, 0.02, 0.03],
  odNormalized: [0.1, 0.5, 1.0],
  massAbsorption: [0.01, 0.02, 0.03],
  massAbsorptionErr: [0.001, 0.001, 0.001],
  beta: [0.001, 0.002, 0.003],
  betaErr: [0.0001, 0.0001, 0.0001],
  delta: [0.01, 0.02, 0.03],
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

describe("buildStxmSpectrumPlotModel", () => {
  it("maps I0 channel from reduced result with error bars", () => {
    const model = buildStxmSpectrumPlotModel({
      result: sampleResult,
      regionSpectra: [],
      channel: "signal_i0",
      rawSignalTransform: "signal",
      standards: [],
      bareAtomCurve: null,
      showBareAtomOverlay: false,
      showRegionOverlays: false,
    });
    expect(model !== null).toBe(true);
    expect(model?.points).toHaveLength(3);
    expect(model?.points[0]?.absorption).toBe(1000);
    expect(model?.points[0]?.rawabsError).toBe(10);
    expect(model?.yAxisQuantity).toBe("intensity");
  });

  it("applies reciprocal transform for raw It channel", () => {
    const model = buildStxmSpectrumPlotModel({
      result: sampleResult,
      regionSpectra: [],
      channel: "signal_it",
      rawSignalTransform: "reciprocal",
      standards: [],
      bareAtomCurve: null,
      showBareAtomOverlay: false,
      showRegionOverlays: false,
    });
    expect(model?.points[0]?.absorption).toBeCloseTo(0.002, 8);
  });

  it("enables normalization shading for OD channel", () => {
    const model = buildStxmSpectrumPlotModel({
      result: sampleResult,
      regionSpectra: [],
      channel: "od",
      rawSignalTransform: "signal",
      standards: [],
      bareAtomCurve: null,
      showBareAtomOverlay: false,
      showRegionOverlays: false,
    });
    expect(model?.showNormalizationShading).toBe(true);
    expect(model?.normalizationRegions?.pre).toEqual([279, 280]);
    expect(model?.yAxisQuantity).toBe("optical-density");
  });

  it("buildStxmRegionTraceLabel prefixes channel and region spot label", () => {
    expect(buildStxmRegionTraceLabel("signal_it", "pure")).toBe("It (pure)");
    expect(buildStxmRegionTraceLabel("signal_it", "edge")).toBe("It (edge)");
    expect(buildStxmRegionTraceLabel("od", "film")).toBe("OD (film)");
  });

  it("plots one trace per sample region for raw It with region-scoped labels", () => {
    const regionSpectra: StxmRegionSpectrumSeries[] = [
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
        color: "#f00",
      },
      {
        spotLabel: "edge",
        regionId: "edge-id",
        sampleLo: 4,
        sampleHi: 5,
        energyEv: [280, 281],
        signal: [300, 250],
        signalErr: [4, 4],
        color: "#0f0",
      },
    ];
    expect(shouldUseStxmRegionScopedTraces(regionSpectra, "signal_it")).toBe(true);
    const model = buildStxmSpectrumPlotModel({
      result: sampleResult,
      regionSpectra,
      channel: "signal_it",
      rawSignalTransform: "signal",
      standards: [],
      bareAtomCurve: null,
      showBareAtomOverlay: false,
      showRegionOverlays: true,
    });
    expect(model?.regionScopedTraces).toBe(true);
    expect(model?.primaryTraceLabel).toBe("It (pure)");
    expect(model?.companionSpectra).toHaveLength(1);
    expect(model?.companionSpectra[0]?.label).toBe("It (edge)");
    expect(model?.points[0]?.absorption).toBe(500);
    expect(model?.companionSpectra[0]?.points[0]?.absorption).toBe(300);
  });

  it("uses izero only for I0 and excludes izero from It traces", () => {
    const regionSpectra: StxmRegionSpectrumSeries[] = [
      {
        spotLabel: "izero",
        regionId: "izero",
        sampleLo: 0,
        sampleHi: 1,
        energyEv: [280],
        signal: [2000],
        signalErr: [10],
        color: "#888",
        isIzero: true,
      },
      {
        spotLabel: "pure",
        regionId: "pure-id",
        sampleLo: 2,
        sampleHi: 3,
        energyEv: [280],
        signal: [500],
        signalErr: [5],
        color: "#f00",
      },
    ];
    const i0Model = buildStxmSpectrumPlotModel({
      result: sampleResult,
      regionSpectra,
      channel: "signal_i0",
      rawSignalTransform: "signal",
      standards: [],
      bareAtomCurve: null,
      showBareAtomOverlay: false,
      showRegionOverlays: true,
    });
    expect(i0Model?.primaryTraceLabel).toBe("I0 (izero)");
    expect(i0Model?.companionSpectra).toHaveLength(0);
    expect(i0Model?.points[0]?.absorption).toBe(2000);

    const itModel = buildStxmSpectrumPlotModel({
      result: sampleResult,
      regionSpectra,
      channel: "signal_it",
      rawSignalTransform: "signal",
      standards: [],
      bareAtomCurve: null,
      showBareAtomOverlay: false,
      showRegionOverlays: true,
    });
    expect(itModel?.companionSpectra.every((s) => s.label !== "It (izero)")).toBe(
      true,
    );
  });
});
