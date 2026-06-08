import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { getValueAtEnergy } from "./utils";
import type { TraceData } from "../types";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function lineTrace(x: number[], y: number[]): TraceData {
  return { type: "scatter", mode: "lines", x, y };
}

describe("getValueAtEnergy", () => {
  it("returns null for non-finite y at exact energy match", () => {
    const trace = lineTrace([280, 281, 282], [0.1, Number.NaN, 0.3]);
    expect(getValueAtEnergy(trace, 281, 0.5)).toBe(null);
  });

  it("returns null when interpolation endpoints are non-finite", () => {
    const trace = lineTrace([280, 281, 282], [0.1, Number.NaN, 0.3]);
    expect(getValueAtEnergy(trace, 280.25, 0.1)).toBe(null);
  });

  it("returns finite interpolated value for valid endpoints", () => {
    const trace = lineTrace([280, 281, 282], [0.1, 0.2, 0.3]);
    expect(getValueAtEnergy(trace, 280.25, 0.1)).toBe(0.125);
  });
});
