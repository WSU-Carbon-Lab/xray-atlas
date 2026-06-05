import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";

type ExpectAssertions = {
  toEqual: (expected: unknown) => void;
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

type StandardPointRow = {
  energyev: number;
  od: number | null;
  massabsorption: number | null;
  rawabs: number | null;
};

function shapeStandardOverlay(points: StandardPointRow[]): {
  energyEv: number[];
  values: number[];
} {
  const byEnergy = new Map<number, number>();
  for (const point of points) {
    const value = point.od ?? point.massabsorption ?? point.rawabs;
    if (Number.isFinite(point.energyev) && value !== null && Number.isFinite(value)) {
      byEnergy.set(point.energyev, value);
    }
  }
  const energyEv = [...byEnergy.keys()].sort((a, b) => a - b);
  return {
    energyEv,
    values: energyEv.map((energy) => byEnergy.get(energy) ?? 0),
  };
}

describe("shapeStandardOverlay", () => {
  it("prefers OD then falls back to mass absorption", () => {
    const shaped = shapeStandardOverlay([
      { energyev: 285, od: 0.2, massabsorption: 1, rawabs: 2 },
      { energyev: 290, od: null, massabsorption: 0.5, rawabs: 3 },
    ]);
    expect(shaped.energyEv).toEqual([285, 290]);
    expect(shaped.values[0]).toBe(0.2);
    expect(shaped.values[1]).toBe(0.5);
  });
});
