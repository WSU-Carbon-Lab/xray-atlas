import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";

import {
  bareAtomOverlaySupportedForChannel,
  bareAtomReferencesForOverlay,
  type BareAtomRepresentationMatrix,
} from "./bare-atom-representation-matrix";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const sampleMatrix: BareAtomRepresentationMatrix = {
  formula: "C8H8",
  channels: {
    "mass-absorption": [
      { energy: 280, absorption: 0.1 },
      { energy: 290, absorption: 0.2 },
    ],
    beta: [
      { energy: 280, absorption: 0.01 },
      { energy: 290, absorption: 0.02 },
    ],
    delta: [
      { energy: 280, absorption: 0.001 },
      { energy: 290, absorption: 0.002 },
    ],
  },
};

describe("bareAtomOverlaySupportedForChannel", () => {
  it("allows mass absorption and optical-constant channels", () => {
    expect(bareAtomOverlaySupportedForChannel("mass-absorption")).toBe(true);
    expect(bareAtomOverlaySupportedForChannel("beta")).toBe(true);
    expect(bareAtomOverlaySupportedForChannel("delta")).toBe(true);
  });

  it("disallows raw and normalized spectroscopy channels", () => {
    expect(bareAtomOverlaySupportedForChannel("raw")).toBe(false);
    expect(bareAtomOverlaySupportedForChannel("normalized")).toBe(false);
  });
});

describe("bareAtomReferencesForOverlay", () => {
  it("returns a single solid mu reference when link is off", () => {
    const refs = bareAtomReferencesForOverlay(
      sampleMatrix,
      "mass-absorption",
      false,
    );
    expect(refs.length).toBe(1);
    expect(refs[0]?.lineDash).toBe("solid");
    expect(refs[0]?.label).toBe("Bare atom μ");
  });
});
