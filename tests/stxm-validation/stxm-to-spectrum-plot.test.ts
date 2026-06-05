import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { buildStxmSpectrumPlotModel } from "~/features/dashboard/lib/stxm-to-spectrum-plot";
import type { StxmIngestionResult } from "~/features/dashboard/lib/computeStxmIngestion";

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
      yScale: "linear",
      standards: [],
      bareAtomCurve: null,
      showRegionOverlays: false,
    });
    expect(model !== null).toBe(true);
    expect(model?.points).toHaveLength(3);
    expect(model?.points[0]?.absorption).toBe(1000);
    expect(model?.points[0]?.rawabsError).toBe(10);
    expect(model?.yAxisQuantity).toBe("intensity");
  });

  it("applies log10 transform for raw sample channel", () => {
    const model = buildStxmSpectrumPlotModel({
      result: sampleResult,
      regionSpectra: [],
      channel: "signal_sample",
      yScale: "log",
      standards: [],
      bareAtomCurve: null,
      showRegionOverlays: false,
    });
    expect(model?.points[0]?.absorption).toBeCloseTo(Math.log10(500), 8);
  });

  it("enables normalization shading for OD channel", () => {
    const model = buildStxmSpectrumPlotModel({
      result: sampleResult,
      regionSpectra: [],
      channel: "od",
      yScale: "linear",
      standards: [],
      bareAtomCurve: null,
      showRegionOverlays: false,
    });
    expect(model?.showNormalizationShading).toBe(true);
    expect(model?.normalizationRegions?.pre).toEqual([279, 280]);
    expect(model?.yAxisQuantity).toBe("optical-density");
  });
});
