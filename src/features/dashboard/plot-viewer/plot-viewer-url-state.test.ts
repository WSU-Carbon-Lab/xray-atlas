import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  defaultPlotViewerUrlState,
  readPlotViewerParams,
  writePlotViewerParams,
} from "./plot-viewer-url-state";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("plot-viewer-url-state", () => {
  it("round-trips datasets, channel, facets, and geometry keys", () => {
    const initial = defaultPlotViewerUrlState();
    const state = {
      ...initial,
      query: "benzene",
      datasets: [
        "11111111-1111-1111-1111-111111111111",
        "22222222-2222-2222-2222-222222222222",
      ],
      channel: "beta" as const,
      facets: {
        edge: ["edge-1"],
        mol: ["mol-1"],
        instrument: ["inst-1"],
        facility: ["ALS"],
      },
      geometryKeys: ["55:0", "fixed"],
    };
    const params = new URLSearchParams();
    writePlotViewerParams(params, state);
    const parsed = readPlotViewerParams(params);
    expect(parsed.query).toBe("benzene");
    expect(parsed.datasets).toEqual(state.datasets);
    expect(parsed.channel).toBe("beta");
    expect(parsed.facets).toEqual(state.facets);
    expect(parsed.geometryKeys).toEqual(state.geometryKeys);
  });

  it("defaults channel to normalized when absent or invalid", () => {
    expect(readPlotViewerParams(new URLSearchParams()).channel).toBe(
      "normalized",
    );
    expect(
      readPlotViewerParams(new URLSearchParams("channel=unknown")).channel,
    ).toBe("normalized");
  });
});
