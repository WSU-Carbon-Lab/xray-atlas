import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { defaultPlotViewerUrlState } from "./plot-viewer-url-state";
import {
  plotViewerUrlStateToggleDataset,
  plotViewerUrlStateWithDatasets,
} from "./plot-viewer-url-mutations";

type ExpectAssertions = {
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const EXP_A = "11111111-1111-1111-1111-111111111111";
const EXP_B = "22222222-2222-2222-2222-222222222222";

describe("plotViewerUrlStateWithDatasets", () => {
  it("prunes hidden trace keys when datasets shrink", () => {
    const current = {
      ...defaultPlotViewerUrlState(),
      datasets: [EXP_A, EXP_B],
      hiddenTraceIds: [`${EXP_A}:55:0`, `${EXP_B}:20:0`],
    };
    const next = plotViewerUrlStateWithDatasets(current, [EXP_A]);
    expect(next.datasets).toEqual([EXP_A]);
    expect(next.hiddenTraceIds).toEqual([`${EXP_A}:55:0`]);
  });
});

describe("plotViewerUrlStateToggleDataset", () => {
  it("removes a dataset and prunes hidden traces", () => {
    const current = {
      ...defaultPlotViewerUrlState(),
      datasets: [EXP_A, EXP_B],
      hiddenTraceIds: [`${EXP_B}:20:0`],
    };
    const next = plotViewerUrlStateToggleDataset(current, EXP_B);
    expect(next.datasets).toEqual([EXP_A]);
    expect(next.hiddenTraceIds).toEqual([]);
  });
});
