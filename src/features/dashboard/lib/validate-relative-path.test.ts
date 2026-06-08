import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  isValidRelativePathSegment,
  isValidStxmRelativePath,
} from "./validate-relative-path";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("validate-relative-path", () => {
  it("rejects empty and parent-directory segments", () => {
    expect(isValidRelativePathSegment("")).toBe(false);
    expect(isValidRelativePathSegment(".")).toBe(false);
    expect(isValidRelativePathSegment("..")).toBe(false);
    expect(isValidRelativePathSegment("scan.hdr")).toBe(true);
  });

  it("rejects traversal and malformed relative paths", () => {
    expect(isValidStxmRelativePath("nested/scan.hdr")).toBe(true);
    expect(isValidStxmRelativePath("nested/../scan.hdr")).toBe(false);
    expect(isValidStxmRelativePath("/absolute.hdr")).toBe(false);
    expect(isValidStxmRelativePath("trailing/")).toBe(false);
  });
});
