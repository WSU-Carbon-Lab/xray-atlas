import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  commonEnergyGrid,
  interpolateSpectrumLinear,
  sigmaWithFloor,
} from "./lcf-spectrum-grid";
import {
  fitLcf,
  fitSingleReferenceScale,
  lcfEnergyOverlapRange,
  normalizeLcfInitialWeights,
  previewLcfModel,
  type LcfSpectrum,
} from "./lcf";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeCloseTo: (expected: number, precision?: number) => void;
  toBeGreaterThan: (expected: number) => void;
  toBeLessThan: (expected: number) => void;
  toBeLessThanOrEqual: (expected: number) => void;
  toBeGreaterThanOrEqual: (expected: number) => void;
  toEqual: (expected: unknown) => void;
  toThrow: (pattern?: RegExp | string) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function syntheticCase(): {
  target: LcfSpectrum;
  references: LcfSpectrum[];
  trueFractions: number[];
} {
  const energy = Array.from({ length: 50 }, (_, index) => 280 + index * (10 / 49));
  const refA: LcfSpectrum = {
    energyEv: energy,
    values: energy.map((value) => Math.sin(value * 0.4)),
    sigma: energy.map(() => 0.02),
    label: "a",
  };
  const refB: LcfSpectrum = {
    energyEv: energy,
    values: energy.map((value) => Math.cos(value * 0.35)),
    sigma: energy.map(() => 0.02),
    label: "b",
  };
  const trueFractions = [0.35, 0.65];
  const noise = energy.map((_, index) => {
    const seed = Math.sin(index * 12.9898) * 43758.5453;
    return (seed - Math.floor(seed) - 0.5) * 0.04;
  });
  const values = energy.map(
    (_, index) =>
      trueFractions[0]! * refA.values[index]! +
      trueFractions[1]! * refB.values[index]! +
      noise[index]!,
  );
  const target: LcfSpectrum = {
    energyEv: energy,
    values,
    sigma: energy.map(() => 0.02),
    label: "target",
  };
  return { target, references: [refA, refB], trueFractions };
}

describe("commonEnergyGrid", () => {
  it("returns sorted union inside overlap", () => {
    const grid = commonEnergyGrid([
      [280, 285, 290],
      [282, 287, 292],
    ]);
    expect(grid[0]).toBeGreaterThanOrEqual(282);
    expect(grid[grid.length - 1]!).toBeLessThanOrEqual(290);
    expect(grid).toEqual([...grid].sort((left, right) => left - right));
  });

  it("throws when axes do not overlap", () => {
    expect(() =>
      commonEnergyGrid([
        [280, 285],
        [290, 295],
      ]),
    ).toThrow(/overlap/);
  });
});

describe("interpolateSpectrumLinear", () => {
  it("returns NaN outside source range", () => {
    const values = interpolateSpectrumLinear([280, 290], [0, 1], [275, 295]);
    expect(Number.isNaN(values[0]!)).toBe(true);
    expect(Number.isNaN(values[1]!)).toBe(true);
  });
});

describe("sigmaWithFloor", () => {
  it("replaces non-positive sigma with floor", () => {
    expect(sigmaWithFloor([0, -1, 0.5], 1e-3)).toEqual([1e-3, 1e-3, 0.5]);
  });
});

