import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  filterPlotViewerTracesByHiddenIds,
  isPlotViewerTraceHidden,
  parsePlotViewerHiddenTraceIds,
  prunePlotViewerHiddenTraceIdsForDatasets,
  togglePlotViewerHiddenTraceId,
} from "./plot-viewer-hidden-traces";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("togglePlotViewerHiddenTraceId", () => {
  it("adds and removes trace keys idempotently", () => {
    expect(togglePlotViewerHiddenTraceId([], "a:55:0")).toEqual(["a:55:0"]);
    expect(togglePlotViewerHiddenTraceId(["a:55:0"], "a:55:0")).toEqual([]);
    expect(
      togglePlotViewerHiddenTraceId(["a:55:0"], "b:20:0"),
    ).toEqual(["a:55:0", "b:20:0"]);
  });
});

describe("isPlotViewerTraceHidden", () => {
  it("reports membership in hidden list", () => {
    expect(isPlotViewerTraceHidden(["a:55:0"], "a:55:0")).toBe(true);
    expect(isPlotViewerTraceHidden(["a:55:0"], "b:20:0")).toBe(false);
  });
});

describe("parsePlotViewerHiddenTraceIds", () => {
  it("parses comma-separated hidden trace keys", () => {
    expect(
      parsePlotViewerHiddenTraceIds(
        new URLSearchParams("hidden=a:55:0,b:20:0"),
      ),
    ).toEqual(["a:55:0", "b:20:0"]);
    expect(parsePlotViewerHiddenTraceIds(new URLSearchParams())).toEqual([]);
  });
});

describe("prunePlotViewerHiddenTraceIdsForDatasets", () => {
  it("drops hidden keys for experiments no longer selected", () => {
    expect(
      prunePlotViewerHiddenTraceIdsForDatasets(
        ["11111111-1111-1111-1111-111111111111:55:0", "22222222-2222-2222-2222-222222222222:20:0"],
        ["11111111-1111-1111-1111-111111111111"],
      ),
    ).toEqual(["11111111-1111-1111-1111-111111111111:55:0"]);
  });
});

describe("filterPlotViewerTracesByHiddenIds", () => {
  it("filters visible traces and keeps at least one trace when all are hidden", () => {
    const traces = [
      { traceKey: "a:55:0" },
      { traceKey: "b:20:0" },
    ];
    expect(
      filterPlotViewerTracesByHiddenIds(traces, ["a:55:0"]),
    ).toEqual([{ traceKey: "b:20:0" }]);
    expect(
      filterPlotViewerTracesByHiddenIds(traces, ["a:55:0", "b:20:0"]),
    ).toEqual(traces);
  });
});
