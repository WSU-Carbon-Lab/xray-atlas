import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  fitBareAtomBackground,
  massAbsorptionFromOdFit,
  odToBeta,
} from "~/lib/stxm/absorption";
import {
  normalizeNexafsOd,
  preEdgeSubtract,
  postEdgeNormalize,
  suggestNormalizationWindows,
} from "~/lib/stxm/normalization";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeCloseTo: (expected: number, precision?: number) => void;
  toBeGreaterThan: (expected: number) => void;
  toBeLessThan: (expected: number) => void;
  not: ExpectAssertions;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("stxm normalization", () => {
  it("preEdgeSubtract removes pre-edge mean", () => {
    const energyEv = new Float64Array([280, 285, 290, 295, 300]);
    const od = new Float64Array([0.5, 0.5, 1, 1.5, 2]);
    const out = preEdgeSubtract(energyEv, od, 280, 285);
    expect(out[0]).toBeCloseTo(0, 5);
    expect(out[1]).toBeCloseTo(0, 5);
    expect(out[4]).toBeCloseTo(1.5, 5);
  });

  it("postEdgeNormalize scales post-edge mean to target", () => {
    const energyEv = new Float64Array([280, 285, 290, 295, 300]);
    const od = new Float64Array([0, 0, 0.5, 1, 1]);
    const { od: scaled, scale } = postEdgeNormalize(energyEv, od, 295, 300, 1);
    expect(scale).toBeCloseTo(1, 5);
    expect(scaled[3]).toBeCloseTo(1, 5);
    expect(scaled[4]).toBeCloseTo(1, 5);
  });

  it("normalizeNexafsOd combines pre and post steps", () => {
    const energyEv = new Float64Array([280, 285, 290, 295, 300]);
    const od = new Float64Array([0.2, 0.2, 0.6, 1.2, 1.2]);
    const { odNormalized } = normalizeNexafsOd(energyEv, od, {
      preLo: 280,
      preHi: 285,
      postLo: 295,
      postHi: 300,
    });
    expect(odNormalized[0]).toBeCloseTo(0, 5);
    expect(odNormalized[4]).toBeCloseTo(1, 5);
  });

  it("suggestNormalizationWindows spans energy range", () => {
    const energyEv = new Float64Array([280, 290, 300]);
    const windows = suggestNormalizationWindows(energyEv);
    expect(windows.preLo).toBe(280);
    expect(windows.postHi).toBe(300);
    expect(windows.preHi).toBeGreaterThan(windows.preLo);
    expect(windows.postLo).toBeLessThan(windows.postHi);
  });
});

describe("stxm absorption", () => {
  it("odToBeta scales with thickness and energy", () => {
    const energyEv = new Float64Array([300]);
    const od = new Float64Array([1]);
    const beta = odToBeta(energyEv, od, 1e-4);
    expect(beta[0]).toBeGreaterThan(0);
  });

  it("fitBareAtomBackground scale-only fit", () => {
    const energyEv = new Float64Array([280, 285, 290, 295, 300]);
    const od = new Float64Array([2, 2, 3, 4, 4]);
    const mu = new Float64Array([1, 1, 1, 1, 1]);
    const fit = fitBareAtomBackground(energyEv, od, mu, {
      nEdge: 2,
      includeOffset: false,
    });
    expect(fit.scale).toBeCloseTo(3, 5);
    expect(fit.offset).toBe(0);
  });

  it("fitBareAtomBackground uses normalization windows not scan endpoints", () => {
    const energyEv = new Float64Array([
      270, 275, 280, 285, 290, 295, 300, 305, 310, 315, 320, 325, 330, 335,
      340, 345, 350,
    ]);
    const mu = Float64Array.from(energyEv, (energy) => 0.01 * energy);
    const trueScale = 2.5;
    const trueOffset = 0.15;
    const od = Float64Array.from(energyEv, (energy, index) => {
      if (energy >= 320 && energy <= 340) {
        return trueScale * (mu[index] ?? 0) + trueOffset;
      }
      return 12;
    });
    const endpointFit = fitBareAtomBackground(energyEv, od, mu, { nEdge: 5 });
    const windowFit = fitBareAtomBackground(energyEv, od, mu, {
      windows: {
        preLo: 320,
        preHi: 340,
        postLo: 320,
        postHi: 340,
      },
    });
    const endpointMass = massAbsorptionFromOdFit(
      od,
      new Float64Array(od.length),
      endpointFit,
    );
    const windowMass = massAbsorptionFromOdFit(
      od,
      new Float64Array(od.length),
      windowFit,
    );
    const windowIndex = 12;
    expect(endpointMass.massAbsorption[windowIndex]).not.toBeCloseTo(
      mu[windowIndex] ?? 0,
      1,
    );
    expect(windowMass.massAbsorption[windowIndex]).toBeCloseTo(
      mu[windowIndex] ?? 0,
      4,
    );
    expect(windowFit.scale).toBeCloseTo(trueScale, 4);
    expect(windowFit.offset).toBeCloseTo(trueOffset, 4);
  });
});
