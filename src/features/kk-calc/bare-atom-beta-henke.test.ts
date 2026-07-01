import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";

import { bareAtomBetaFromHenkeCompoundF2, henkeCompoundF2AtEv } from "./kkcalc-henke-f2";
import { imaginaryAsfToOpticalBeta, numberDensityFromMassDensity } from "./kkcalc-conversions";
import {
  formulaMassFromComposition,
  parseChemicalFormula,
} from "./kkcalc-stoichiometry";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeLessThanOrEqual: (expected: number) => void;
  toBeGreaterThan: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("bareAtomBetaFromHenkeCompoundF2", () => {
  it("matches tabulated f2-to-beta at a K-edge energy (rtol=1e-9)", () => {
    const composition = parseChemicalFormula("C72H14O2");
    const energyEv = [284.5];
    const nd = numberDensityFromMassDensity(
      1,
      formulaMassFromComposition(composition),
    );
    const f2 = henkeCompoundF2AtEv(composition, energyEv[0]!);
    const betaDirect = imaginaryAsfToOpticalBeta(energyEv, [f2], nd)[0]!;
    const beta = bareAtomBetaFromHenkeCompoundF2(composition, energyEv, 1)[0]!;
    const tol = 1e-9 * (1 + Math.abs(betaDirect));
    expect(Math.abs(beta - betaDirect)).toBeLessThanOrEqual(tol);
  });

  it("returns finite positive beta across a short pre-edge to post-edge grid", () => {
    const composition = parseChemicalFormula("C72H14O2");
    const targetEnergyEv = [280, 284.5, 290, 300, 310];
    const beta = bareAtomBetaFromHenkeCompoundF2(composition, targetEnergyEv, 1);
    for (const b of beta) {
      expect(Number.isFinite(b)).toBe(true);
      expect(b).toBeGreaterThan(0);
    }
  });
});
