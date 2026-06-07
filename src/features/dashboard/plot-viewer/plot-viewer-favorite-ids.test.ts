import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { orderBrowseGroupsByExperimentIds } from "./plot-viewer-favorite-ids";

type ExpectAssertions = {
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("orderBrowseGroupsByExperimentIds", () => {
  it("preserves experiment id order and skips missing groups", () => {
    const groups = [
      { experimentId: "a", label: "A" },
      { experimentId: "c", label: "C" },
    ];
    expect(
      orderBrowseGroupsByExperimentIds(groups, ["c", "missing", "a"]),
    ).toEqual([
      { experimentId: "c", label: "C" },
      { experimentId: "a", label: "A" },
    ]);
  });
});
