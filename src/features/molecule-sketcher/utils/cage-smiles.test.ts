import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { Molecule } from "openchemlib";

import {
  cageSmilesForCarbonCount,
  parseCageCarbonCountFromInput,
  SUPPORTED_CAGE_CARBON_COUNTS,
} from "./cage-smiles";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toContain: (expected: string) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function heavyCarbonCount(smiles: string): number {
  const mol = Molecule.fromSmiles(smiles);
  let count = 0;
  for (let i = 0; i < mol.getAllAtoms(); i++) {
    if (mol.getAtomicNo(i) === 6) {
      count += 1;
    }
  }
  return count;
}

describe("cage-smiles", () => {
  it("maps known carbon counts to parseable fullerene SMILES", () => {
    const expectedLabels: Record<number, string> = {
      60: "C60",
      70: "C70",
    };

    for (const carbonCount of SUPPORTED_CAGE_CARBON_COUNTS) {
      const result = cageSmilesForCarbonCount(carbonCount);
      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }
      expect(result.label).toEqual(expectedLabels[carbonCount]);
      expect(heavyCarbonCount(result.smiles)).toBe(carbonCount);
    }
  });

  it("rejects unsupported carbon counts with supported list", () => {
    const result = cageSmilesForCarbonCount(68);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toContain("68");
    expect(result.error).toContain("60");
    expect(result.error).toContain("70");
  });

  it("rejects non-integer carbon counts", () => {
    const result = cageSmilesForCarbonCount(60.5);
    expect(result.ok).toBe(false);
  });

  it("parses positive integer input for custom fullerene placement", () => {
    expect(parseCageCarbonCountFromInput("70")).toBe(70);
    expect(parseCageCarbonCountFromInput(" 60 ")).toBe(60);
    expect(parseCageCarbonCountFromInput("")).toBe(null);
    expect(parseCageCarbonCountFromInput("fullerene")).toBe(null);
    expect(parseCageCarbonCountFromInput("0")).toBe(null);
  });
});
