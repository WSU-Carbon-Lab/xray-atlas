import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";

import {
  formatAtomEditorNotation,
  parseAtomEditorNotation,
  previewAtomEditorNotation,
} from "./parse-atom-editor-notation";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeNull: () => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("parseAtomEditorNotation", () => {
  it("parses common charge suffixes", () => {
    expect(parseAtomEditorNotation("Cu2+")?.symbol).toBe("Cu");
    expect(parseAtomEditorNotation("Cu2+")?.charge).toBe(2);
    expect(parseAtomEditorNotation("Cu+2")?.charge).toBe(2);
    expect(parseAtomEditorNotation("N-")?.charge).toBe(-1);
    expect(parseAtomEditorNotation("N3-")?.charge).toBe(-3);
  });

  it("builds subscript and superscript preview for Cu20+2", () => {
    const parsed = parseAtomEditorNotation("Cu20+2");
    expect(parsed?.symbol).toBe("Cu");
    expect(parsed?.charge).toBe(2);
    expect(parsed?.displayLabel).toBe("Cu₂O²⁺");
  });

  it("formats and round-trips simple ions", () => {
    expect(formatAtomEditorNotation("Cu", 2)).toBe("Cu2+");
    expect(formatAtomEditorNotation("N", -1)).toBe("N-");
  });

  it("previews partial input", () => {
    expect(previewAtomEditorNotation("Cu2+")).toBe("Cu²⁺");
    expect(previewAtomEditorNotation("Cu20+2")).toBe("Cu₂O²⁺");
  });
});
