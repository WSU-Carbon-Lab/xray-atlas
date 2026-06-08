import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { buildResidualSubplotYDomain } from "./useResidualSubplotLayout";
import type { SpectrumPoint } from "../types";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeLessThan: (expected: number) => void;
  toBeGreaterThan: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("buildResidualSubplotYDomain", () => {
  it("includes zero for one-sided positive residuals", () => {
    const points: SpectrumPoint[] = [
      { energy: 280, absorption: 0.001 },
      { energy: 281, absorption: 0.003 },
      { energy: 282, absorption: 0.002 },
    ];
    const [lo, hi] = buildResidualSubplotYDomain(points);
    expect(lo).toBe(0);
    expect(hi).toBeGreaterThan(0.003);
  });

  it("ignores non-finite residual samples", () => {
    const points: SpectrumPoint[] = [
      { energy: 280, absorption: -0.01 },
      { energy: 281, absorption: Number.NaN },
      { energy: 282, absorption: 0.01 },
    ];
    const [lo, hi] = buildResidualSubplotYDomain(points);
    expect(lo).toBeLessThan(-0.01);
    expect(hi).toBeGreaterThan(0.01);
  });

  it("falls back to a zero-centered domain when all samples are non-finite", () => {
    const [lo, hi] = buildResidualSubplotYDomain([
      { energy: 280, absorption: Number.NaN },
    ]);
    expect(lo).toBeLessThan(0);
    expect(hi).toBeGreaterThan(0);
  });
});
