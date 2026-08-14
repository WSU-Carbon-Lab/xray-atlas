import {
  describe as bunDescribe,
  it as bunIt,
  expect as bunExpect,
} from "bun:test";
import {
  DEFAULT_UPLOAD_PHI_DEGREES,
  applyDefaultUploadPhiToPoints,
  isStrictFiniteNumberString,
  resolveUploadFixedPhi,
  resolveUploadRowPhi,
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

describe("resolveUploadRowPhi", () => {
  it("defaults blank mapped phi cells to zero", () => {
    expect(resolveUploadRowPhi("", undefined)).toBe(DEFAULT_UPLOAD_PHI_DEGREES);
    expect(resolveUploadRowPhi("   ", undefined)).toBe(
      DEFAULT_UPLOAD_PHI_DEGREES,
    );
    expect(resolveUploadRowPhi(null, undefined)).toBe(
      DEFAULT_UPLOAD_PHI_DEGREES,
    );
    expect(resolveUploadRowPhi(undefined, undefined)).toBe(
      DEFAULT_UPLOAD_PHI_DEGREES,
    );
  });

  it("uses finite numeric phi cells", () => {
    expect(resolveUploadRowPhi("45", undefined)).toBe(45);
    expect(resolveUploadRowPhi(0, undefined)).toBe(0);
    expect(resolveUploadRowPhi(-12.5, undefined)).toBe(-12.5);
  });

  it("prefers fixed phi when the cell is blank", () => {
    expect(resolveUploadRowPhi("", "30")).toBe(30);
    expect(resolveUploadRowPhi(undefined, "15")).toBe(15);
  });

  it("returns null for non-numeric non-blank cells", () => {
    expect(resolveUploadRowPhi("abc", undefined)).toBe(null);
    expect(resolveUploadRowPhi("45deg", "0")).toBe(null);
  });
});

describe("applyDefaultUploadPhiToPoints", () => {
  it("fills missing phi while preserving existing finite phi", () => {
    const points = applyDefaultUploadPhiToPoints(
      [{ theta: 30 }, { theta: 55, phi: 45 }, { theta: 90, phi: Number.NaN }],
      undefined,
    );
    expect(points[0]?.phi).toBe(DEFAULT_UPLOAD_PHI_DEGREES);
    expect(points[1]?.phi).toBe(45);
    expect(points[2]?.phi).toBe(DEFAULT_UPLOAD_PHI_DEGREES);
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

  it("rejects non-numeric fixed theta when neither angle column is mapped", () => {
    expect(
      uploadGeometryIsComplete({
        hasThetaColumn: false,
        hasPhiColumn: false,
        fixedTheta: "abc",
        fixedPhi: "",
      }),
    ).toBe(false);
  });

  it("rejects fixed theta with unit suffixes", () => {
    expect(
      uploadGeometryIsComplete({
        hasThetaColumn: false,
        hasPhiColumn: false,
        fixedTheta: "55deg",
        fixedPhi: "",
      }),
    ).toBe(false);
  });
});

describe("isStrictFiniteNumberString", () => {
  it("accepts plain decimal numerals", () => {
    expect(isStrictFiniteNumberString("55")).toBe(true);
    expect(isStrictFiniteNumberString("-12.5")).toBe(true);
    expect(isStrictFiniteNumberString("  90  ")).toBe(true);
  });

  it("rejects suffixes and non-numeric text", () => {
    expect(isStrictFiniteNumberString("55deg")).toBe(false);
    expect(isStrictFiniteNumberString("abc")).toBe(false);
    expect(isStrictFiniteNumberString("55 deg")).toBe(false);
  });
});
