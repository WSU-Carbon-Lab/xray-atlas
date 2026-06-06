import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import type { SpectrumPoint } from "~/components/plots/types";
import {
  buildDashboardPlotModel,
  expandDatasetTraces,
} from "./build-dashboard-plot-model";

type ExpectAssertions = {
  toHaveLength: (length: number) => void;
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toContain: (expected: string) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function point(
  energy: number,
  absorption: number,
  extras: Partial<SpectrumPoint> = {},
): SpectrumPoint {
  return { energy, absorption, ...extras };
}

describe("expandDatasetTraces", () => {
  it("maps normalized channel and labels single geometry", () => {
    const traces = expandDatasetTraces(
      {
        experimentId: "exp-1",
        label: "Benzene C K",
        chemicalFormula: "C6H6",
        spectrumPoints: [
          point(280, 0.1, { od: 0.1 }),
          point(281, 0.2, { od: 0.2 }),
        ],
      },
      "normalized",
      [],
    );
    expect(traces).toHaveLength(1);
    expect(traces[0]?.label).toBe("Benzene C K");
    expect(traces[0]?.points.map((row) => row.absorption)).toEqual([0.1, 0.2]);
  });

  it("splits traces by theta/phi geometry", () => {
    const traces = expandDatasetTraces(
      {
        experimentId: "exp-1",
        label: "Sample",
        chemicalFormula: null,
        spectrumPoints: [
          point(280, 0.1, { od: 0.1, theta: 55, phi: 0 }),
          point(281, 0.2, { od: 0.2, theta: 20, phi: 0 }),
        ],
      },
      "normalized",
      [],
    );
    expect(traces).toHaveLength(2);
    expect(traces[0]?.label).toContain("Sample");
    expect(traces[1]?.label).toContain("Sample");
  });
});

describe("buildDashboardPlotModel", () => {
  it("returns primary plus companion traces for multiple datasets", () => {
    const model = buildDashboardPlotModel({
      channelId: "normalized",
      selectedGeometryKeys: [],
      datasets: [
        {
          experimentId: "a",
          label: "Dataset A",
          chemicalFormula: null,
          spectrumPoints: [point(280, 0.1, { od: 0.1 })],
        },
        {
          experimentId: "b",
          label: "Dataset B",
          chemicalFormula: null,
          spectrumPoints: [point(280, 0.3, { od: 0.3 })],
        },
      ],
    });
    expect(model.isEmpty).toBe(false);
    expect(model.primaryTraceLabel).toBe("Dataset A");
    expect(model.companionSpectra).toHaveLength(1);
    expect(model.companionSpectra[0]?.label).toBe("Dataset B");
  });

  it("returns empty model when channel data is missing", () => {
    const model = buildDashboardPlotModel({
      channelId: "delta",
      selectedGeometryKeys: [],
      datasets: [
        {
          experimentId: "a",
          label: "Dataset A",
          chemicalFormula: null,
          spectrumPoints: [point(280, 0.1, { od: 0.1 })],
        },
      ],
    });
    expect(model.isEmpty).toBe(true);
    expect(model.points).toHaveLength(0);
  });
});
