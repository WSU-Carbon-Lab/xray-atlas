import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";

import { extendImaginaryAsfWithHenkeTails } from "./kkcalc-bare-asf-extension";
import { parseChemicalFormula } from "./kkcalc-stoichiometry";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeGreaterThan: (expected: number) => void;
  toBeGreaterThanOrEqual: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("extendImaginaryAsfWithHenkeTails", () => {
  it("does not throw when merge makima endpoints are degenerate: retries full span then additive anchor", () => {
    const composition = parseChemicalFormula("C72H14O2");
    const n = 24;
    const measuredEnergyEv = Array.from({ length: n }, (_, i) => 280 + i * 2);
    const measuredImaginaryAsf = measuredEnergyEv.map(() => 1e-6);
    const out = extendImaginaryAsfWithHenkeTails({
      measuredEnergyEv,
      measuredImaginaryAsf,
      composition,
      mergeDomain: [292, 294],
    });
    expect(out.energiesEv.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < out.energiesEv.length; i++) {
      expect(out.energiesEv[i]!).toBeGreaterThan(out.energiesEv[i - 1]!);
    }
    expect(out.f2.length).toBe(out.energiesEv.length);
  });

  it("uses affine scaling when merge endpoints differ after makima", () => {
    const composition = parseChemicalFormula("C72H14O2");
    const measuredEnergyEv = [280, 290, 300, 310, 320, 330];
    const measuredImaginaryAsf = [1e-6, 2e-6, 3e-6, 3.5e-6, 4e-6, 4.2e-6];
    const out = extendImaginaryAsfWithHenkeTails({
      measuredEnergyEv,
      measuredImaginaryAsf,
      composition,
      mergeDomain: [280, 330],
    });
    expect(out.energiesEv.length).toBeGreaterThanOrEqual(4);
  });

  it("does not produce non-finite f2 when merge lo lies below the first measurement knot", () => {
    const composition = parseChemicalFormula("C72H14O2");
    const measuredEnergyEv = Array.from({ length: 24 }, (_, i) => 270.4 + i * 2);
    const measuredImaginaryAsf = measuredEnergyEv.map(() => 1e-6);
    const out = extendImaginaryAsfWithHenkeTails({
      measuredEnergyEv,
      measuredImaginaryAsf,
      composition,
      mergeDomain: [270, 295],
    });
    expect(out.f2.every((v) => Number.isFinite(v))).toBe(true);
  });
});
