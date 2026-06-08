import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import type { SpectrumPoint } from "~/components/plots/types";
import {
  geometryKeySetsEqual,
  geometryKeysForPoints,
  mergeGeometryKeysOnDatasetAdd,
  pruneGeometryKeysOnDatasetRemove,
  reconcileGeometryKeysAfterSpectraLoad,
} from "./geometry-selection";

type ExpectAssertions = {
  toEqual: (expected: unknown) => void;
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function point(
  energy: number,
  absorption: number,
  extras: Partial<SpectrumPoint> = {},
): SpectrumPoint {
  return { energy, absorption, ...extras };
}

describe("mergeGeometryKeysOnDatasetAdd", () => {
  it("seeds all keys when the current selection is empty", () => {
    expect(
      mergeGeometryKeysOnDatasetAdd([], ["55:0", "20:0"]),
    ).toEqual(["55:0", "20:0"]);
  });

  it("unions keys without dropping existing selections", () => {
    expect(
      mergeGeometryKeysOnDatasetAdd(["55:0"], ["20:0", "55:0"]),
    ).toEqual(["55:0", "20:0"]);
  });
});

describe("pruneGeometryKeysOnDatasetRemove", () => {
  it("removes keys that belonged only to the removed dataset", () => {
    const remaining = new Set(["55:0"]);
    expect(
      pruneGeometryKeysOnDatasetRemove(
        ["55:0", "20:0"],
        ["20:0"],
        remaining,
      ),
    ).toEqual(["55:0"]);
  });

  it("keeps unrelated keys when another dataset still needs them", () => {
    const remaining = new Set(["55:0", "20:0"]);
    expect(
      pruneGeometryKeysOnDatasetRemove(
        ["55:0", "20:0", "30:0"],
        ["30:0"],
        remaining,
      ),
    ).toEqual(["55:0", "20:0"]);
  });
});

describe("reconcileGeometryKeysAfterSpectraLoad", () => {
  it("auto-selects all geometries for a newly added dataset", () => {
    const spectra = new Map<string, SpectrumPoint[]>([
      [
        "exp-a",
        [
          point(280, 0.1, { od: 0.1, theta: 55, phi: 0 }),
          point(281, 0.2, { od: 0.2, theta: 20, phi: 0 }),
        ],
      ],
    ]);
    expect(
      reconcileGeometryKeysAfterSpectraLoad(["exp-a"], [], spectra),
    ).toEqual(["20:0", "55:0"]);
  });

  it("prunes stale geometry keys after datasets change", () => {
    const spectra = new Map<string, SpectrumPoint[]>([
      [
        "exp-a",
        [point(280, 0.1, { od: 0.1, theta: 55, phi: 0 })],
      ],
    ]);
    expect(
      reconcileGeometryKeysAfterSpectraLoad(
        ["exp-a"],
        ["55:0", "99:0"],
        spectra,
      ),
    ).toEqual(["55:0"]);
  });

  it("does not override a narrowed geometry selection", () => {
    const spectra = new Map<string, SpectrumPoint[]>([
      [
        "exp-a",
        [
          point(280, 0.1, { od: 0.1, theta: 55, phi: 0 }),
          point(281, 0.2, { od: 0.2, theta: 20, phi: 0 }),
        ],
      ],
    ]);
    expect(
      reconcileGeometryKeysAfterSpectraLoad(["exp-a"], ["55:0"], spectra),
    ).toEqual(["55:0"]);
  });
});

describe("geometryKeysForPoints", () => {
  it("collects theta/phi keys from spectrum rows", () => {
    expect(
      geometryKeysForPoints([
        point(280, 0.1, { theta: 55, phi: 0 }),
        point(281, 0.2, { theta: 20, phi: 0 }),
      ]),
    ).toEqual(["20:0", "55:0"]);
  });
});

describe("geometryKeySetsEqual", () => {
  it("compares key sets regardless of order", () => {
    expect(geometryKeySetsEqual(["55:0", "20:0"], ["20:0", "55:0"])).toBe(true);
    expect(geometryKeySetsEqual(["55:0"], ["55:0", "20:0"])).toBe(false);
  });
});
