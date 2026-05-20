import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";

import { buildBareAtomReferenceCurve } from "./buildBareAtomReferenceCurve";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("buildBareAtomReferenceCurve", () => {
  const bareMu = [280, 285, 290, 295, 300, 305].map((energy) => ({
    energy,
    absorption: 0.01 + energy * 1e-5,
  }));

  const bareDelta = [281, 289, 297, 303].map((energy) => ({
    energy,
    absorption: 1e-4 * energy,
  }));

  it("returns absorption reference on bare mu grid", () => {
    const curve = buildBareAtomReferenceCurve({
      bareMu,
      dataView: "absorption",
      label: "Bare atom absorption",
    });
    if (!curve) {
      throw new Error("expected absorption reference curve");
    }
    expect(curve.points.length).toBe(bareMu.length);
    expect(curve.label).toBe("Bare atom absorption");
  });

  it("returns delta reference from precomputed Henke/CXRO delta samples", () => {
    const curve = buildBareAtomReferenceCurve({
      bareDelta,
      dataView: "delta",
      label: "Bare atom delta",
    });
    if (!curve) {
      throw new Error("expected delta reference curve");
    }
    const energies = curve.points.map((p) => p.energy);
    expect(energies).toEqual(bareDelta.map((p) => p.energy));
    const allFinite = curve.points.every((p) => Number.isFinite(p.absorption));
    expect(allFinite).toBe(true);
  });
});
