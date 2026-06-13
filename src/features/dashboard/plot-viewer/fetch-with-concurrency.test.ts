import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { fetchWithConcurrency } from "./fetch-with-concurrency";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toBeLessThanOrEqual: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("fetchWithConcurrency", () => {
  it("returns results in input order", async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await fetchWithConcurrency(items, 2, async (value) => {
      await new Promise((resolve) => setTimeout(resolve, (5 - value) * 2));
      return value * 10;
    });
    expect(results).toEqual([10, 20, 30, 40, 50]);
  });

  it("limits concurrent in-flight tasks", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    await fetchWithConcurrency([1, 2, 3, 4, 5, 6], 2, async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return null;
    });
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });

  it("returns empty array for no items", async () => {
    const results = await fetchWithConcurrency([], 3, async () => 1);
    expect(results).toEqual([]);
  });
});
