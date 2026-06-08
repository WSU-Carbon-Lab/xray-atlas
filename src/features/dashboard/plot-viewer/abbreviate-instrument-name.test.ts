import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { abbreviateInstrumentName } from "./abbreviate-instrument-name";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("abbreviateInstrumentName", () => {
  it("strips a case-insensitive Beamline prefix", () => {
    expect(abbreviateInstrumentName("Beamline 5.3.2.2")).toBe("5.3.2.2");
    expect(abbreviateInstrumentName("beamline 7.3.3")).toBe("7.3.3");
  });

  it("leaves other instrument names unchanged", () => {
    expect(abbreviateInstrumentName("STXM")).toBe("STXM");
    expect(abbreviateInstrumentName("  ALS SXR  ")).toBe("ALS SXR");
  });
});
