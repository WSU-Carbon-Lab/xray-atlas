import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { inferStxmEdgeFromEnergyRange } from "~/lib/stxm/infer-edge-from-energy";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("inferStxmEdgeFromEnergyRange", () => {
  it("detects carbon K from typical line scan range", () => {
    const edge = inferStxmEdgeFromEnergyRange(280, 310);
    expect(edge?.label).toBe("C K");
  });

  it("returns null when energy is missing", () => {
    expect(inferStxmEdgeFromEnergyRange(null, 300)).toBe(null);
  });
});
