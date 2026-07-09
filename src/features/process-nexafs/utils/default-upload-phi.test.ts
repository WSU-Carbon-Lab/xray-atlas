import {
  describe as bunDescribe,
  it as bunIt,
  expect as bunExpect,
} from "bun:test";
import {
  DEFAULT_UPLOAD_PHI_DEGREES,
  resolveUploadFixedPhi,
  uploadGeometryIsComplete,
} from "./default-upload-phi";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("resolveUploadFixedPhi", () => {
  it("defaults missing phi to zero when no phi column is mapped", () => {
    expect(resolveUploadFixedPhi(undefined, false)).toBe(
      String(DEFAULT_UPLOAD_PHI_DEGREES),
    );
    expect(resolveUploadFixedPhi("", false)).toBe(
      String(DEFAULT_UPLOAD_PHI_DEGREES),
    );
  });

  it("preserves explicit fixed phi when no phi column is mapped", () => {
    expect(resolveUploadFixedPhi("45", false)).toBe("45");
  });

  it("does not inject a default when a phi column is mapped", () => {
    expect(resolveUploadFixedPhi(undefined, true)).toBe(undefined);
  });
});

describe("uploadGeometryIsComplete", () => {
  it("accepts theta column mapping without phi column", () => {
    expect(
      uploadGeometryIsComplete({
        hasThetaColumn: true,
        hasPhiColumn: false,
        fixedTheta: undefined,
        fixedPhi: undefined,
      }),
    ).toBe(true);
  });

  it("requires fixed theta when neither angle column is mapped", () => {
    expect(
      uploadGeometryIsComplete({
        hasThetaColumn: false,
        hasPhiColumn: false,
        fixedTheta: "",
        fixedPhi: "",
      }),
    ).toBe(false);
    expect(
      uploadGeometryIsComplete({
        hasThetaColumn: false,
        hasPhiColumn: false,
        fixedTheta: "55",
        fixedPhi: "",
      }),
    ).toBe(true);
  });
});
