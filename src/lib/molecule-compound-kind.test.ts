import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";

import {
  MOLECULE_COMPOUND_KINDS,
  parseMoleculeCompoundKind,
} from "./molecule-compound-kind";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeNull: () => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("parseMoleculeCompoundKind", () => {
  it("accepts registry compound kind ids", () => {
    for (const kind of MOLECULE_COMPOUND_KINDS) {
      expect(parseMoleculeCompoundKind(kind)).toBe(kind);
    }
  });

  it("rejects React Aria auto keys", () => {
    expect(parseMoleculeCompoundKind("react-aria-1")).toBeNull();
  });
});