describe("fitLcf", () => {
  it("recovers fractions under sum-to-one non-negative fit", () => {
    const { target, references, trueFractions } = syntheticCase();
    const result = fitLcf(target, references, {
      nonNegative: true,
      sumToOne: true,
    });
    expect(result.fractions[0]!).toBeCloseTo(trueFractions[0]!, 1);
    expect(result.fractions[1]!).toBeCloseTo(trueFractions[1]!, 1);
    expect(result.fractions.every((value) => value >= -1e-8)).toBe(true);
    expect(result.fractions.reduce((sum, value) => sum + value, 0)).toBeCloseTo(
      1,
      5,
    );
  });

  it("allows non-negative fit without sum constraint", () => {
    const { target, references } = syntheticCase();
    const result = fitLcf(target, references, {
      nonNegative: true,
      sumToOne: false,
    });
    expect(result.fractions.every((value) => value >= -1e-8)).toBe(true);
  });

  it("reports reasonable reduced chi-square", () => {
    const { target, references } = syntheticCase();
    const result = fitLcf(target, references, {
      nonNegative: true,
      sumToOne: true,
    });
    expect(result.reducedChiSquare).toBeGreaterThan(0.2);
    expect(result.reducedChiSquare).toBeLessThan(5);
  });

  it("respects fixed component fractions", () => {
    const { target, references } = syntheticCase();
    const fixedFrac = 0.25;
    const result = fitLcf(target, references, {
      nonNegative: true,
      sumToOne: true,
      initialFractions: [fixedFrac, 0.75],
      fixed: [true, false],
    });
    expect(result.fractions[0]).toBeCloseTo(fixedFrac, 6);
    expect(result.fractions.reduce((sum, value) => sum + value, 0)).toBeCloseTo(
      1,
      5,
    );
  });
});

describe("previewLcfModel", () => {
  it("builds model and target on shared grid", () => {
    const { target, references } = syntheticCase();
    const preview = previewLcfModel(target, references, [0.5, 0.5]);
    expect(preview.energyGrid.length).toBeGreaterThan(0);
    expect(preview.model.length).toBe(preview.energyGrid.length);
    expect(preview.targetOnGrid.length).toBe(preview.energyGrid.length);
  });
});

describe("lcfEnergyOverlapRange", () => {
  it("returns overlap endpoints", () => {
    const { target, references } = syntheticCase();
    const range = lcfEnergyOverlapRange(target, references);
    expect(range != null).toBe(true);
    expect(range![0]).toBeCloseTo(280, 6);
    expect(range![1]).toBeCloseTo(290, 6);
  });
});

describe("fitSingleReferenceScale", () => {
  it("recovers a single non-negative scale factor", () => {
    const { target, references, trueFractions } = syntheticCase();
    const scale = 0.42;
    const scaledTarget: LcfSpectrum = {
      ...target,
      values: target.values.map(
        (_, index) => scale * references[0]!.values[index]!,
      ),
    };
    const result = fitSingleReferenceScale(scaledTarget, references[0]!);
    expect(result.fractions[0]!).toBeCloseTo(scale, 1);
    expect(result.fractions.length).toBe(1);
    expect(result.reducedChiSquare).toBeLessThan(0.05);
    expect(trueFractions.length).toBe(2);
  });
});

describe("normalizeLcfInitialWeights", () => {
  it("normalizes slider weights to sum to one", () => {
    const normalized = normalizeLcfInitialWeights([0.25, 0.75], true);
    expect(normalized[0]!).toBeCloseTo(0.25, 6);
    expect(normalized[1]!).toBeCloseTo(0.75, 6);
    expect(normalized.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 6);
  });

  it("uses equal fractions when sum-to-one weights are all zero", () => {
    const normalized = normalizeLcfInitialWeights([0, 0], true);
    expect(normalized[0]!).toBeCloseTo(0.5, 6);
    expect(normalized[1]!).toBeCloseTo(0.5, 6);
  });
});

describe("fitLcf initialFractions warm-start", () => {
  it("runs constrained fit when slider initial weights are supplied", () => {
    const { target, references, trueFractions } = syntheticCase();
    const result = fitLcf(target, references, {
      nonNegative: true,
      sumToOne: true,
      initialFractions: [0.9, 0.1],
    });
    expect(result.fractions[0]!).toBeCloseTo(trueFractions[0]!, 1);
    expect(result.fractions[1]!).toBeCloseTo(trueFractions[1]!, 1);
    expect(result.fractions.reduce((sum, value) => sum + value, 0)).toBeCloseTo(
      1,
      5,
    );
  });
});
