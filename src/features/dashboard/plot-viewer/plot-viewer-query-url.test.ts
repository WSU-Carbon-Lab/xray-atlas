import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  createDebouncedStringScheduler,
  plotViewerStateForUrlWrite,
} from "./plot-viewer-query-url";
import { defaultPlotViewerUrlState } from "./plot-viewer-url-state";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("plot-viewer-query-url", () => {
  it("writes debounced query text into URL state", () => {
    const state = {
      ...defaultPlotViewerUrlState(),
      query: "stale",
      datasets: ["11111111-1111-1111-1111-111111111111"],
    };
    const merged = plotViewerStateForUrlWrite(state, "  benzene  ");
    expect(merged.query).toBe("benzene");
    expect(merged.datasets).toEqual(state.datasets);
  });

  it("debounces string updates and supports flush", async () => {
    const values: string[] = [];
    const scheduler = createDebouncedStringScheduler(40, (value) => {
      values.push(value);
    });

    scheduler.schedule("  alpha  ");
    scheduler.schedule("beta");
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(values).toEqual(["beta"]);

    scheduler.schedule("pending");
    scheduler.flush("  gamma  ");
    expect(values).toEqual(["beta", "gamma"]);

    scheduler.cancel();
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(values).toEqual(["beta", "gamma"]);
  });
});
